"use client";

import { useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { startSession } from "@/lib/db";

export function StartSession() {
  const { isAdmin } = useAdmin();
  const [courtCount, setCourtCount] = useState(2);
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    setBusy(true);
    try {
      await startSession(courtCount);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-900/60 p-8 text-center">
        <div className="text-5xl">🏸</div>
        <h1 className="mt-4 text-2xl font-bold">ยังไม่มี Session</h1>

        {isAdmin ? (
          <>
            <p className="mt-2 text-neutral-400">เลือกจำนวนคอร์ตเพื่อเริ่มวันตีใหม่</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setCourtCount(n)}
                  className={`h-24 rounded-2xl border text-lg font-bold transition ${
                    courtCount === n
                      ? "border-emerald-400 bg-emerald-500/15 text-emerald-300"
                      : "border-white/10 bg-neutral-800 text-neutral-300 active:bg-neutral-700"
                  }`}
                >
                  {n} คอร์ต
                </button>
              ))}
            </div>
            <button
              onClick={handleStart}
              disabled={busy}
              className="mt-6 h-14 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-neutral-950 active:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? "กำลังเริ่ม…" : "เริ่ม Session"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-neutral-400">รอแอดมินเริ่ม session ข้างสนาม</p>
        )}
      </div>
    </div>
  );
}
