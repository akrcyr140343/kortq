import {
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
  type Transaction,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  MAX_QUEUED_GAMES,
  SKILL_SCORE,
  normalizeNameKey,
  type Court,
  type Match,
  type NextUp,
  type Player,
  type Profile,
  type QueuedGame,
  type Session,
  type Skill,
} from "./types";
import { balanceTeams, shuffle } from "./matchmaking";
import { planFairMatch, stablePlayerIdentity } from "./fairmatch";

// ---- Firestore paths -------------------------------------------------------
// A single active session lives at sessions/current, with players, running
// games (the `courts` subcollection — name kept for schema stability) and
// finished matches as subcollections. Ending a session wipes all three.
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
  // courtCount only caps how many games may run at once; game docs are created
  // when Q1 is sent, so nothing is pre-made per court any more.
  const session: Session = {
    active: true,
    courtCount,
    createdAt: Date.now(),
    gameQueue: [],
    gameSeq: 0,
  };
  batch.set(sessionRef, { ...session, fairRevision: increment(1) });
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
    // ---- reads (all before any write) ----
    let game: { ref: ReturnType<typeof courtRef>; data: Omit<Court, "id"> } | null = null;
    if (player.status === "playing" && player.courtId) {
      const gRef = courtRef(player.courtId);
      const gSnap = await tx.get(gRef);
      if (gSnap.exists()) game = { ref: gRef, data: gSnap.data() as Omit<Court, "id"> };
    }
    const sSnap = await tx.get(sessionRef);
    const queue = readQueue(sSnap.exists() ? (sSnap.data() as Session) : null);

    // If the player was in a running game, remove them from its teams too.
    if (game) {
      tx.update(game.ref, {
        teamA: game.data.teamA.filter((pid) => pid !== id),
        teamB: game.data.teamB.filter((pid) => pid !== id),
      });
    }
    // Drop them from any Q so a deleted player can never linger in the line.
    const nextQueue = compactQueue(queue.map((q) => ({
      ...q, teamA: q.teamA.filter((x) => x !== id), teamB: q.teamB.filter((x) => x !== id),
    })));
    tx.update(sessionRef, {
      gameQueue: nextQueue,
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
 * Going to rest also drops the player from any queued game (they can't be
 * earmarked to play while sitting out); the writes commit together.
 *
 * Runs in a transaction that re-reads the player so a stale "พัก" tap (a device
 * still showing the player in the queue) can never overwrite someone who has
 * since been sent to play — the classic cause of a game/player desync.
 * Resting is allowed only from "waiting" (not in a game); resume only from
 * "resting". A no-op tap (already in the target state) commits nothing.
 */
export async function setPlayerResting(id: string, resting: boolean): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(playerRef(id));
    if (!snap.exists()) return;
    const player = snap.data() as Omit<Player, "id">;
    const sSnap = await tx.get(sessionRef);
    const queue = readQueue(sSnap.exists() ? (sSnap.data() as Session) : null);
    const now = Date.now();
    if (resting) {
      if (player.status === "resting") return; // already resting — no-op
      if (player.status !== "waiting" || player.courtId != null) {
        throw new Error("ผู้เล่นกำลังเล่นอยู่ พักไม่ได้");
      }
      tx.update(playerRef(id), { status: "resting", queuedAt: now, courtId: null });
      // A resting player can't be earmarked for a game: drop them from any Q.
      tx.update(sessionRef, {
        gameQueue: compactQueue(queue.map((q) => ({
          ...q, teamA: q.teamA.filter((x) => x !== id), teamB: q.teamB.filter((x) => x !== id),
        }))),
      });
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

// ---- Game queue (Q1–Q3) ------------------------------------------------------
// Games waiting in line live on the session doc as `gameQueue` (array order =
// Q1, Q2, Q3). Queued players keep status "waiting" — they're only earmarked —
// and the UI hides them from the open queue. Every edit runs in a transaction
// that re-reads the session (the queue's single source of truth) and the
// players involved, so two devices can never put one player in two games or
// resurrect a Q that was already sent. Every edit bumps fairRevision.

const QUEUE_STALE = "คิวเกมเปลี่ยนไปแล้ว ลองใหม่อีกครั้ง";

function readQueue(s: Session | null): QueuedGame[] {
  return (s?.gameQueue ?? []).map((q) => ({ id: q.id, teamA: [...q.teamA], teamB: [...q.teamB] }));
}
const queuedIds = (q: NextUp) => [...q.teamA, ...q.teamB];
/** An emptied Q is dropped, so the line always closes up (Q2 → Q1). */
const compactQueue = (queue: QueuedGame[]) => queue.filter((q) => q.teamA.length + q.teamB.length > 0);
/** Allocate a stable id for a new Q (no write happens here). */
const newQueueId = () => doc(courtsCol).id;
/** Only a doc with players is a real running game (legacy empty court-N docs are ignored). */
const isRunningGame = (g: Omit<Court, "id">) => g.teamA.length + g.teamB.length > 0;

async function readActiveSession(tx: Transaction, expectedCreatedAt: number): Promise<Session> {
  const snap = await tx.get(sessionRef);
  const s = snap.exists() ? (snap.data() as Session) : null;
  if (!s?.active) throw new Error("ยังไม่ได้เปิดสนาม");
  if (s.createdAt !== expectedCreatedAt) throw new Error("รอบสนามเปลี่ยนแล้ว กรุณาโหลดใหม่");
  return s;
}

/**
 * Re-read players inside the transaction and require each to be genuinely free:
 * waiting, not in a running game, and not already in another Q (req 8).
 */
async function readFreePlayers(
  tx: Transaction,
  ids: string[],
  queue: QueuedGame[],
  ignoreQueueId?: string,
): Promise<Player[]> {
  const reserved = new Set(queue.filter((q) => q.id !== ignoreQueueId).flatMap(queuedIds));
  const out: Player[] = [];
  for (const id of ids) {
    const snap = await tx.get(playerRef(id));
    if (!snap.exists()) throw new Error("ผู้เล่นบางคนหายไปแล้ว");
    const p = { ...(snap.data() as Omit<Player, "id">), id };
    if (p.status !== "waiting" || p.courtId != null) throw new Error(`${p.name} ไม่ว่างแล้ว (กำลังเล่นหรือพักอยู่)`);
    if (reserved.has(id)) throw new Error(`${p.name} อยู่ในคิวเกมอื่นแล้ว`);
    out.push(p);
  }
  return out;
}

function findQueued(queue: QueuedGame[], queueId: string): QueuedGame {
  const q = queue.find((x) => x.id === queueId);
  if (!q) throw new Error(QUEUE_STALE);
  return q;
}

/**
 * Hand-pick 1–4 waiting players into a NEW Q at the back of the line, split into
 * skill-even teams (same balancer as before). A partial Q is allowed — it can be
 * filled later; only a full Q1 can be sent.
 */
export async function createQueuedGame(playerIds: string[], sessionCreatedAt: number): Promise<void> {
  const ids = [...new Set(playerIds)];
  if (ids.length < 1 || ids.length > 4) throw new Error("เลือกผู้เล่น 1–4 คน");
  await runTransaction(db, async (tx) => {
    const s = await readActiveSession(tx, sessionCreatedAt);
    const queue = readQueue(s);
    if (queue.length >= MAX_QUEUED_GAMES) throw new Error(`คิวเกมเต็มแล้ว (สูงสุด ${MAX_QUEUED_GAMES} คิว)`);
    const players = await readFreePlayers(tx, ids, queue);
    const { teamA, teamB } = balanceTeams(players);
    queue.push({ id: newQueueId(), teamA: teamA.map((p) => p.id), teamB: teamB.map((p) => p.id) });
    tx.update(sessionRef, { gameQueue: queue, fairRevision: increment(1) });
  });
}

/**
 * Fill a Q (new, or replace an existing one) with 4 RANDOM free players drawn
 * from the whole open queue, balanced into two teams. Re-randomising an existing
 * Q releases its own players back into the draw. The draw happens inside the
 * transaction from fresh player reads, so it can't pick someone just taken.
 */
export async function randomQueuedGame(queueId: string | null, sessionCreatedAt: number): Promise<void> {
  const playersSnap = await getDocs(playersCol);
  await runTransaction(db, async (tx) => {
    const s = await readActiveSession(tx, sessionCreatedAt);
    const queue = readQueue(s);
    if (queueId) findQueued(queue, queueId);
    else if (queue.length >= MAX_QUEUED_GAMES) throw new Error(`คิวเกมเต็มแล้ว (สูงสุด ${MAX_QUEUED_GAMES} คิว)`);
    const reserved = new Set(queue.filter((q) => q.id !== queueId).flatMap(queuedIds));
    const fresh = await Promise.all(playersSnap.docs.map((d) => tx.get(d.ref)));
    const pool = fresh
      .filter((snap) => snap.exists())
      .map((snap) => ({ ...(snap.data() as Omit<Player, "id">), id: snap.id }))
      .filter((p) => p.status === "waiting" && p.courtId == null && !reserved.has(p.id));
    if (pool.length < 4) throw new Error("ผู้เล่นว่างในคิวไม่ถึง 4 คน");
    const { teamA, teamB } = balanceTeams(shuffle(pool).slice(0, 4));
    const game = { teamA: teamA.map((p) => p.id), teamB: teamB.map((p) => p.id) };
    const next = queueId
      ? queue.map((q) => (q.id === queueId ? { id: q.id, ...game } : q))
      : [...queue, { id: newQueueId(), ...game }];
    tx.update(sessionRef, { gameQueue: next, fairRevision: increment(1) });
  });
}

/** Fair into a new Q (queueId null) or re-roll an existing Q. See commitFairDecision. */
export async function fairQueuedGame(
  queueId: string | null,
  sessionCreatedAt: number,
  expectedTeams?: NextUp,
): Promise<void> {
  await commitFairDecision(queueId, sessionCreatedAt, expectedTeams);
}

/** Swap two players inside the same Q (across teams). */
export async function swapInQueuedGame(
  queueId: string,
  idA: string,
  idB: string,
  sessionCreatedAt: number,
): Promise<void> {
  if (idA === idB) return;
  await runTransaction(db, async (tx) => {
    const s = await readActiveSession(tx, sessionCreatedAt);
    const queue = readQueue(s);
    const q = findQueued(queue, queueId);
    const ids = queuedIds(q);
    if (!ids.includes(idA) || !ids.includes(idB)) throw new Error(QUEUE_STALE);
    const swap = (list: string[]) => list.map((id) => (id === idA ? idB : id === idB ? idA : id));
    q.teamA = swap(q.teamA);
    q.teamB = swap(q.teamB);
    tx.update(sessionRef, { gameQueue: queue, fairRevision: increment(1) });
  });
}

/**
 * Replace a queued player with a free waiting player, in the exact slot. The
 * outgoing player goes to the BACK of the waiting queue (queuedAt refreshed),
 * as the old Next Up substitute did.
 */
export async function substituteInQueuedGame(
  queueId: string,
  outId: string,
  inId: string,
  sessionCreatedAt: number,
): Promise<void> {
  if (outId === inId) return;
  await runTransaction(db, async (tx) => {
    const s = await readActiveSession(tx, sessionCreatedAt);
    const queue = readQueue(s);
    const q = findQueued(queue, queueId);
    if (!queuedIds(q).includes(outId)) throw new Error(QUEUE_STALE);
    await readFreePlayers(tx, [inId], queue);
    const outSnap = await tx.get(playerRef(outId));
    const replace = (list: string[]) => list.map((id) => (id === outId ? inId : id));
    q.teamA = replace(q.teamA);
    q.teamB = replace(q.teamB);
    if (outSnap.exists()) tx.update(playerRef(outId), { queuedAt: Date.now() });
    tx.update(sessionRef, { gameQueue: queue, fairRevision: increment(1) });
  });
}

/** Take one player out of a Q (back to the open queue in place). An emptied Q closes up. */
export async function removeFromQueuedGame(queueId: string, id: string, sessionCreatedAt: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const s = await readActiveSession(tx, sessionCreatedAt);
    const queue = readQueue(s);
    const q = findQueued(queue, queueId);
    if (!queuedIds(q).includes(id)) return; // already gone — nothing to do
    q.teamA = q.teamA.filter((x) => x !== id);
    q.teamB = q.teamB.filter((x) => x !== id);
    tx.update(sessionRef, { gameQueue: compactQueue(queue), fairRevision: increment(1) });
  });
}

/** Add a free waiting player to an incomplete Q, filling the smaller team (max 2 per side). */
export async function addToQueuedGame(queueId: string, id: string, sessionCreatedAt: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const s = await readActiveSession(tx, sessionCreatedAt);
    const queue = readQueue(s);
    const q = findQueued(queue, queueId);
    if (queuedIds(q).length >= 4) throw new Error("คิวนี้ครบ 4 คนแล้ว");
    await readFreePlayers(tx, [id], queue);
    if (q.teamA.length <= q.teamB.length && q.teamA.length < 2) q.teamA.push(id);
    else q.teamB.push(id);
    tx.update(sessionRef, { gameQueue: queue, fairRevision: increment(1) });
  });
}

/** Remove a whole Q; its players stay in the open queue where they were. */
export async function deleteQueuedGame(queueId: string, sessionCreatedAt: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const s = await readActiveSession(tx, sessionCreatedAt);
    const queue = readQueue(s);
    if (!queue.some((q) => q.id === queueId)) return; // already gone
    tx.update(sessionRef, {
      gameQueue: queue.filter((q) => q.id !== queueId),
      fairRevision: increment(1),
    });
  });
}

// ---- Fair ------------------------------------------------------------------

const FAIR_STALE = "คิว เกม หรือประวัติเปลี่ยนระหว่างจับแฟร์ กรุณากดใหม่";
const SEND_STALE = "คิว/เกมเปลี่ยนระหว่างเรียกลงสนาม กรุณากดใหม่";
const emptyNextUp = (): NextUp => ({ teamA: [], teamB: [] });
const teamsMatch = (a: NextUp, b: NextUp) => sameMembers(a.teamA, b.teamA) && sameMembers(a.teamB, b.teamB);
const fairPlayerSnapshot = (p: Player) => JSON.stringify([
  p.id, p.name, p.skill, p.score, p.profileId ?? null, p.status, p.courtId ?? null,
  p.gamesPlayed, p.queuedAt, p.fairSkips ?? 0,
]);
const fairCourtSnapshot = (c: Court) => JSON.stringify([c.index, c.teamA, c.teamB, c.startedAt]);

/**
 * Compare two id lists as sets — order-independent membership.
 */
function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * Fair into a Q: fresh server reads and ONE immutable decision, computed when
 * the Q is arranged (never re-computed at send time). Candidates are free
 * waiting players; players held by OTHER Qs or in a running game are excluded,
 * while re-rolling a Q releases its own players back into the pool. Every app
 * mutation of Fair inputs increments the revision atomically, so a stale
 * decision aborts and never writes. fairLogs keep their existing schema
 * (target "nextup" / eventKind "fair-staging") so Firestore rules are unchanged.
 */
async function commitFairDecision(
  targetQueueId: string | null,
  expectedSessionCreatedAt: number,
  expectedTeams?: NextUp,
): Promise<void> {
  const snapshotReadStartedAtClient = Date.now();
  const sessionSnap = await getDocFromServer(sessionRef);
  if (!sessionSnap.exists()) throw new Error("ไม่พบสนามที่เปิดอยู่");
  if (sessionSnap.metadata.fromCache || sessionSnap.metadata.hasPendingWrites) throw new Error(FAIR_STALE);
  const session = sessionSnap.data() as Session;
  if (!session.active || session.createdAt !== expectedSessionCreatedAt) throw new Error("รอบสนามเปลี่ยนแล้ว กรุณาโหลดใหม่");
  const revision = session.fairRevision ?? 0;
  const queue = readQueue(session);
  const targetQ = targetQueueId ? queue.find((q) => q.id === targetQueueId) : undefined;
  if (targetQueueId) {
    if (!targetQ || (expectedTeams && !teamsMatch(targetQ, expectedTeams))) throw new Error(FAIR_STALE);
  } else if (queue.length >= MAX_QUEUED_GAMES) {
    throw new Error(`คิวเกมเต็มแล้ว (สูงสุด ${MAX_QUEUED_GAMES} คิว)`);
  }
  const previousNextUp: NextUp = targetQ ? { teamA: targetQ.teamA, teamB: targetQ.teamB } : emptyNextUp();

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
  const reserved = new Set(queue.filter((q) => q.id !== targetQueueId).flatMap(queuedIds));
  const eligibility = (p: Player): string | null => {
    if (p.status !== "waiting") return p.status;
    if (p.courtId != null || onCourt.has(p.id)) return "on-court";
    if (reserved.has(p.id)) return "nextup-reserved";
    return null;
  };
  const candidates = players.filter((p) => eligibility(p) === null);
  const aliases = { ...session.fairPlayerIdentities };
  for (const p of players) aliases[p.id] = stablePlayerIdentity(p);
  const decidedAtClient = Date.now();
  // Re-rolling a full Q walks to the next Fair-ranked candidate after the current
  // one; a new Q (or a partial one) passes no cursor and keeps the best.
  const stagedFoursome = targetQ ? queuedIds(targetQ) : [];
  const currentFoursome = stagedFoursome.length === 4 ? stagedFoursome : undefined;
  const plan = planFairMatch(candidates, matches, aliases, currentFoursome);
  const teamA = plan.teamA.map((p) => p.id), teamB = plan.teamB.map((p) => p.id);
  // fair-v4: Fair never mutates fairSkips (that happens when a game is sent).
  // Kept for the log schema (skipTransitions.size == pool.size); every entry is a
  // no-op so the log never claims an increment/reset that did not happen.
  const skipTransitions = candidates.map((p) => ({
    id: p.id, before: p.fairSkips ?? 0, after: p.fairSkips ?? 0, action: "unchanged",
  }));
  const decisionRef = doc(collection(db, "fairLogs")); // allocate once; not a write
  const decision = {
    ...plan.diagnostics, decisionId: decisionRef.id, target: "nextup",
    eventKind: "fair-staging",
    sessionCreatedAt: session.createdAt, revisionBefore: revision, revisionAfter: revision + 1,
    snapshotReadStartedAtClient, decidedAtClient, planningFinishedAtClient: Date.now(),
    historyReady: true, snapshotSource: "server-reads-validated-at-commit",
    previousNextUp, excluded: players.filter((p) => eligibility(p) !== null).map((p) => ({ id: p.id, reason: eligibility(p) })),
    skipTransitions, teamA, teamB,
  };

  await runTransaction(db, async (tx) => {
    const freshSessionSnap = await tx.get(sessionRef);
    const fresh = freshSessionSnap.exists() ? freshSessionSnap.data() as Session : null;
    // Every queue edit bumps fairRevision, so an unchanged revision also proves
    // the queue is exactly the one this decision was computed against.
    if (!fresh?.active || fresh.createdAt !== session.createdAt || (fresh.fairRevision ?? 0) !== revision ||
        fresh.courtCount !== session.courtCount) throw new Error(FAIR_STALE);
    const freshQueue = readQueue(fresh);
    if (targetQueueId) {
      const q = freshQueue.find((x) => x.id === targetQueueId);
      if (!q || !teamsMatch(q, previousNextUp)) throw new Error(FAIR_STALE);
    } else if (freshQueue.length >= MAX_QUEUED_GAMES) {
      throw new Error(FAIR_STALE);
    }
    // Read ALL existing players and games, not just the selected four: fairness
    // depends on those skipped too. Membership changes/new matches bump fairRevision.
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
    const nextQueue = targetQueueId
      ? freshQueue.map((q) => (q.id === targetQueueId ? { id: q.id, teamA, teamB } : q))
      : [...freshQueue, { id: newQueueId(), teamA, teamB }];
    // A Q only earmarks players: nothing is written to player docs here.
    tx.update(sessionRef, {
      fairRevision: revision + 1, fairPlayerIdentities: aliases, gameQueue: nextQueue,
    });
  });

  // Best effort AFTER the staging acknowledges success. Never block the UI
  // on logging, recompute the decision, or put external effects inside a retrying tx.
  const writeLog = async () => {
    await setDoc(decisionRef, { ...decision, assignmentAckAtClient: Date.now(), createdAt: serverTimestamp() });
  };
  void writeLog().catch((error: unknown) => console.warn("[Fair Match] decision log failed", decisionRef.id, error));
}

// ---- Playing games ---------------------------------------------------------

/**
 * Send Q1 to play ("เรียกลงสนาม"). Only Q1, only a full 2v2, and only while the
 * number of running games is below the session's court count. The clock starts
 * immediately; the game gets its own doc (no court number) and Q2 → Q1, Q3 → Q2.
 *
 * fair-v4: fairSkips accounting happens HERE (the real game start): the four
 * who start reset to 0; every other free waiting player — not in any Q, not in a
 * game — is +1. Like the old startGame, the Fair-input revision is pinned from a
 * SERVER read before the transaction and re-checked inside it, so the player
 * enumeration and the count of running games can't be stale: any concurrent
 * send/finish/queue edit bumps the revision and aborts this attempt. A stale
 * abort is retried automatically (each attempt re-validates from scratch).
 * Two devices sending at once: the loser re-reads, finds Q1's id has changed,
 * and stops with a clear message — never a double send.
 */
export async function sendFirstQueuedGame(expectedQueueId: string, sessionCreatedAt: number): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await sendFirstQueuedGameOnce(expectedQueueId, sessionCreatedAt);
      return;
    } catch (e) {
      if (attempt < 2 && e instanceof Error && e.message === SEND_STALE) continue;
      throw e;
    }
  }
}

async function sendFirstQueuedGameOnce(expectedQueueId: string, sessionCreatedAt: number): Promise<void> {
  const sessionSnap = await getDocFromServer(sessionRef);
  if (!sessionSnap.exists()) throw new Error("ไม่พบสนามที่เปิดอยู่");
  if (sessionSnap.metadata.fromCache || sessionSnap.metadata.hasPendingWrites) throw new Error(SEND_STALE);
  const session0 = sessionSnap.data() as Session;
  if (!session0.active || session0.createdAt !== sessionCreatedAt) throw new Error("รอบสนามเปลี่ยนแล้ว กรุณาโหลดใหม่");
  const expectedRevision = session0.fairRevision ?? 0;

  const [playersSnap, gamesSnap] = await Promise.all([getDocsFromServer(playersCol), getDocsFromServer(courtsCol)]);
  if ([playersSnap, gamesSnap].some((snap) => snap.metadata.fromCache || snap.metadata.hasPendingWrites)) {
    throw new Error(SEND_STALE);
  }
  const gameRef = doc(courtsCol);

  await runTransaction(db, async (tx) => {
    const sSnap = await tx.get(sessionRef);
    const s = sSnap.exists() ? (sSnap.data() as Session) : null;
    if (!s?.active || s.createdAt !== sessionCreatedAt) throw new Error("รอบสนามเปลี่ยนแล้ว กรุณาโหลดใหม่");
    const queue = readQueue(s);
    const first = queue[0];
    if (!first || first.id !== expectedQueueId) {
      throw new Error("Q1 เปลี่ยนไปแล้ว (อาจถูกเรียกลงสนามจากอีกเครื่อง) ดูคิวล่าสุดแล้วลองใหม่");
    }
    if ((s.fairRevision ?? 0) !== expectedRevision) throw new Error(SEND_STALE);

    const ids = queuedIds(first);
    if (first.teamA.length !== 2 || first.teamB.length !== 2 || new Set(ids).size !== 4) {
      throw new Error("Q1 ต้องมีผู้เล่นครบ 2 ต่อ 2 (4 คน) ก่อนเรียกลงสนาม");
    }

    // Capacity: count running games. The revision pin guarantees no game doc was
    // created since the server listing, so this count is exact.
    const freshGames = await Promise.all(gamesSnap.docs.map((d) => tx.get(d.ref)));
    const running = freshGames.filter((g) => g.exists() && isRunningGame(g.data() as Omit<Court, "id">)).length;
    if (running >= s.courtCount) {
      throw new Error(`สนามเต็มแล้ว (${running}/${s.courtCount} เกม) จบเกมก่อนแล้วค่อยเรียก Q1`);
    }

    // Read every player FRESH; all checks and writes below come from these reads.
    const fresh = await Promise.all(playersSnap.docs.map((d) => tx.get(d.ref)));
    const byId = new Map(fresh.map((snap) => [snap.id, snap]));
    for (const id of ids) {
      const snap = byId.get(id);
      const p = snap?.exists() ? (snap.data() as Omit<Player, "id">) : null;
      if (!p) throw new Error("ผู้เล่นใน Q1 บางคนหายไปแล้ว");
      if (p.status !== "waiting" || p.courtId != null) throw new Error(`${p.name} ไม่ว่างแล้ว (กำลังเล่นหรือพักอยู่)`);
    }

    const starters = new Set(ids);
    const reserved = new Set(queue.slice(1).flatMap(queuedIds));
    const now = Date.now();
    const seq = (s.gameSeq ?? 0) + 1;

    tx.set(gameRef, { index: seq, teamA: first.teamA, teamB: first.teamB, startedAt: now } satisfies Omit<Court, "id">);
    for (const id of ids) tx.update(playerRef(id), { status: "playing", courtId: gameRef.id, fairSkips: 0 });
    for (const snap of fresh) {
      if (!snap.exists() || starters.has(snap.id) || reserved.has(snap.id)) continue;
      const p = snap.data() as Omit<Player, "id">;
      if (p.status === "waiting" && p.courtId == null) {
        tx.update(playerRef(snap.id), { fairSkips: increment(1) });
      }
    }
    tx.update(sessionRef, { gameQueue: queue.slice(1), gameSeq: seq, fairRevision: increment(1) });
  });
}

/**
 * Cancel a running game ("ยกเลิก") without counting it: no gamesPlayed change,
 * no Match history. Players return to the queue at their ORIGINAL position —
 * queuedAt is left untouched — so the current order isn't disturbed. The game
 * doc is removed, freeing its slot.
 *
 * Re-validates the game the admin saw (teams per side + startedAt) so a stale
 * cancel can't remove a different game. Tolerant for recovery: only players
 * still genuinely in this game are returned. fairSkips set when the game was
 * sent are not reverted (same as the old cancel after start).
 */
export async function cancelGame(
  gameId: string,
  expectedTeamA: string[],
  expectedTeamB: string[],
  expectedStartedAt: number | null,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const gSnap = await tx.get(courtRef(gameId));
    if (!gSnap.exists()) return; // already finished/cancelled elsewhere
    const game = gSnap.data() as Omit<Court, "id">;

    if (
      !sameMembers(game.teamA, expectedTeamA) ||
      !sameMembers(game.teamB, expectedTeamB) ||
      (game.startedAt ?? null) !== (expectedStartedAt ?? null)
    ) {
      throw new Error("เกมนี้เปลี่ยนไปแล้ว ลองใหม่อีกครั้ง");
    }

    const ids = [...game.teamA, ...game.teamB];
    const inThisGame: string[] = [];
    for (const id of ids) {
      const pSnap = await tx.get(playerRef(id));
      if (pSnap.exists() && (pSnap.data() as Omit<Player, "id">).courtId === gameId) {
        inThisGame.push(id);
      }
    }

    tx.delete(courtRef(gameId));
    for (const id of inThisGame) {
      tx.update(playerRef(id), { status: "waiting", courtId: null });
    }
    tx.update(sessionRef, { fairRevision: increment(1) });
  });
}

/**
 * Finish a running game: everyone goes to the BACK of the waiting queue with +1
 * gamesPlayed, the game is recorded for Fair/history, and the game doc is
 * removed. Games finish independently — in any order — without touching the
 * queue or any other running game.
 *
 * Runs in a transaction so a game is counted EXACTLY once. `expectedStartedAt`
 * is the game's startedAt the admin saw; a missing doc or a different
 * startedAt (double tap / another device finished it first) is a SILENT no-op.
 * Once identity matches, a broken invariant (not a real 2v2, or a player whose
 * status/courtId no longer matches this game) THROWS: the game is not counted
 * and the admin is told to cancel instead.
 */
export async function finishGame(gameId: string, expectedStartedAt: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const gSnap = await tx.get(courtRef(gameId));
    if (!gSnap.exists()) return; // already finished — nothing to do

    const game = gSnap.data() as Omit<Court, "id">;
    if (game.startedAt == null || game.startedAt !== expectedStartedAt) return;

    const ids = [...game.teamA, ...game.teamB];
    if (game.teamA.length !== 2 || game.teamB.length !== 2 || new Set(ids).size !== 4) {
      throw new Error("สถานะเกมผิดปกติ (ไม่ใช่ 2 ต่อ 2) — ใช้ปุ่มยกเลิกแทน");
    }
    const identities: Record<string, string> = {};
    for (const id of ids) {
      const pSnap = await tx.get(playerRef(id));
      const p = pSnap.exists() ? (pSnap.data() as Omit<Player, "id">) : null;
      if (!p || p.status !== "playing" || p.courtId !== gameId) {
        throw new Error("สถานะผู้เล่นไม่ตรงกับเกม — ใช้ปุ่มยกเลิกแทน");
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
      courtId: gameId,
      teamA: game.teamA,
      teamB: game.teamB,
      teamAIdentities: game.teamA.map((id) => identities[id]),
      teamBIdentities: game.teamB.map((id) => identities[id]),
      players: ids,
      startedAt: game.startedAt,
      finishedAt: now,
    } satisfies Omit<Match, "id">);
    // Invalidates any Fair plan fetched before this new history document existed.
    tx.update(sessionRef, { fairRevision: increment(1) });
    tx.delete(courtRef(gameId));
  });
}
