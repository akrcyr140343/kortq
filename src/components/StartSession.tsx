"use client";

import { useState, type CSSProperties } from "react";
import { useAdmin } from "@/context/AdminContext";
import { startSession } from "@/lib/db";
import { CourtArt, ShuttleBuddy } from "./art";
import { IconArrowRight, IconCheck } from "./icons";
import { staggerDelay } from "./motion";

/** Words that rise out of a mask one after another. */
function Kinetic({ words, start = 0, className = "" }: { words: string[]; start?: number; className?: string }) {
  return (
    <>
      {words.map((w, i) => (
        <span key={i} className="kq-word">
          <span className={className} style={{ animationDelay: `${(start + i * 0.09).toFixed(2)}s` }}>
            {w}
          </span>
        </span>
      ))}
    </>
  );
}

/** Soft colour shapes drifting behind the title — the club's confetti at rest. */
const SHAPES: Array<{ cls: string; style: CSSProperties }> = [
  { cls: "left-[4%] top-[6%] h-28 w-28 rounded-full bg-lime/70", style: { ["--fd" as string]: "8s", ["--fx" as string]: "10px", ["--fy" as string]: "-16px" } },
  { cls: "right-[6%] top-[10%] h-20 w-20 rounded-[28%] bg-sky/45 rotate-12", style: { ["--fd" as string]: "10s", ["--fx" as string]: "-12px", ["--fy" as string]: "14px" } },
  { cls: "right-[14%] top-[52%] h-14 w-14 rounded-full bg-coral/45", style: { ["--fd" as string]: "7s", ["--fx" as string]: "8px", ["--fy" as string]: "-12px" } },
  { cls: "left-[10%] top-[60%] h-16 w-16 rounded-[30%] bg-sun/60 -rotate-12", style: { ["--fd" as string]: "11s", ["--fx" as string]: "-8px", ["--fy" as string]: "-10px" } },
];

export function StartSession({
  onLaunch,
  onLaunchSettled,
}: {
  // Fired the instant "เปิดสนามเลย!" is pressed — before the write even starts —
  // so the launch curtain (owned by the page, so it can outlive this component
  // once the session flips active and swaps StartSession out) can begin right
  // on the tap. The DB call and its guard below are unchanged.
  onLaunch?: (courtCount: number, origin: { x: number; y: number }) => void;
  onLaunchSettled?: (ok: boolean, message?: string) => void;
} = {}) {
  const { isAdmin } = useAdmin();
  const [courtCount, setCourtCount] = useState(2);
  const [busy, setBusy] = useState(false);

  async function handleStart(e: React.MouseEvent<HTMLButtonElement>) {
    onLaunch?.(courtCount, { x: e.clientX, y: e.clientY });
    setBusy(true);
    try {
      await startSession(courtCount);
      onLaunchSettled?.(true);
    } catch (err) {
      onLaunchSettled?.(false, err instanceof Error ? err.message : undefined);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex flex-1 justify-center overflow-hidden px-4 pb-14 pt-8 sm:px-6 sm:pt-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {SHAPES.map((s, i) => (
          <span key={i} className={`anim-float absolute ${s.cls}`} style={s.style} />
        ))}
      </div>

      <div className="relative grid w-full max-w-[64rem] items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        {/* ── Title ─────────────────────────────────────────────── */}
        <div className="text-center lg:text-left">
          <span className="eyebrow anim-fade inline-flex items-center gap-2 rounded-full bg-paper px-3 py-2 text-ink-2 shadow-soft">
            <span aria-hidden className={`h-2 w-2 rounded-full ${isAdmin ? "live-dot bg-court" : "bg-lilac"}`} />
            KD CLUB · {isAdmin ? "TONIGHT" : "LIGHTS OFF"}
          </span>
          <h1 className="display mt-5 text-[3rem] leading-[0.98] text-ink sm:text-[4.25rem] lg:text-mega">
            {isAdmin ? (
              <>
                <Kinetic words={["เปิดสนาม"]} start={0.05} />
                <br />
                <Kinetic words={["กันเลย!"]} start={0.16} className="rounded-2xl bg-lime px-3" />
              </>
            ) : (
              <>
                <Kinetic words={["ยังไม่"]} start={0.05} />
                <br />
                <Kinetic words={["เปิดสนาม"]} start={0.14} className="rounded-2xl bg-lilac-wash px-3 text-lilac-deep" />
              </>
            )}
          </h1>
          <p className="anim-rise mx-auto mt-5 max-w-md text-body text-ink-2 sm:text-lede lg:mx-0" style={staggerDelay(4)}>
            {isAdmin ? "เลือกจำนวนคอร์ตวันนี้ แล้วเริ่มจัดคิวได้เลย" : "รอแอดมินเปิดสนามอยู่นะ อีกเดี๋ยวก็ได้ตีแล้ว"}
          </p>
        </div>

        {/* ── Court picker / waiting card ───────────────────────── */}
        {isAdmin ? (
          <div className="anim-rise mx-auto w-full max-w-[30rem] rounded-[36px] bg-paper p-4 shadow-lift sm:p-5" style={staggerDelay(3)}>
            <span className="eyebrow block px-1 text-ink-3">วันนี้กี่คอร์ต?</span>
            <div className="mt-3 grid grid-cols-2 gap-3" role="group" aria-label="จำนวนคอร์ต">
              {[2, 3].map((n) => {
                const active = courtCount === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCourtCount(n)}
                    aria-pressed={active}
                    className={`relative flex flex-col items-center rounded-[26px] px-3 pb-3 pt-4 transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95 ${
                      active ? "-rotate-1 bg-lime shadow-lift" : "bg-mist hover:-translate-y-1"
                    }`}
                  >
                    <span
                      key={active ? "on" : "off"}
                      aria-hidden
                      className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full ${
                        active ? "anim-stamp bg-ink text-lime" : "bg-paper text-transparent"
                      }`}
                    >
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                    <span className="num text-[4rem] leading-[0.9] text-ink">{n}</span>
                    <span className="font-display text-caption font-medium text-ink-2">คอร์ต</span>
                    {/* One mini court per court — they light up when chosen. */}
                    <span key={active ? "lit" : "dim"} className="mt-3 grid w-full grid-cols-3 gap-1">
                      {Array.from({ length: n }, (_, i) => (
                        <span key={i} className={active ? "anim-hop-in" : ""} style={active ? staggerDelay(i, 0.07) : undefined}>
                          <CourtArt lit={active} />
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* The entrance lives on the card so it never fights the button's
                own busy-shine animation. */}
            <button
              type="button"
              onClick={handleStart}
              disabled={busy}
              className={`btn btn-ink ${busy ? "is-busy" : "pulse-ring"} mt-4 h-16 w-full justify-between pl-6 pr-2 text-lede`}
              style={{ ["--ring" as string]: "rgba(25,26,40,0.3)" }}
            >
              <span>{busy ? "กำลังเปิดสนาม…" : "เปิดสนามเลย!"}</span>
              <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-lime text-ink">
                <IconArrowRight className="h-5 w-5" />
              </span>
            </button>
            <p className="eyebrow mt-4 text-center text-ink-4">MORE GAMES · MORE FRIENDS · A HAPPIER YOU</p>
          </div>
        ) : (
          <div className="anim-rise mx-auto flex w-full max-w-sm flex-col items-center rounded-[36px] bg-paper p-6 text-center shadow-lift" style={staggerDelay(3)}>
            <span className="relative">
              <ShuttleBuddy className="h-20 w-20" mood="sleepy" />
              <span aria-hidden className="anim-zzz num absolute -right-1 -top-2 text-caption text-lilac-deep">z</span>
              <span aria-hidden className="anim-zzz num absolute -right-4 -top-5 text-body text-lilac-deep" style={{ animationDelay: "0.8s" }}>
                Z
              </span>
            </span>
            <div className="mt-3 w-40">
              <CourtArt lit={false} />
            </div>
            <p className="display mt-4 text-body text-ink">สนามยังปิดไฟอยู่</p>
            <p className="mt-1 text-caption text-ink-3">เปิดเมื่อไหร่ หน้านี้จะเปลี่ยนเองทันที ไม่ต้องรีเฟรช</p>
          </div>
        )}
      </div>
    </div>
  );
}
