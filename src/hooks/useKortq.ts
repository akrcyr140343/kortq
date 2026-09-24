"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeCourts, subscribeMatches, subscribePlayers, subscribeSession } from "@/lib/db";
import type { Court, Match, Player, Session } from "@/lib/types";

const CONNECT_TIMEOUT_MS = 10_000;

/** A queued game (Q1–Q3) with its ids resolved to live players. */
export interface ResolvedQueuedGame {
  id: string;
  number: number; // 1-based Q number = position in line
  teamA: Player[];
  teamB: Player[];
  count: number; // valid players (0–4)
}

export interface KortqState {
  loading: boolean;
  error: string | null;
  session: Session | null;
  players: Player[];
  courts: Court[]; // raw docs of the `courts` subcollection
  games: Court[]; // running games only, oldest first (เกม #n order)
  matches: Match[]; // finished games this session (for fair matchmaking)
  fairHistoryReady: boolean;
  fairHistoryError: string | null;
  waiting: Player[]; // status "waiting", ordered by queue position
  resting: Player[]; // status "resting"
  assignable: Player[]; // waiting MINUS anyone held in a Q (the real pool)
  queue: ResolvedQueuedGame[]; // Q1, Q2, Q3 in order
  playersById: Map<string, Player>;
}

/**
 * Single real-time subscription to the whole session (session doc + players +
 * courts). Any change on any device pushes here without a manual refresh.
 * Surfaces connection errors and a timeout so the UI never hangs on "loading".
 */
export function useKortq(): KortqState {
  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [fairHistoryReady, setFairHistoryReady] = useState(false);
  const [fairHistoryError, setFairHistoryError] = useState<string | null>(null);
  const [ready, setReady] = useState({ session: false, players: false, courts: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fail = (e: Error) => {
      // eslint-disable-next-line no-console
      console.error("[KortQ] Firestore subscription error:", e);
      setError("เชื่อมต่อฐานข้อมูลไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
    };

    const unsubs = [
      subscribeSession((s) => {
        setSession(s);
        setReady((r) => ({ ...r, session: true }));
      }, fail),
      subscribePlayers((p) => {
        setPlayers(p);
        setReady((r) => ({ ...r, players: true }));
      }, fail),
      subscribeCourts((c) => {
        setCourts(c);
        setReady((r) => ({ ...r, courts: true }));
      }, fail),
      // Gate ONLY Fair, leaving manual available. Fair also fetches and validates
      // a fresh server snapshot at every press; it never uses this UI cache to score.
      subscribeMatches((m, serverReady) => {
        setMatches(m);
        setFairHistoryReady(serverReady);
        setFairHistoryError(null);
      }, (e) => {
        console.warn("[KortQ] Fair history unavailable", e);
        setFairHistoryReady(false);
        setFairHistoryError("โหลดประวัติสำหรับจับแฟร์ไม่สำเร็จ กรุณาโหลดหน้าใหม่");
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading = !(ready.session && ready.players && ready.courts);

  // If nothing has connected within the timeout, stop showing "loading" forever.
  useEffect(() => {
    if (!loading || error) return;
    const t = setTimeout(() => {
      setError("เชื่อมต่อฐานข้อมูลช้าเกินไป — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
    }, CONNECT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loading, error]);

  return useMemo(() => {
    const waiting = players.filter((p) => p.status === "waiting");
    const resting = players.filter((p) => p.status === "resting");
    const playersById = new Map(players.map((p) => [p.id, p]));

    // Resolve each queued game, dropping any id that no longer exists (a
    // deleted player mid-flight) so the UI and pool math self-heal.
    const resolve = (ids: string[] | undefined) =>
      (ids ?? []).map((id) => playersById.get(id)).filter((p): p is Player => p != null);
    const queue: ResolvedQueuedGame[] = (session?.active ? session.gameQueue ?? [] : []).map((q, i) => {
      const teamA = resolve(q.teamA);
      const teamB = resolve(q.teamB);
      return { id: q.id, number: i + 1, teamA, teamB, count: teamA.length + teamB.length };
    });
    const stagedIds = new Set(queue.flatMap((q) => [...q.teamA, ...q.teamB].map((p) => p.id)));

    // The real pool every arranging path draws from: waiting minus anyone
    // already earmarked in a Q. A player can only ever be in one Q.
    const assignable = waiting.filter((p) => !stagedIds.has(p.id));

    // Running games: docs that actually hold players (legacy empty court-N docs
    // from an old session are ignored), in the order they were sent.
    const games = courts.filter((c) => c.teamA.length + c.teamB.length > 0);

    return {
      loading,
      error,
      session,
      players,
      courts,
      games,
      matches,
      fairHistoryReady,
      fairHistoryError,
      waiting,
      resting,
      assignable,
      queue,
      playersById,
    };
  }, [loading, error, session, players, courts, matches, fairHistoryReady, fairHistoryError]);
}
