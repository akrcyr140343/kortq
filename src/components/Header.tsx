"use client";

import { useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { PinModal } from "./PinModal";
import type { Session } from "@/lib/types";

export function Header({
  session,
  onEndSession,
}: {
  session: Session | null;
  onEndSession: () => void;
}) {
  const { isAdmin, lock } = useAdmin();
  const [showPin, setShowPin] = useState(false);

  const sessionActive = session?.active ?? false;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight">
            Kort<span className="text-emerald-400">Q</span>
          </span>
          {sessionActive && (
            <span className="hidden text-sm text-neutral-400 sm:inline">
              {session?.courtCount} คอร์ต
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              {sessionActive && (
                <button
                  onClick={onEndSession}
                  className="h-11 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300 active:bg-rose-500/20"
                >
                  จบ Session
                </button>
              )}
              <span className="flex h-11 items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 text-sm font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                แอดมิน
              </span>
              <button
                onClick={lock}
                className="h-11 rounded-xl bg-neutral-800 px-4 text-sm font-semibold active:bg-neutral-700"
              >
                ล็อค
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowPin(true)}
              className="flex h-11 items-center gap-2 rounded-xl bg-neutral-800 px-4 text-sm font-semibold active:bg-neutral-700"
            >
              🔒 ปลดล็อคแอดมิน
            </button>
          )}
        </div>
      </div>

      {showPin && <PinModal onClose={() => setShowPin(false)} />}
    </header>
  );
}
