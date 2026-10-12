"use client";

import { useState } from "react";
import Image from "next/image";
import { useAdmin } from "@/context/AdminContext";
import { startSession } from "@/lib/db";
import { CourtArt, ShuttleBuddy } from "./art";
import { IconArrowRight, IconCheck } from "./icons";
import { staggerDelay } from "./motion";

/** The illustrated "title screen": sunny court, two players mid-rally. */
function HeroScene() {
  return (
    <div className="anim-rise relative h-[15.5rem] w-full overflow-hidden rounded-[32px] border-2 border-line bg-sky-wash shadow-[0_4px_0_var(--line-2)] sm:h-[19rem]">
      <Image
        src="/kortq-court-bg-clean.webp"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 46rem"
        className="object-cover object-[50%_72%]"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/50 to-transparent" />

      <span
        className="sticker chip anim-pop absolute left-1/2 top-4 -translate-x-1/2 bg-paper/95 px-3.5 py-2 text-ink-2 ring-2 ring-line"
        style={{ ...staggerDelay(3), ["--tilt" as string]: "-3deg" }}
      >
        <span className="eyebrow text-teal-deep">KD CLUB · LET&apos;S PLAY</span>
      </span>

      {/* The shuttle buddy floats over the net between them. */}
      <span
        aria-hidden
        className="anim-bob absolute left-1/2 top-[34%] -ml-6"
        style={{ ["--bob-y" as string]: "-12px", ["--bob-r" as string]: "10deg", ["--bob-d" as string]: "2.8s" }}
      >
        <ShuttleBuddy className="h-12 w-12 drop-shadow-[0_6px_6px_rgba(91,62,24,0.25)]" mood="wow" />
      </span>

      <div
        aria-hidden
        className="anim-bob absolute -bottom-3 -left-2 sm:left-6"
        style={{ ["--bob-y" as string]: "-6px", ["--bob-d" as string]: "4.6s" }}
      >
        <Image
          src="/kortq-mascot-female.webp"
          alt=""
          width={651}
          height={1100}
          priority
          className="h-[14.5rem] w-auto drop-shadow-[0_10px_12px_rgba(20,80,90,0.25)] sm:h-[18.5rem]"
        />
      </div>
      <div
        aria-hidden
        className="anim-bob absolute -bottom-2 -right-1 sm:right-6"
        style={{ ["--bob-y" as string]: "-14px", ["--bob-d" as string]: "3.6s" }}
      >
        <Image
          src="/kortq-mascot-male.webp"
          alt=""
          width={598}
          height={1100}
          priority
          className="h-[15rem] w-auto drop-shadow-[0_10px_12px_rgba(20,80,90,0.25)] sm:h-[19rem]"
        />
      </div>
    </div>
  );
}

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
    <div className="flex flex-1 justify-center px-3 pb-14 pt-3 sm:px-6 sm:pt-6">
      <div className="flex w-full max-w-[46rem] flex-col items-center text-center">
        <HeroScene />

        <h1
          className="anim-rise mt-6 font-display text-[2.375rem] font-semibold leading-[1.1] text-ink sm:text-h1"
          style={staggerDelay(2)}
        >
          {isAdmin ? (
            <>
              <span className="marker">เปิดสนาม</span>กันเลย!
            </>
          ) : (
            <>
              ยัง<span className="marker" style={{ ["--marker" as string]: "var(--lilac)" }}>ไม่เปิดสนาม</span>
            </>
          )}
        </h1>

        <p className="anim-rise mt-3 max-w-md text-body text-ink-2 sm:text-lede" style={staggerDelay(3)}>
          {isAdmin ? "เลือกจำนวนคอร์ตวันนี้ แล้วเริ่มจัดคิวได้เลย 🏸" : "รอแอดมินเปิดสนามอยู่นะ อีกเดี๋ยวก็ได้ตีแล้ว"}
        </p>

        {isAdmin ? (
          <div className="w-full max-w-[34rem]">
            <div className="anim-rise mt-6 grid grid-cols-2 gap-3 sm:gap-4" style={staggerDelay(4)} role="group" aria-label="จำนวนคอร์ต">
              {[2, 3].map((n) => {
                const active = courtCount === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCourtCount(n)}
                    aria-pressed={active}
                    className={`card relative flex flex-col items-center rounded-[26px] px-3 pb-4 pt-6 transition-[translate,border-color,box-shadow] duration-200 active:translate-y-0.5 ${
                      active ? "card-next -translate-y-1" : "hover:-translate-y-0.5"
                    }`}
                  >
                    {/* Choosing a count stamps the tick and lights its court. */}
                    <span
                      key={active ? "on" : "off"}
                      aria-hidden
                      className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full ${
                        active ? "anim-stamp bg-teal text-ink shadow-[0_2px_0_var(--teal-ledge)]" : "bg-sand text-transparent ring-2 ring-inset ring-line-2"
                      }`}
                    >
                      <IconCheck className="h-4 w-4" />
                    </span>
                    <span key={active ? "lit" : "dim"} className={`block w-full max-w-[10rem] ${active ? "anim-pop" : ""}`}>
                      <CourtArt lit={active} />
                    </span>
                    <span className={`num mt-1 text-[2.75rem] leading-none ${active ? "text-ink" : "text-ink-3"}`}>{n}</span>
                    <span className="font-display text-caption font-medium text-ink-3">คอร์ต</span>
                  </button>
                );
              })}
            </div>

            {/* The entrance lives on a wrapper so it never fights the button's
                own busy-shine animation. */}
            <div className="anim-rise mt-5" style={staggerDelay(5)}>
              <button
                type="button"
                onClick={handleStart}
                disabled={busy}
                className={`btn btn-teal ${busy ? "is-busy" : "pulse-ring"} h-16 w-full rounded-[22px] text-lede`}
              >
                <ShuttleBuddy className="-my-2 h-10 w-10" />
                <span>{busy ? "กำลังเปิดสนาม…" : "เปิดสนามเลย!"}</span>
                <span aria-hidden className="absolute right-3 grid h-10 w-10 place-items-center rounded-full bg-ink/10">
                  <IconArrowRight className="h-5 w-5" />
                </span>
              </button>
            </div>
            <p className="eyebrow anim-fade mt-5 text-ink-3" style={staggerDelay(7)}>
              MORE GAMES · MORE FRIENDS · A HAPPIER YOU
            </p>
          </div>
        ) : (
          <div
            className="card anim-rise mt-6 flex w-full max-w-sm items-center gap-4 rounded-[26px] px-5 py-4 text-left"
            style={staggerDelay(4)}
          >
            <span className="relative shrink-0">
              <ShuttleBuddy className="h-14 w-14" mood="sleepy" />
              <span aria-hidden className="anim-zzz num absolute -right-1 -top-2 text-caption text-lilac-deep">z</span>
              <span
                aria-hidden
                className="anim-zzz num absolute -right-3.5 -top-4 text-body text-lilac-deep"
                style={{ animationDelay: "0.8s" }}
              >
                Z
              </span>
            </span>
            <div className="min-w-0">
              <p className="font-display text-body font-medium text-ink">สนามยังปิดไฟอยู่</p>
              <p className="mt-0.5 text-caption text-ink-3">เปิดเมื่อไหร่ หน้านี้จะเปลี่ยนเองทันที ไม่ต้องรีเฟรช</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
