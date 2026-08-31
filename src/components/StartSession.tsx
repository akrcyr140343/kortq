"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import { startSession } from "@/lib/db";
import { press, staggerDelay } from "./motion";
import { E3 } from "./ui";

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
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
      <div className={`${E3} anim-enter relative w-full max-w-2xl overflow-hidden rounded-[32px] p-6 sm:p-9`}>
        <div aria-hidden className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-mint-wash blur-2xl" />
        <div aria-hidden className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-coral-wash blur-2xl" />
        <div className="anim-pop relative mb-5 grid h-16 w-16 place-items-center overflow-hidden rounded-[22px] bg-white shadow-[0_18px_34px_-16px_rgba(29,51,34,0.55)]">
          <Image src="/kd-logo.png" alt="โลโก้ KD KHONDEE-TEEBAD" fill sizes="64px" className="object-cover" priority />
        </div>

        <span className="anim-enter relative block text-xs font-extrabold tracking-[0.18em] text-mint-deep" style={staggerDelay(1)}>
          KD CLUB · LET&apos;S PLAY
        </span>

        <h1
          className="anim-enter display relative mt-3 text-h2 leading-[1.05] text-ink sm:text-h1"
          style={staggerDelay(2)}
        >
          {isAdmin ? "เปิดสนามกันเลย" : "ยังไม่เปิดสนาม"}
        </h1>

        <p className="anim-enter relative mt-3 max-w-md text-body leading-relaxed text-ink-2 sm:text-lede" style={staggerDelay(3)}>
          {isAdmin
            ? "เลือกจำนวนคอร์ตวันนี้ แล้วเริ่มจัดคิวได้เลย 🏸"
            : "รอแอดมินเปิดสนามอยู่นะ อีกเดี๋ยวก็ได้ตีแล้ว"}
        </p>

        {isAdmin && (
          <>
            <div className="anim-enter relative mt-7 grid grid-cols-2 gap-3" style={staggerDelay(4)}>
              {[2, 3].map((n) => {
                const active = courtCount === n;
                return (
                  <motion.button
                    key={n}
                    whileTap={press}
                    onClick={() => setCourtCount(n)}
                    className={`relative flex h-32 flex-col items-center justify-center overflow-hidden rounded-[22px] border transition-all duration-200 ${
                      active
                        ? "-translate-y-1 border-mint-deep/25 bg-mint-wash shadow-[0_18px_28px_-18px_rgba(84,117,0,0.55)]"
                        : "border-line bg-surface-2 hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute inset-4 rounded-[12px] border ${
                        active ? "border-mint-deep/25" : "border-line-2/70"
                      }`}
                    />
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute inset-y-4 left-1/2 w-px ${
                        active ? "bg-mint-deep/25" : "bg-line-2"
                      }`}
                    />
                    <span
                      className={`numeral relative text-h3 leading-none ${
                        active ? "text-mint-deep" : "text-ink"
                      }`}
                    >
                      {String(n).padStart(2, "0")}
                    </span>
                    <span className="eyebrow relative mt-2 text-ink-3">คอร์ต</span>
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              whileTap={press}
              onClick={handleStart}
              disabled={busy}
              style={staggerDelay(5)}
              className="lime-button shine-button anim-enter relative mt-3 h-14 w-full rounded-[18px] text-body font-extrabold transition-all duration-200 hover:-translate-y-0.5 disabled:bg-none disabled:bg-line disabled:text-ink-4 disabled:shadow-none"
            >
              {busy ? "กำลังเปิดสนาม…" : "เปิดสนาม — ลุยเลย!  →"}
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
