import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocFromServer,
  getDocsFromServer,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  SKILL_SCORE,
  normalizeNameKey,
  type Court,
  type Match,
  type NextUp,
  type Player,
  type Profile,
  type Session,
  type Skill,
} from "./types";
import { balanceTeams, shuffle } from "./matchmaking";
import { planFairMatch, stablePlayerIdentity } from "./fairmatch";

// ---- Firestore paths -------------------------------------------------------
// A single active session lives at sessions/current, with players and courts
// as subcollections. Ending a session wipes both subcollections.
const SESSION_ID = "current";
const sessionRef = doc(db, "sessions", SESSION_ID);
const playersCol = collection(db, "sessions", SESSION_ID, "players");
const courtsCol = collection(db, "sessions", SESSION_ID, "courts");
const matchesCol = collection(db, "sessions", SESSION_ID, "matches");
const playerRef = (id: string) => doc(db, "sessions", SESSION_ID, "players", id);
const courtRef = (id: string) => doc(db, "sessions", SESSION_ID, "courts", id);

// The permanent roster lives at the TOP level (profiles/{id}), NOT under the
// session, so it is never touched by deleteAll()/startSession()/endSession().
const profilesCol = collection(db, "profiles");
const profileRef = (id: string) => doc(db, "profiles", id);

const courtId = (index: number) => `court-${index}`;

// ---- Subscriptions ---------------------------------------------------------

export function subscribeSession(
  cb: (session: Session | null) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    sessionRef,
    (snap) => cb(snap.exists() ? (snap.data() as Session) : null),
    (e) => onError?.(e),
  );
}

const VALID_SKILLS = new Set<Skill>(["NB", "BG-", "BG", "N"]);

/**
 * Normalise a stored skill label to the current NB/BG-/BG/N scheme.
 *
 * `score` is authoritative and never rewritten here, so a normalised label stays
 * consistent with the score the doc was saved with, and every matchmaking path —
 * which reads `score`, not the label — is unaffected.
 *
 * Current-scheme labels pass straight through: existing "BG"/"N" are deliberately
 * NOT migrated (business decision), so their badge is unchanged and their score
 * only shifts to the new SKILL_SCORE when they are next re-added from a Profile.
 *
 * Only genuinely legacy/foreign labels are remapped, disambiguated by their stored
 * score:
 *   - "BG+"  → "BG-"  (an ancient score-2 tier)
 *   - "BG"   → "NB" when its score is ≤1 (an ancient beginner mislabel); otherwise
 *              it is a current "BG" and is kept as-is.
 * Anything unknown or removed (e.g. a stray "S") falls back to "NB", the LOWEST
 * tier — never "N", so a data anomaly can never be auto-promoted to the new
 * strongest tier. In practice startSession() wipes all players, so this only
 * matters for a session already in progress across the deploy.
 */
function normalizeSkill(skill: string, score: number): Skill {
  if (skill === "BG+") return "BG-"; // ancient score-2 tier → new score-2 label
  if (skill === "BG") return score <= 1 ? "NB" : "BG"; // ancient beginner vs current BG (kept)
  return VALID_SKILLS.has(skill as Skill) ? (skill as Skill) : "NB";
}

export function subscribePlayers(
  cb: (players: Player[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(playersCol, orderBy("queuedAt", "asc"));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data() as Omit<Player, "id">;
          return { id: d.id, ...data, skill: normalizeSkill(data.skill, data.score) };
        }),
      ),
    (e) => onError?.(e),
  );
}

export function subscribeCourts(
  cb: (courts: Court[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(courtsCol, orderBy("index", "asc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Court, "id">) }))),
    (e) => onError?.(e),
  );
}

export function subscribeMatches(
  cb: (matches: Match[], serverReady: boolean) => void,
  onError?: (e: Error) => void,
) {
  const q = query(matchesCol, orderBy("finishedAt", "asc"));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => cb(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, "id">) })),
      !snap.metadata.fromCache && !snap.metadata.hasPendingWrites,
    ),
    (e) => onError?.(e),
  );
}

/**
 * Live roster of permanent Profiles. No orderBy here — the roster is small and
 * the "most-frequent first" order (visitCount, then lastJoinedAt) is applied
 * client-side, which avoids needing a composite Firestore index.
 */
export function subscribeProfiles(
  cb: (profiles: Profile[]) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    profilesCol,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Profile, "id">) }))),
    (e) => onError?.(e),
  );
}

// ---- Helpers ---------------------------------------------------------------

async function deleteAll(batch: ReturnType<typeof writeBatch>): Promise<void> {
  const [playersSnap, courtsSnap, matchesSnap] = await Promise.all([
    getDocs(playersCol),
    getDocs(courtsCol),
    getDocs(matchesCol),
  ]);
  // Firestore batches cap at 500 ops; our data is tiny (~21 players + 3 courts
  // + a session's worth of finished games).
  playersSnap.forEach((d) => batch.delete(d.ref));
  courtsSnap.forEach((d) => batch.delete(d.ref));
  matchesSnap.forEach((d) => batch.delete(d.ref));
  // Commit with the session identity/revision and new courts: Fair must never
  // see an active session with half-cleared history.
}

// ---- Session ---------------------------------------------------------------

export async function startSession(courtCount: number): Promise<void> {
  const batch = writeBatch(db);
  await deleteAll(batch); // fresh start — clear any leftovers
  const session: Session = {
    active: true,
    courtCount,
    createdAt: Date.now(),
  };
  batch.set(sessionRef, { ...session, fairRevision: increment(1) });
  for (let i = 1; i <= courtCount; i++) {
    batch.set(courtRef(courtId(i)), {
      index: i,
      teamA: [],
      teamB: [],
      startedAt: null,
    } satisfies Omit<Court, "id">);
  }
  await batch.commit();
}

export async function endSession(): Promise<void> {
  const batch = writeBatch(db);
  await deleteAll(batch);
  const session: Session = { active: false, courtCount: 0, createdAt: Date.now() };
  batch.set(sessionRef, { ...session, fairRevision: increment(1) });
  await batch.commit();
}

// ---- Players ---------------------------------------------------------------

/**
 * Add a BRAND-NEW player (a name not already in the roster) to the queue and
 * register them permanently at the same time. Duplicate-name detection happens
 * in the UI before this is called (see addPlayerFromProfile for the "add an
 * existing regular" path). Creates the Profile (visitCount = 1) and the session
 * Player (linked via profileId) atomically.
 */
export async function addPlayer(name: string, skill: Skill, sessionCreatedAt: number): Promise<void> {
  const now = Date.now();
  const trimmed = name.trim();
  const pRef = doc(profilesCol);
  const spRef = doc(playersCol);
  const batch = writeBatch(db);
  batch.set(pRef, {
    name: trimmed,
    nameKey: normalizeNameKey(trimmed),
    skill,
    visitCount: 1,
    lastCountedSession: sessionCreatedAt,
    lastJoinedAt: now,
    createdAt: now,
  } satisfies Omit<Profile, "id">);
  batch.set(spRef, {
    name: trimmed,
    skill,
    score: SKILL_SCORE[skill],
    status: "waiting",
    courtId: null,
    gamesPlayed: 0,
    createdAt: now,
    queuedAt: now,
    profileId: pRef.id,
  } satisfies Omit<Player, "id">);
  // Fair reads collection membership outside its transaction; this detects new IDs.
  batch.update(sessionRef, { fairRevision: increment(1) });
  await batch.commit();
}

// ---- Roster / Profiles (ทะเบียนผู้เล่น) ------------------------------------
// Adding an EXISTING regular from the roster into today's queue. The caller
// (registry UI) is responsible for skipping anyone already in the session
// (their profileId already appears among session players); this is the write.

/**
 * Add one rostered Profile to the queue as a fresh session Player (skill/name
 * snapshotted from the Profile). Bumps the Profile's visitCount at most once per
 * session — a second add in the same session (e.g. after a remove) only touches
 * lastJoinedAt. Reads the Profile inside the transaction so the count decision
 * is race-safe.
 */
export async function addPlayerFromProfile(profileId: string, sessionCreatedAt: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(profileRef(profileId));
    if (!pSnap.exists()) throw new Error("ไม่พบสมาชิกก๊วนคนนี้");
    const profile = pSnap.data() as Omit<Profile, "id">;
    const now = Date.now();

    const spRef = doc(playersCol);
    tx.set(spRef, {
      name: profile.name,
      skill: profile.skill,
      score: SKILL_SCORE[profile.skill],
      status: "waiting",
      courtId: null,
      gamesPlayed: 0,
      createdAt: now,
      queuedAt: now,
      profileId,
    } satisfies Omit<Player, "id">);

    tx.update(sessionRef, { fairRevision: increment(1) });

    // Cap visitCount at +1 per Profile per session (tracked by lastCountedSession).
    const alreadyCounted = profile.lastCountedSession === sessionCreatedAt;
    tx.update(profileRef(profileId), {
      lastJoinedAt: now,
      ...(alreadyCounted ? {} : { visitCount: increment(1), lastCountedSession: sessionCreatedAt }),
    });
  });
}

/** Add several rostered Profiles to the queue (each its own race-safe write). */
export async function addPlayersFromProfiles(
  profileIds: string[],
  sessionCreatedAt: number,
): Promise<void> {
  for (const id of profileIds) {
    await addPlayerFromProfile(id, sessionCreatedAt);
  }
}

/** Permanently change a Profile's skill (affects the NEXT session it's added to). */
export async function updateProfileSkill(id: string, skill: Skill): Promise<void> {
  await setDoc(profileRef(id), { skill }, { merge: true });
}

/**
 * Hard-delete a roster Profile. It disappears from the roster; re-adding the
 * same name later creates a fresh Profile. Any session Player already linked to
 * it keeps working (its name/skill are its own snapshot) — nothing in Fair Match
 * or Match History reads the Profile, so history stays intact.
 */
export async function deleteProfile(id: string): Promise<void> {
  await deleteDoc(profileRef(id));
}

// ---- Players ---------------------------------------------------------------

export async function deletePlayer(id: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(playerRef(id));
    if (!snap.exists()) return;
    const player = snap.data() as Omit<Player, "id">;
    // If the player was on a court, remove them from that court's teams too.
    if (player.status === "playing" && player.courtId) {
      const cRef = courtRef(player.courtId);
      const cSnap = await tx.get(cRef);
      if (cSnap.exists()) {
        const court = cSnap.data() as Omit<Court, "id">;
        tx.update(cRef, {
          teamA: court.teamA.filter((pid) => pid !== id),
          teamB: court.teamB.filter((pid) => pid !== id),
        });
      }
    }
    // Also drop them from the staged "next game" if they were in it, so a
    // deleted player can never linger in nextUp (arrayRemove is a no-op when
    // the id isn't there).
    tx.update(sessionRef, {
      "nextUp.teamA": arrayRemove(id), "nextUp.teamB": arrayRemove(id),
      [`fairPlayerIdentities.${id}`]: stablePlayerIdentity({ id, ...player }),
      fairRevision: increment(1),
    });
    tx.delete(playerRef(id));
  });
}

/**
 * Move a player between the "waiting" and "resting" pools.
 * Re-entering the queue pushes them to the back (queuedAt refreshed).
 *
 * Going to rest also drops the player from the staged "next game" (they can't
 * be earmarked to play next while sitting out); the writes commit together.
 *
 * Runs in a transaction that re-reads the player so a stale "พัก" tap (a device
 * still showing the player in the queue) can never overwrite someone who has
 * since been assigned to a court — the classic cause of a court/player desync.
 * Resting is allowed only from "waiting" (not on a court); resume only from
 * "resting". A no-op tap (already in the target state) commits nothing.
 */
export async function setPlayerResting(id: string, resting: boolean): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(playerRef(id));
    if (!snap.exists()) return;
    const player = snap.data() as Omit<Player, "id">;
    const now = Date.now();
    if (resting) {
      if (player.status === "resting") return; // already resting — no-op
      if (player.status !== "waiting" || player.courtId != null) {
        throw new Error("ผู้เล่นกำลังอยู่ในคอร์ต พักไม่ได้");
      }
      tx.update(playerRef(id), { status: "resting", queuedAt: now, courtId: null });
      tx.update(sessionRef, { "nextUp.teamA": arrayRemove(id), "nextUp.teamB": arrayRemove(id) });
    } else {
      if (player.status === "waiting") return; // already waiting — no-op
      if (player.status !== "resting") {
        throw new Error("ผู้เล่นไม่ได้อยู่ในสถานะพัก");
      }
      tx.update(playerRef(id), { status: "waiting", queuedAt: now, courtId: null });
    }
    tx.update(sessionRef, { fairRevision: increment(1) });
  });
}

// ---- Matchmaking -----------------------------------------------------------

/**
 * Write a chosen team split onto a court and mark its players as playing.
 * Used by manual/random assignment. Fair validates and writes its decision and
 * skip transitions together in commitFairDecision instead.
 *
 * The game clock does NOT start here — `startedAt` stays null until the admin
 * presses "เริ่มเกม" (startGame). While it's null the four players sit on the
 * court but the timer/game count is paused, which is the window in which the
 * teams can still be swapped (swapCourtPlayers / substituteCourtPlayer).
 */
async function commitAssignment(
  targetCourtId: string,
  teamA: Player[],
  teamB: Player[],
): Promise<void> {
  const ids = [...teamA, ...teamB].map((p) => p.id);
  const batch = writeBatch(db);
  batch.update(courtRef(targetCourtId), {
    teamA: teamA.map((p) => p.id),
    teamB: teamB.map((p) => p.id),
    startedAt: null,
  });
  for (const id of ids) {
    // fair-v3: skip reset happens at startGame, not on court entry.
    batch.update(playerRef(id), { status: "playing", courtId: targetCourtId });
  }
  // Safety net: whoever lands on a court is removed from the staged "next game"
  // so nobody is ever in both nextUp and a court. This is also what clears
  // nextUp when a court is filled by promoting it (the promoted four ARE the
  // nextUp). arrayRemove of ids that aren't staged is a harmless no-op, so it
  // never disturbs a partially-filled nextUp assembled from other players.
  batch.update(sessionRef, {
    "nextUp.teamA": arrayRemove(...ids), "nextUp.teamB": arrayRemove(...ids),
    fairRevision: increment(1),
  });
  await batch.commit();
}

/**
 * Compare two id lists as sets — order-independent membership. Courts always
 * hold unique ids per team, so this is exact assignment/team identity: a
 * cross-team swap changes each team's set and so counts as "changed".
 */
function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * Start the game clock on a court that already has players assigned. This is
 * the only place `startedAt` is set to a real timestamp, so the timer counts
 * from the whistle, not from when players were dropped onto the court.
 *
 * KortQ only scores 2v2 doubles, and once a game starts its composition is
 * frozen. Runs in a transaction that re-reads the court and re-validates against
 * the assignment the admin saw (expectedTeamA/B, compared PER TEAM), so a stale
 * or duplicate start can never begin a DIFFERENT assignment now on the court:
 *   - court exists and is still pre-game (already-started → no-op double tap),
 *   - both teams still match what the admin saw,
 *   - it is a valid 2v2 (2 + 2 = 4 unique ids),
 *   - each of the 4 players is really on this court (exists / playing / courtId),
 *     so a stale setPlayerResting desync can't slip a phantom into a game.
 * Any mismatch throws; nothing is started.
 */
export async function startGame(
  targetCourtId: string,
  expectedTeamA: string[],
  expectedTeamB: string[],
): Promise<void> {
  // fair-v3: fairSkips accounting lives HERE (real game start), not in the Fair
  // decision. Pin the Fair-input revision + enumerate players from the SERVER
  // before the tx. Order matters: read the session (revision) FIRST, then the
  // players, so the enumeration is never older than the revision we pin to.
  const sessionSnap = await getDocFromServer(sessionRef);
  if (!sessionSnap.exists()) throw new Error("ไม่พบสนามที่เปิดอยู่");
  if (sessionSnap.metadata.fromCache || sessionSnap.metadata.hasPendingWrites) throw new Error(START_STALE);
  const session0 = sessionSnap.data() as Session;
  const expectedRevision = session0.fairRevision ?? 0;
  const expectedCreatedAt = session0.createdAt;

  const playersSnap = await getDocsFromServer(playersCol);
  if (playersSnap.metadata.fromCache || playersSnap.metadata.hasPendingWrites) throw new Error(START_STALE);

  await runTransaction(db, async (tx) => {
    // Read the court FIRST so an already-started game is a silent no-op double
    // tap — BEFORE the revision guard, so re-tapping a game that started
    // successfully never surfaces START_STALE.
    const cSnap = await tx.get(courtRef(targetCourtId));
    if (!cSnap.exists()) throw new Error("ไม่พบคอร์ตนี้");
    const court = cSnap.data() as Omit<Court, "id">;
    if (court.startedAt != null) return; // already running — nothing to do

    // Not started yet: enforce the Fair-input consistency guard. Every Fair-input
    // mutation (add/remove/rest/assign/fair/finish/promote/…) bumps fairRevision,
    // so an unchanged revision proves the player set + statuses are exactly as
    // enumerated. Any change → abort (never proceed on a stale set). This re-check
    // runs on every Firestore auto-retry too, so a retry can never silently reuse
    // an outdated snapshot. NB: keep the "every such mutation bumps fairRevision"
    // invariant intact, or this guard would miss changes.
    const freshSession = await tx.get(sessionRef);
    const s = freshSession.exists() ? (freshSession.data() as Session) : null;
    if (!s || !s.active || s.createdAt !== expectedCreatedAt || (s.fairRevision ?? 0) !== expectedRevision) {
      throw new Error(START_STALE);
    }
    const reserved = new Set([...(s.nextUp?.teamA ?? []), ...(s.nextUp?.teamB ?? [])]);

    if (!sameMembers(court.teamA, expectedTeamA) || !sameMembers(court.teamB, expectedTeamB)) {
      throw new Error("ผู้เล่นในคอร์ตเปลี่ยนไปแล้ว ลองใหม่อีกครั้ง");
    }
    const ids = [...court.teamA, ...court.teamB];
    if (court.teamA.length !== 2 || court.teamB.length !== 2 || new Set(ids).size !== 4) {
      throw new Error("ต้องมีผู้เล่นครบ 2 ต่อ 2 (4 คน) ก่อนเริ่มเกม");
    }
    const starters = new Set(ids);

    // Read every player FRESH in the tx; all values below come from these reads,
    // never from the pre-tx snapshot (playersSnap gives only the ref list).
    const fresh = await Promise.all(playersSnap.docs.map((d) => tx.get(d.ref)));
    const byId = new Map(fresh.map((snap) => [snap.id, snap]));
    for (const id of ids) {
      const snap = byId.get(id);
      const p = snap?.exists() ? (snap.data() as Omit<Player, "id">) : null;
      if (!p || p.status !== "playing" || p.courtId !== targetCourtId) {
        throw new Error("สถานะผู้เล่นไม่ตรงกับคอร์ต ลองใหม่อีกครั้ง");
      }
    }

    // ---- writes: fairSkips changes ONLY here ----
    // The four who start reset to 0; every other eligible-and-waiting player
    // (not resting, not on another court, not Next Up reserved) is +1 — a real
    // game they were passed over for.
    for (const id of ids) tx.update(playerRef(id), { fairSkips: 0 });
    for (const snap of fresh) {
      if (!snap.exists() || starters.has(snap.id) || reserved.has(snap.id)) continue;
      const p = snap.data() as Omit<Player, "id">;
      if (p.status === "waiting" && p.courtId == null) {
        tx.update(playerRef(snap.id), { fairSkips: increment(1) });
      }
    }
    tx.update(courtRef(targetCourtId), { startedAt: Date.now() });
    tx.update(sessionRef, { fairRevision: increment(1) });
  });
}

/** Assign a specific set of players to a court and split them into teams. */
export async function assignToCourt(targetCourtId: string, players: Player[]): Promise<void> {
  const { teamA, teamB } = balanceTeams(players);
  await commitAssignment(targetCourtId, teamA, teamB);
}

const FAIR_STALE = "คิว คอร์ต หรือประวัติเปลี่ยนระหว่างจับแฟร์ กรุณากดใหม่";
const START_STALE = "คิว/สนามเปลี่ยนระหว่างกดเริ่มเกม กรุณากดเริ่มเกมใหม่";
const emptyNextUp = (): NextUp => ({ teamA: [], teamB: [] });
const nextUpMatches = (a: NextUp, b: NextUp) => sameMembers(a.teamA, b.teamA) && sameMembers(a.teamB, b.teamB);
const fairPlayerSnapshot = (p: Player) => JSON.stringify([
  p.id, p.name, p.skill, p.score, p.profileId ?? null, p.status, p.courtId ?? null,
  p.gamesPlayed, p.queuedAt, p.fairSkips ?? 0,
]);
const fairCourtSnapshot = (c: Court) => JSON.stringify([c.index, c.teamA, c.teamB, c.startedAt]);

/** Both Fair buttons use fresh server reads and ONE immutable decision. Every
 * app mutation of Fair inputs increments the revision atomically; transaction
 * reads also protect existing players/courts and reservations.
 * A stale decision aborts, never writes skips/logs.
 * Manual selection/balancing is unchanged. All clients must use this version for
 * revision protection against newly-created player/history documents.
 */
async function commitFairDecision(
  target: string,
  expectedSessionCreatedAt: number,
  expectedNextUp?: NextUp,
): Promise<void> {
  const snapshotReadStartedAtClient = Date.now();
  const sessionSnap = await getDocFromServer(sessionRef);
  if (!sessionSnap.exists()) throw new Error("ไม่พบสนามที่เปิดอยู่");
  if (sessionSnap.metadata.fromCache || sessionSnap.metadata.hasPendingWrites) throw new Error(FAIR_STALE);
  const session = sessionSnap.data() as Session;
  if (!session.active || session.createdAt !== expectedSessionCreatedAt) throw new Error("รอบสนามเปลี่ยนแล้ว กรุณาโหลดใหม่");
  const revision = session.fairRevision ?? 0;
  const previousNextUp = session.nextUp ?? emptyNextUp();
  if (target === "nextup" && (!expectedNextUp || !nextUpMatches(previousNextUp, expectedNextUp))) throw new Error(FAIR_STALE);

  // History errors propagate; an offline/cache-only empty result is never accepted.
  const [playersSnap, courtsSnap, matchesSnap] = await Promise.all([
    getDocsFromServer(playersCol), getDocsFromServer(courtsCol), getDocsFromServer(matchesCol),
  ]);
  // Server reads can still expose this client's pending local writes. Do not
  // treat an unacknowledged history/queue overlay as the authoritative input.
  if ([playersSnap, courtsSnap, matchesSnap].some((snap) => snap.metadata.fromCache || snap.metadata.hasPendingWrites)) {
    throw new Error(FAIR_STALE);
  }
  const players = playersSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Player));
  const courts = courtsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Court));
  const matches = matchesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Match));
  const onCourt = new Set(courts.flatMap((c) => [...c.teamA, ...c.teamB]));
  const reserved = new Set([...previousNextUp.teamA, ...previousNextUp.teamB]);
  if (target === "nextup") {
    if (reserved.size === 0 && (courts.length !== session.courtCount || courts.some((c) => c.teamA.length + c.teamB.length === 0))) {
      throw new Error("จัดผู้เล่นลงคอร์ตให้ครบก่อน จึงจะตั้งเกมถัดไปได้");
    }
  } else {
    const court = courts.find((c) => c.id === target);
    if (!court || court.teamA.length + court.teamB.length > 0 || court.startedAt != null) throw new Error("คอร์ตนี้ไม่ว่างแล้ว");
  }
  const eligibility = (p: Player): string | null => {
    if (p.status !== "waiting") return p.status;
    if (p.courtId != null || onCourt.has(p.id)) return "on-court";
    if (target !== "nextup" && reserved.has(p.id)) return "nextup-reserved";
    return null;
  };
  const candidates = players.filter((p) => eligibility(p) === null);
  const aliases = { ...session.fairPlayerIdentities };
  for (const p of players) aliases[p.id] = stablePlayerIdentity(p);
  const decidedAtClient = Date.now();
  // A Next Up reroll (target "nextup" with a full staged set already present) walks
  // to the next Fair-ranked candidate after the current one; the first Next Up Fair
  // (empty staged) and every Court Fair pass no cursor and keep the best.
  const stagedFoursome = [...previousNextUp.teamA, ...previousNextUp.teamB];
  const currentFoursome = target === "nextup" && stagedFoursome.length === 4 ? stagedFoursome : undefined;
  const plan = planFairMatch(candidates, matches, aliases, currentFoursome);
  const teamA = plan.teamA.map((p) => p.id), teamB = plan.teamB.map((p) => p.id);
  const selectedIds = new Set([...teamA, ...teamB]);
  // fair-v3: Fair never mutates fairSkips (that happens at startGame). Kept for the
  // log schema (skipTransitions.size == pool.size); every entry is a no-op so the
  // log never claims an increment/reset that did not happen.
  const skipTransitions = candidates.map((p) => ({
    id: p.id, before: p.fairSkips ?? 0, after: p.fairSkips ?? 0, action: "unchanged",
  }));
  const decisionRef = doc(collection(db, "fairLogs")); // allocate once; not a write
  const decision = {
    ...plan.diagnostics, decisionId: decisionRef.id, target,
    eventKind: target === "nextup" ? "fair-staging" : "fair-court-assignment",
    sessionCreatedAt: session.createdAt, revisionBefore: revision, revisionAfter: revision + 1,
    snapshotReadStartedAtClient, decidedAtClient, planningFinishedAtClient: Date.now(),
    historyReady: true, snapshotSource: "server-reads-validated-at-commit",
    previousNextUp, excluded: players.filter((p) => eligibility(p) !== null).map((p) => ({ id: p.id, reason: eligibility(p) })),
    skipTransitions, teamA, teamB,
  };

  await runTransaction(db, async (tx) => {
    const freshSessionSnap = await tx.get(sessionRef);
    const fresh = freshSessionSnap.exists() ? freshSessionSnap.data() as Session : null;
    if (!fresh?.active || fresh.createdAt !== session.createdAt || (fresh.fairRevision ?? 0) !== revision ||
        fresh.courtCount !== session.courtCount || !nextUpMatches(fresh.nextUp ?? emptyNextUp(), previousNextUp)) throw new Error(FAIR_STALE);
    // Read ALL existing players, not just the selected four: fairness depends on
    // those skipped too. Membership changes/new matches increment fairRevision.
    const [freshPlayers, freshCourts] = await Promise.all([
      Promise.all(playersSnap.docs.map((d) => tx.get(d.ref))),
      Promise.all(courtsSnap.docs.map((d) => tx.get(d.ref))),
    ]);
    for (let i = 0; i < players.length; i++) {
      const snap = freshPlayers[i];
      if (!snap.exists() || fairPlayerSnapshot({ ...snap.data(), id: snap.id } as Player) !== fairPlayerSnapshot(players[i])) throw new Error(FAIR_STALE);
    }
    for (let i = 0; i < courts.length; i++) {
      const snap = freshCourts[i];
      if (!snap.exists() || fairCourtSnapshot({ ...snap.data(), id: snap.id } as Court) !== fairCourtSnapshot(courts[i])) throw new Error(FAIR_STALE);
    }
    // Court Fair still puts the chosen four on the court; it no longer touches
    // fairSkips (startGame owns that). Next Up writes nothing to player docs.
    if (target !== "nextup") {
      for (const id of selectedIds) tx.update(playerRef(id), { status: "playing", courtId: target });
    }
    if (target !== "nextup") tx.update(courtRef(target), { teamA, teamB, startedAt: null });
    tx.update(sessionRef, {
      fairRevision: revision + 1, fairPlayerIdentities: aliases,
      ...(target === "nextup" ? { nextUp: { teamA, teamB } } : {}),
    });
  });

  // Best effort AFTER the assignment acknowledges success. Never block the UI
  // on logging, recompute the decision, or put external effects inside a retrying tx.
  const writeLog = async () => {
    await setDoc(decisionRef, { ...decision, assignmentAckAtClient: Date.now(), createdAt: serverTimestamp() });
  };
  void writeLog().catch((error: unknown) => console.warn("[Fair Match] decision log failed", decisionRef.id, error));
}

/** Court Fair uses the same engine/skip policy as Next Up, excluding reservations. */
export async function fairAssign(
  targetCourtId: string,
  sessionCreatedAt: number,
): Promise<void> {
  await commitFairDecision(targetCourtId, sessionCreatedAt);
}

/**
 * Fill an empty court with 4 RANDOM players drawn from the whole waiting queue
 * (not just the front), then balance them into two even teams.
 */
export async function randomAssign(targetCourtId: string, waiting: Player[]): Promise<void> {
  if (waiting.length < 4) {
    throw new Error("ต้องมีผู้เล่นในคิว 'รอ' อย่างน้อย 4 คน");
  }
  const four = shuffle(waiting).slice(0, 4);
  await assignToCourt(targetCourtId, four);
}

/**
 * Cancel a court's game (the "ยกเลิก" button) without counting it — for fixing a
 * mis-assignment OR abandoning a game mid-play. This is the ONE composition
 * change allowed both before AND after the whistle; it never increments
 * gamesPlayed and never writes Match history.
 *
 * Runs in a transaction that re-validates the assignment the admin saw
 * (expectedTeamA/B per team + expectedStartedAt) so a stale cancel from one
 * device can't wipe a NEW assignment another device just placed. It is
 * deliberately TOLERANT for recovery: it clears the court and returns to the
 * queue only the players still genuinely on this court (courtId === here); a
 * desynced player (e.g. rested elsewhere) is left untouched rather than blocking
 * the cancel. queuedAt is preserved so players keep their queue position.
 */
export async function removeFromCourt(
  targetCourtId: string,
  expectedTeamA: string[],
  expectedTeamB: string[],
  expectedStartedAt: number | null,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const cSnap = await tx.get(courtRef(targetCourtId));
    if (!cSnap.exists()) return; // nothing to cancel
    const court = cSnap.data() as Omit<Court, "id">;

    // Stale cancel guard: the court must still hold the assignment the admin saw.
    if (
      !sameMembers(court.teamA, expectedTeamA) ||
      !sameMembers(court.teamB, expectedTeamB) ||
      (court.startedAt ?? null) !== (expectedStartedAt ?? null)
    ) {
      throw new Error("คอร์ตนี้เปลี่ยนไปแล้ว ลองใหม่อีกครั้ง");
    }

    const ids = [...court.teamA, ...court.teamB];
    const onThisCourt: string[] = [];
    for (const id of ids) {
      const pSnap = await tx.get(playerRef(id));
      if (pSnap.exists() && (pSnap.data() as Omit<Player, "id">).courtId === targetCourtId) {
        onThisCourt.push(id);
      }
    }

    tx.update(courtRef(targetCourtId), { teamA: [], teamB: [], startedAt: null });
    for (const id of onThisCourt) {
      tx.update(playerRef(id), { status: "waiting", courtId: null });
    }
    tx.update(sessionRef, { fairRevision: increment(1) });
  });
}

/**
 * Swap two assigned players' slots on the SAME court, before the game starts.
 * Moves a player from team A to team B (and vice versa) among the four already
 * on the court. No queue or status change — they're both already "playing" here,
 * on the same court, so only the court arrays change (no player-doc writes).
 *
 * Runs in a transaction that re-reads the court so a stale swap can't edit a game
 * that has since STARTED, nor clobber a court whose assignment changed:
 * `startedAt` must still be null and the two teams must still match the snapshot
 * the admin saw (expectedTeamA/B); otherwise it throws.
 */
export async function swapCourtPlayers(
  targetCourtId: string,
  expectedTeamA: string[],
  expectedTeamB: string[],
  idA: string,
  idB: string,
): Promise<void> {
  if (idA === idB) return;
  await runTransaction(db, async (tx) => {
    const cSnap = await tx.get(courtRef(targetCourtId));
    if (!cSnap.exists()) throw new Error("ไม่พบคอร์ตนี้");
    const court = cSnap.data() as Omit<Court, "id">;
    if (court.startedAt != null) throw new Error("เกมเริ่มแล้ว แก้ทีมไม่ได้");
    if (!sameMembers(court.teamA, expectedTeamA) || !sameMembers(court.teamB, expectedTeamB)) {
      throw new Error("ผู้เล่นในคอร์ตเปลี่ยนไปแล้ว ลองใหม่อีกครั้ง");
    }
    const onCourt = [...court.teamA, ...court.teamB];
    if (!onCourt.includes(idA) || !onCourt.includes(idB)) {
      throw new Error("ผู้เล่นเปลี่ยนไปแล้ว ลองใหม่อีกครั้ง");
    }
    const swap = (ids: string[]) => ids.map((id) => (id === idA ? idB : id === idB ? idA : id));
    tx.update(courtRef(targetCourtId), { teamA: swap(court.teamA), teamB: swap(court.teamB) });
    tx.update(sessionRef, { fairRevision: increment(1) });
  });
}

/**
 * Substitute a player currently on a court (pre-game) with a waiting player.
 * The player leaving the court goes to the BACK of the waiting queue
 * (queuedAt refreshed); the incoming player takes their exact slot/team.
 * No gamesPlayed change — the game hasn't started.
 *
 * Runs in a transaction that re-reads the court and both players so a stale
 * substitute can't change a game that has since STARTED, and can't clobber a
 * changed assignment or grab an incoming player who is no longer free:
 *   - court still pre-game (startedAt == null) and teams still match the snapshot,
 *   - outgoing is still playing on this court,
 *   - incoming is still waiting and not on any court.
 * Otherwise it throws; nothing changes.
 */
export async function substituteCourtPlayer(
  targetCourtId: string,
  expectedTeamA: string[],
  expectedTeamB: string[],
  courtPlayerId: string,
  waitingPlayerId: string,
): Promise<void> {
  if (courtPlayerId === waitingPlayerId) return;
  await runTransaction(db, async (tx) => {
    const cSnap = await tx.get(courtRef(targetCourtId));
    if (!cSnap.exists()) throw new Error("ไม่พบคอร์ตนี้");
    const court = cSnap.data() as Omit<Court, "id">;
    if (court.startedAt != null) throw new Error("เกมเริ่มแล้ว เปลี่ยนตัวไม่ได้");
    if (!sameMembers(court.teamA, expectedTeamA) || !sameMembers(court.teamB, expectedTeamB)) {
      throw new Error("ผู้เล่นในคอร์ตเปลี่ยนไปแล้ว ลองใหม่อีกครั้ง");
    }
    if (![...court.teamA, ...court.teamB].includes(courtPlayerId)) {
      throw new Error("ผู้เล่นที่จะเปลี่ยนออกไม่อยู่ในคอร์ตแล้ว");
    }
    const outSnap = await tx.get(playerRef(courtPlayerId));
    const inSnap = await tx.get(playerRef(waitingPlayerId));
    // Read the session so a concurrent Next Up change makes this tx retry, and so
    // we can reject an incoming player already reserved in the staged next game
    // (a staged player is still status "waiting" + courtId null, so the checks
    // below alone wouldn't catch them). Next Up is a reservation the queue must
    // not bypass — we never auto-remove them from it here.
    const sSnap = await tx.get(sessionRef);
    const outP = outSnap.exists() ? (outSnap.data() as Omit<Player, "id">) : null;
    const inP = inSnap.exists() ? (inSnap.data() as Omit<Player, "id">) : null;
    if (!outP || outP.status !== "playing" || outP.courtId !== targetCourtId) {
      throw new Error("สถานะผู้เล่นที่จะเปลี่ยนออกไม่ตรง ลองใหม่อีกครั้ง");
    }
    if (!inP || inP.status !== "waiting" || inP.courtId != null) {
      throw new Error("ผู้เล่นที่จะเปลี่ยนเข้าไม่ว่างแล้ว ลองใหม่อีกครั้ง");
    }
    const nextUp = sSnap.exists() ? (sSnap.data() as Session).nextUp : undefined;
    if ((nextUp?.teamA ?? []).includes(waitingPlayerId) || (nextUp?.teamB ?? []).includes(waitingPlayerId)) {
      throw new Error("ผู้เล่นถูกเลือกไว้ในเกมถัดไปแล้ว");
    }

    const replace = (ids: string[]) => ids.map((id) => (id === courtPlayerId ? waitingPlayerId : id));
    tx.update(courtRef(targetCourtId), { teamA: replace(court.teamA), teamB: replace(court.teamB) });
    // Outgoing player → back of the queue.
    tx.update(playerRef(courtPlayerId), { status: "waiting", courtId: null, queuedAt: Date.now() });
    // Incoming player → onto the court (game not started, so no game count).
    // fair-v3: skip reset happens at startGame, not on court entry.
    tx.update(playerRef(waitingPlayerId), { status: "playing", courtId: targetCourtId });
    tx.update(sessionRef, { fairRevision: increment(1) });
  });
}

/**
 * Swap two players who are on DIFFERENT courts, before either game starts. Each
 * takes the other's exact team slot on the other court — no re-balance. Works
 * for any pair of courts (not just 1↔2).
 *
 * Runs in a transaction that re-reads both courts AND both players so two admin
 * devices can't act on stale state: both courts must exist, be distinct, both be
 * pre-game (startedAt == null), and still hold the two players; and each player
 * must still be "playing" on their source court. Validating the player docs (not
 * just the court arrays) guards against a court/player desync a stale
 * setPlayerResting could otherwise leave behind. Only `courtId` changes — status
 * stays "playing", gamesPlayed and queuedAt untouched.
 */
export async function swapAcrossCourts(
  courtIdA: string,
  courtIdB: string,
  idA: string,
  idB: string,
): Promise<void> {
  if (courtIdA === courtIdB || idA === idB) return;
  await runTransaction(db, async (tx) => {
    // ---- reads (all before any write) ----
    const aSnap = await tx.get(courtRef(courtIdA));
    const bSnap = await tx.get(courtRef(courtIdB));
    if (!aSnap.exists() || !bSnap.exists()) throw new Error("ไม่พบคอร์ต");
    const courtA = aSnap.data() as Omit<Court, "id">;
    const courtB = bSnap.data() as Omit<Court, "id">;

    if (courtA.startedAt != null || courtB.startedAt != null) {
      throw new Error("คอร์ตเริ่มเกมแล้ว สลับข้ามคอร์ตไม่ได้");
    }
    if (![...courtA.teamA, ...courtA.teamB].includes(idA) || ![...courtB.teamA, ...courtB.teamB].includes(idB)) {
      throw new Error("ผู้เล่นเปลี่ยนคอร์ตไปแล้ว ลองใหม่อีกครั้ง");
    }

    const pASnap = await tx.get(playerRef(idA));
    const pBSnap = await tx.get(playerRef(idB));
    const pA = pASnap.exists() ? (pASnap.data() as Omit<Player, "id">) : null;
    const pB = pBSnap.exists() ? (pBSnap.data() as Omit<Player, "id">) : null;
    if (!pA || pA.status !== "playing" || pA.courtId !== courtIdA) {
      throw new Error("สถานะผู้เล่นไม่ตรงกับคอร์ต ลองใหม่อีกครั้ง");
    }
    if (!pB || pB.status !== "playing" || pB.courtId !== courtIdB) {
      throw new Error("สถานะผู้เล่นไม่ตรงกับคอร์ต ลองใหม่อีกครั้ง");
    }

    // ---- writes: replace each id in place on its court, keeping team slots ----
    const putBinA = (ids: string[]) => ids.map((id) => (id === idA ? idB : id));
    const putAinB = (ids: string[]) => ids.map((id) => (id === idB ? idA : id));
    tx.update(courtRef(courtIdA), { teamA: putBinA(courtA.teamA), teamB: putBinA(courtA.teamB) });
    tx.update(courtRef(courtIdB), { teamA: putAinB(courtB.teamA), teamB: putAinB(courtB.teamB) });
    tx.update(playerRef(idA), { courtId: courtIdB });
    tx.update(playerRef(idB), { courtId: courtIdA });
    tx.update(sessionRef, { fairRevision: increment(1) });
  });
}

// ---- Next Up (เกมถัดไป) ----------------------------------------------------
// A single staged next game on the session doc: sessions/current.nextUp =
// { teamA, teamB }. Staged players keep status "waiting" (they're just
// earmarked) — the UI hides them from the open queue and excludes them from
// court assignment pools. A Fair reroll includes them to reconsider the reservation.
// Cleared on promote
// (via commitAssignment's arrayRemove) and on session start/end (both overwrite
// the whole session doc). The `nextUp` map is always written whole so it can
// never end up half-populated.

/** Overwrite the staged next game with a specific A/B split (ids). */
export async function setNextUp(teamA: string[], teamB: string[]): Promise<void> {
  await setDoc(sessionRef, { nextUp: { teamA, teamB }, fairRevision: increment(1) }, { merge: true });
}

/** Clear the staged next game. */
export async function clearNextUp(): Promise<void> {
  await setNextUp([], []);
}

/** Reroll includes old staged players, with their skip entitlement still frozen. */
export async function setNextUpFair(sessionCreatedAt: number, expectedNextUp: NextUp): Promise<void> {
  await commitFairDecision("nextup", sessionCreatedAt, expectedNextUp);
}

/**
 * Stage the next game from an explicit set of 4 hand-picked players, split into
 * skill-even teams (same balancer the manual court assign uses). Admin can then
 * fine-tune with swap/substitute.
 */
export async function setNextUpManual(players: Player[]): Promise<void> {
  if (players.length !== 4) throw new Error("ต้องเลือกผู้เล่นให้ครบ 4 คน");
  const { teamA, teamB } = balanceTeams(players);
  await setNextUp(teamA.map((p) => p.id), teamB.map((p) => p.id));
}

/**
 * Swap two staged players' slots across teams (pre-promote edit). Mirrors the
 * pre-game court swap: current teams are passed in from the live snapshot.
 */
export async function swapNextUpPlayers(
  teamA: string[],
  teamB: string[],
  idA: string,
  idB: string,
): Promise<void> {
  if (idA === idB) return;
  const swap = (ids: string[]) => ids.map((id) => (id === idA ? idB : id === idB ? idA : id));
  await setNextUp(swap(teamA), swap(teamB));
}

/**
 * Substitute a staged player with a waiting player. The outgoing player goes to
 * the BACK of the queue (queuedAt refreshed); the incoming player takes the
 * exact slot. Both stay "waiting" — only the earmark and queue order change.
 */
export async function substituteNextUpPlayer(
  teamA: string[],
  teamB: string[],
  outId: string,
  inId: string,
): Promise<void> {
  if (outId === inId) return;
  const replace = (ids: string[]) => ids.map((id) => (id === outId ? inId : id));
  const batch = writeBatch(db);
  batch.update(sessionRef, {
    nextUp: { teamA: replace(teamA), teamB: replace(teamB) }, fairRevision: increment(1),
  });
  batch.update(playerRef(outId), { queuedAt: Date.now() });
  await batch.commit();
}

/** Remove one player from the staged next game (back to the queue in place). */
export async function removeFromNextUp(teamA: string[], teamB: string[], id: string): Promise<void> {
  await setNextUp(teamA.filter((x) => x !== id), teamB.filter((x) => x !== id));
}

/**
 * Add a waiting player to an incomplete next game, filling the smaller team
 * (max 2 per side, 4 total). No-op if already full or already staged.
 */
export async function addToNextUp(teamA: string[], teamB: string[], id: string): Promise<void> {
  if (teamA.includes(id) || teamB.includes(id)) return;
  if (teamA.length + teamB.length >= 4) return;
  if (teamA.length <= teamB.length && teamA.length < 2) {
    await setNextUp([...teamA, id], teamB);
  } else {
    await setNextUp(teamA, [...teamB, id]);
  }
}

/**
 * Promote the staged next game onto a court, preserving the admin's exact
 * Team A / Team B (no re-balance); startedAt stays null (→ "รอเริ่มเกม").
 *
 * Runs in a transaction that re-checks the latest state before writing, so two
 * admin devices can't drop the same staged game onto two courts:
 *   - the target court must still be empty,
 *   - nextUp must still hold exactly these 4 ids (unchanged since the tap),
 *   - none of the four may already be on another court.
 * The winning commit clears nextUp; a racing second promote then re-reads an
 * empty/changed nextUp and aborts. `expectedTeamA/B` are the ids the admin saw.
 */
export async function promoteNextUp(
  targetCourtId: string,
  expectedTeamA: string[],
  expectedTeamB: string[],
): Promise<void> {
  const expected = [...expectedTeamA, ...expectedTeamB];
  await runTransaction(db, async (tx) => {
    // ---- reads (all before any write) ----
    const cSnap = await tx.get(courtRef(targetCourtId));
    if (!cSnap.exists()) throw new Error("ไม่พบคอร์ตนี้");
    const court = cSnap.data() as Omit<Court, "id">;
    if (court.teamA.length + court.teamB.length > 0) {
      throw new Error("คอร์ตนี้มีผู้เล่นแล้ว");
    }

    const sSnap = await tx.get(sessionRef);
    const nextUp = sSnap.exists() ? (sSnap.data() as Session).nextUp : undefined;
    const teamA = nextUp?.teamA ?? [];
    const teamB = nextUp?.teamB ?? [];
    const ids = [...teamA, ...teamB];
    if (ids.length !== 4) throw new Error("เกมถัดไปยังไม่ครบ 4 คน");
    const sameSet =
      ids.length === expected.length && ids.every((id) => expected.includes(id));
    if (!sameSet) throw new Error("เกมถัดไปเปลี่ยนไปแล้ว ลองใหม่อีกครั้ง");

    for (const id of ids) {
      const pSnap = await tx.get(playerRef(id));
      if (!pSnap.exists()) throw new Error("ผู้เล่นบางคนหายไปแล้ว");
      const p = pSnap.data() as Omit<Player, "id">;
      if (p.status === "playing" || p.courtId) {
        throw new Error("ผู้เล่นบางคนลงคอร์ตอื่นแล้ว");
      }
    }

    // ---- writes: exact teams (no re-balance), clock paused, nextUp cleared ----
    tx.update(courtRef(targetCourtId), { teamA, teamB, startedAt: null });
    for (const id of ids) {
      // fair-v3: skip reset happens at startGame, not on court entry.
      tx.update(playerRef(id), { status: "playing", courtId: targetCourtId });
    }
    tx.update(sessionRef, { nextUp: { teamA: [], teamB: [] }, fairRevision: increment(1) });
  });
}

/**
 * End the game on a court: everyone goes back to the waiting queue with +1
 * gamesPlayed, and the finished game is recorded for "จับแฟร์".
 *
 * Runs in a transaction so a game is counted EXACTLY once. `expectedStartedAt`
 * is the court's `startedAt` the admin saw when tapping "จบเกม"; the transaction
 * re-reads the court and only finishes when it is still that same game:
 *   - court exists and has actually started (startedAt != null),
 *   - startedAt === expectedStartedAt — so a stale/duplicate request can never
 *     finish a DIFFERENT game that has since been started on this court.
 * These identity misses are SILENT no-ops (no increment, no Match, court
 * untouched): they block double taps, concurrent finishes (the losing device
 * retries, re-reads the cleared court, and no-ops), and late requests.
 *
 * Once identity matches, a broken invariant — not a real 2v2, or a player whose
 * status/courtId no longer matches this court (e.g. a stale rest) — is a genuine
 * anomaly and THROWS instead: the game is not counted, no player is silently
 * reset, and the admin is told to cancel and re-assign.
 */
export async function finishGame(targetCourtId: string, expectedStartedAt: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const cSnap = await tx.get(courtRef(targetCourtId));
    if (!cSnap.exists()) return; // court gone — nothing to finish

    const court = cSnap.data() as Omit<Court, "id">;
    // Stale / double tap / concurrent loser / court reused for a new game: the
    // game the admin meant to finish is already over or replaced → silent no-op.
    if (court.startedAt == null || court.startedAt !== expectedStartedAt) return;

    // Identity matches the exact started game the admin tapped, so from here on a
    // broken invariant is a real anomaly → throw (never silently count/reset).
    const ids = [...court.teamA, ...court.teamB];
    if (court.teamA.length !== 2 || court.teamB.length !== 2 || new Set(ids).size !== 4) {
      throw new Error("สถานะเกมผิดปกติ (ไม่ใช่ 2 ต่อ 2) — ใช้ปุ่มยกเลิกแล้วจัดใหม่");
    }
    const identities: Record<string, string> = {};
    for (const id of ids) {
      const pSnap = await tx.get(playerRef(id));
      const p = pSnap.exists() ? (pSnap.data() as Omit<Player, "id">) : null;
      if (!p || p.status !== "playing" || p.courtId !== targetCourtId) {
        throw new Error("สถานะผู้เล่นไม่ตรงกับคอร์ต — ใช้ปุ่มยกเลิกแล้วจัดใหม่");
      }
      identities[id] = stablePlayerIdentity({ id, ...p });
    }

    const now = Date.now();
    for (const id of ids) {
      // Push finished players to the back of the queue for fairness, +1 game.
      tx.update(playerRef(id), {
        status: "waiting",
        courtId: null,
        queuedAt: now,
        gamesPlayed: increment(1),
      });
    }
    // Record the finished game so "จับแฟร์" can avoid repeats (wiped on End Session).
    tx.set(doc(matchesCol), {
      courtId: targetCourtId,
      teamA: court.teamA,
      teamB: court.teamB,
      teamAIdentities: court.teamA.map((id) => identities[id]),
      teamBIdentities: court.teamB.map((id) => identities[id]),
      players: ids,
      startedAt: court.startedAt,
      finishedAt: now,
    } satisfies Omit<Match, "id">);
    // Invalidates any Fair plan fetched before this new history document existed.
    tx.update(sessionRef, { fairRevision: increment(1) });
    tx.update(courtRef(targetCourtId), { teamA: [], teamB: [], startedAt: null });
  });
}
