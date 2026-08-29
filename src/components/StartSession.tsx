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
      <div className="animate-fade-in w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-slate-200/60">
        <div className="text-6xl">🏸</div>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-800">ยังไม่มี Session</h1>

        {isAdmin ? (
          <>
            <p className="mt-2 text-slate-500">เลือกจำนวนคอร์ตเพื่อเริ่มวันตีใหม่</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setCourtCount(n)}
                  className={`h-24 rounded-2xl border-2 text-lg font-extrabold transition active:scale-95 ${
                    courtCount === n
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {n} คอร์ต
                </button>
              ))}
            </div>
            <button
              onClick={handleStart}
              disabled={busy}
              className="mt-6 h-14 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-white transition active:scale-[0.98] hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? "กำลังเริ่ม…" : "เริ่ม Session"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-slate-500">รอแอดมินเริ่ม session ข้างสนาม</p>
        )}
      </div>
    </div>
  );
}
