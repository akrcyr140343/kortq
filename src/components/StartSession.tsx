"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import { startSession } from "@/lib/db";
import { press, staggerDelay } from "./motion";

function CourtChoiceArt({ active }: { active: boolean }) {
  return (
    <div className="relative h-20 w-full max-w-[13rem]" aria-hidden>
      <svg viewBox="0 0 220 84" className="absolute inset-x-0 bottom-0 w-full overflow-visible">
        <defs>
          <linearGradient id={active ? "court-active" : "court-idle"} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={active ? "#62c77a" : "#9ccbb5"} />
            <stop offset="1" stopColor={active ? "#249d6f" : "#6db197"} />
          </linearGradient>
        </defs>
        <path d="M42 18h136l31 55H11l31-55Z" fill={`url(#${active ? "court-active" : "court-idle"})`} stroke="#147858" strokeWidth="2" />
        <path d="M42 18 11 73M178 18l31 55M110 18v55M24 51h172M68 18 55 73M152 18l13 55" fill="none" stroke="white" strokeOpacity=".82" strokeWidth="1.5" />
        <path d="M36 28h148" stroke="#0b6047" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

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
    <div className="start-hero flex flex-1 items-start justify-center px-4 pb-12 pt-8 sm:px-6 sm:pt-10 lg:pt-12">
      <div className="anim-enter relative flex w-full max-w-[47rem] flex-col items-center text-center">
        <span className="anim-enter rounded-full border border-[#80bd88] bg-white/60 px-5 py-2 text-[0.7rem] font-extrabold tracking-[0.2em] text-[#5e9d61] shadow-sm backdrop-blur-md" style={staggerDelay(1)}>
          KD CLUB · LET&apos;S PLAY
        </span>

        <h1 className="anim-enter display sport-title relative mt-5 text-[2.65rem] font-extrabold leading-[1.05] text-accent-deep drop-shadow-[0_2px_0_rgba(255,255,255,.8)] sm:text-[3.9rem]" style={staggerDelay(2)}>
          {isAdmin ? "เปิดสนามกันเลย!" : "ยังไม่เปิดสนาม"}
        </h1>

        <p className="anim-enter mt-6 max-w-xl text-body font-semibold leading-relaxed text-ink-2 sm:text-lede" style={staggerDelay(3)}>
          {isAdmin ? "เลือกจำนวนคอร์ตวันนี้ แล้วเริ่มจัดคิวได้เลย 🏸" : "รอแอดมินเปิดสนามอยู่นะ อีกเดี๋ยวก็ได้ตีแล้ว"}
        </p>

        {isAdmin && (
          <div className="w-full max-w-[42rem]">
            <div className="anim-enter mt-7 grid grid-cols-2 gap-3 sm:gap-5" style={staggerDelay(4)}>
              {[2, 3].map((n) => {
                const active = courtCount === n;
                return (
                  <motion.button
                    key={n}
                    whileTap={press}
                    onClick={() => setCourtCount(n)}
                    className={`choice-card relative flex h-[13.5rem] flex-col items-center justify-center overflow-hidden rounded-[28px] border-2 px-4 transition-all duration-200 sm:h-[14.5rem] ${
                      active
                        ? "-translate-y-1 border-[#68b97a] bg-[#f3fff0]/92 shadow-[0_24px_50px_-26px_rgba(21,125,79,.65)]"
                        : "border-white/80 bg-white/76 shadow-[0_18px_44px_-30px_rgba(16,76,59,.42)] hover:-translate-y-0.5 hover:border-[#9ec9b2] hover:bg-white/90"
                    }`}
                  >
                    <span className={`absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border-2 text-sm font-black ${active ? "border-[#63bf53] bg-[#65c51f] text-white" : "border-[#9bbdb1] text-transparent"}`}>
                      ✓
                    </span>
                    <CourtChoiceArt active={active} />
                    <span className={`numeral mt-3 text-[3rem] leading-none ${active ? "text-accent-deep" : "text-[#234c4b]"}`}>{String(n).padStart(2, "0")}</span>
                    <span className="mt-1 text-sm font-bold text-ink-3">คอร์ต</span>
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              whileTap={press}
              onClick={handleStart}
              disabled={busy}
              style={staggerDelay(5)}
              className="play-button shine-button anim-enter relative mt-5 flex h-16 w-full items-center justify-center gap-4 rounded-full px-6 text-lede font-extrabold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:bg-none disabled:bg-line disabled:text-ink-4 disabled:shadow-none"
            >
              <span aria-hidden className="text-3xl drop-shadow-sm">🏸</span>
              <span>{busy ? "กำลังเปิดสนาม…" : "เปิดสนามเลย!"}</span>
              <span aria-hidden className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-white/20 text-2xl">→</span>
            </motion.button>
            <p className="anim-enter mt-5 text-[0.66rem] font-extrabold tracking-[0.22em] text-[#6e8e88]" style={staggerDelay(6)}>
              MORE GAMES · MORE FRIENDS · A HAPPIER YOU
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
