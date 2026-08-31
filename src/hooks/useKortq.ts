"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeCourts, subscribeMatches, subscribePlayers, subscribeSession } from "@/lib/db";
import type { Court, Match, Player, Session } from "@/lib/types";

const CONNECT_TIMEOUT_MS = 10_000;

export interface KortqState {
  loading: boolean;
  error: string | null;
  session: Session | null;
  players: Player[];
  courts: Court[];
  matches: Match[]; // finished games this session (for fair matchmaking)
  waiting: Player[]; // status "waiting", ordered by queue position
  resting: Player[]; // status "resting"
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
      // Match history is optional context for fair matchmaking — don't gate
      // initial loading on it, and don't fail the whole app if it errors.
      subscribeMatches(setMatches),
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
    return {
      loading,
      error,
      session,
      players,
      courts,
      matches,
      waiting,
      resting,
      playersById,
    };
  }, [loading, error, session, players, courts, matches]);
}
