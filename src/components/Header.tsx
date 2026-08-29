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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/75 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-slate-800">
            Kort<span className="text-emerald-500">Q</span>
          </span>
          <span aria-hidden className="text-xl">🏸</span>
          {sessionActive && (
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-500 sm:inline">
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
                  className="h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-600 transition active:scale-95 hover:bg-rose-100"
                >
                  จบ Session
                </button>
              )}
              <span className="flex h-11 items-center gap-1.5 rounded-xl bg-emerald-100 px-3 text-sm font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-live" />
                แอดมิน
              </span>
              <button
                onClick={lock}
                className="h-11 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-600 transition active:scale-95 hover:bg-slate-200"
              >
                ล็อค
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowPin(true)}
              className="flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition active:scale-95 hover:bg-slate-200"
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
