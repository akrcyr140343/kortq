import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { SKILL_SCORE, type Court, type Player, type Session, type Skill, type PlayerStatus } from "./types";
import { balanceTeams, shuffle } from "./matchmaking";

// ---- Firestore paths -------------------------------------------------------
// A single active session lives at sessions/current, with players and courts
// as subcollections. Ending a session wipes both subcollections.
const SESSION_ID = "current";
const sessionRef = doc(db, "sessions", SESSION_ID);
const playersCol = collection(db, "sessions", SESSION_ID, "players");
const courtsCol = collection(db, "sessions", SESSION_ID, "courts");
const playerRef = (id: string) => doc(db, "sessions", SESSION_ID, "players", id);
const courtRef = (id: string) => doc(db, "sessions", SESSION_ID, "courts", id);

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

export function subscribePlayers(
  cb: (players: Player[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(playersCol, orderBy("queuedAt", "asc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Player, "id">) }))),
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

// ---- Helpers ---------------------------------------------------------------

async function deleteAll(): Promise<void> {
  const [playersSnap, courtsSnap] = await Promise.all([
    getDocs(playersCol),
    getDocs(courtsCol),
  ]);
  // Firestore batches cap at 500 ops; our data is tiny (~21 players + 3 courts).
  const batch = writeBatch(db);
  playersSnap.forEach((d) => batch.delete(d.ref));
  courtsSnap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ---- Session ---------------------------------------------------------------

export async function startSession(courtCount: number): Promise<void> {
  await deleteAll(); // fresh start — clear any leftovers
  const batch = writeBatch(db);
  batch.set(sessionRef, {
    active: true,
    courtCount,
    createdAt: Date.now(),
    feePerHead: 0,
  } satisfies Session);
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
  await deleteAll();
  await setDoc(sessionRef, { active: false, courtCount: 0, createdAt: Date.now() } satisfies Session);
}

// ---- Players ---------------------------------------------------------------

export async function addPlayer(name: string, skill: Skill): Promise<void> {
  const now = Date.now();
  const ref = doc(playersCol);
  await setDoc(ref, {
    name: name.trim(),
    skill,
    score: SKILL_SCORE[skill],
    status: "waiting",
    courtId: null,
    gamesPlayed: 0,
    createdAt: now,
    queuedAt: now,
    paid: false,
    paidAt: null,
  } satisfies Omit<Player, "id">);
}

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
    tx.delete(playerRef(id));
  });
}

/**
 * Move a player between the "waiting" and "resting" pools.
 * Re-entering the queue pushes them to the back (queuedAt refreshed).
 */
export async function setPlayerResting(id: string, resting: boolean): Promise<void> {
  const status: PlayerStatus = resting ? "resting" : "waiting";
  await setDoc(
    playerRef(id),
    { status, queuedAt: Date.now(), courtId: null },
    { merge: true },
  );
}

// ---- Payments --------------------------------------------------------------
// Manual, admin-verified settlement. No bank API: the admin sees a slip in the
// LINE group and flips the player's status here. Rides the existing player
// subscription, so every device updates in real time.

/** Set the per-head court fee for the current session (baht). */
export async function setSessionFee(feePerHead: number): Promise<void> {
  await setDoc(sessionRef, { feePerHead: Math.max(0, Math.round(feePerHead)) }, { merge: true });
}

/** Flip one player's payment status (paid ⇄ unpaid). */
export async function setPlayerPaid(id: string, paid: boolean): Promise<void> {
  await setDoc(playerRef(id), { paid, paidAt: paid ? Date.now() : null }, { merge: true });
}

/** Clear every player's payment status — a fresh collection round. */
export async function resetPayments(players: Player[]): Promise<void> {
  const batch = writeBatch(db);
  for (const p of players) {
    batch.update(playerRef(p.id), { paid: false, paidAt: null });
  }
  await batch.commit();
}

// ---- Matchmaking -----------------------------------------------------------

/** Assign a specific set of players to a court and split them into teams. */
export async function assignToCourt(targetCourtId: string, players: Player[]): Promise<void> {
  const { teamA, teamB } = balanceTeams(players);
  const batch = writeBatch(db);
  batch.update(courtRef(targetCourtId), {
    teamA: teamA.map((p) => p.id),
    teamB: teamB.map((p) => p.id),
    startedAt: Date.now(),
  });
  for (const p of players) {
    batch.update(playerRef(p.id), { status: "playing", courtId: targetCourtId });
  }
  await batch.commit();
}

/**
 * Auto-fill an empty court with the 4 longest-waiting players, balanced into
 * two evenly matched teams. Throws if fewer than 4 players are waiting.
 */
export async function autoAssign(targetCourtId: string, waiting: Player[]): Promise<void> {
  if (waiting.length < 4) {
    throw new Error("ต้องมีผู้เล่นในคิว 'รอ' อย่างน้อย 4 คน");
  }
  const four = waiting.slice(0, 4); // waiting is already ordered by queuedAt
  await assignToCourt(targetCourtId, four);
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
 * Remove players from a court without counting a game — for fixing a
 * mis-assignment. Players return to their original queue position (queuedAt
 * is not updated) and gamesPlayed is not incremented.
 */
export async function removeFromCourt(targetCourtId: string, playersOnCourt: Player[]): Promise<void> {
  const batch = writeBatch(db);
  batch.update(courtRef(targetCourtId), { teamA: [], teamB: [], startedAt: null });
  for (const p of playersOnCourt) {
    batch.update(playerRef(p.id), { status: "waiting", courtId: null });
  }
  await batch.commit();
}

/**
 * End the game on a court: everyone goes back to the waiting queue and their
 * gamesPlayed count is incremented by 1.
 */
export async function finishGame(targetCourtId: string, playersOnCourt: Player[]): Promise<void> {
  const now = Date.now();
  const batch = writeBatch(db);
  batch.update(courtRef(targetCourtId), { teamA: [], teamB: [], startedAt: null });
  for (const p of playersOnCourt) {
    // Push finished players to the back of the queue for fairness, +1 game.
    batch.update(playerRef(p.id), {
      status: "waiting",
      courtId: null,
      queuedAt: now,
      gamesPlayed: increment(1),
    });
  }
  await batch.commit();
}
