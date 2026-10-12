"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useIsPresent } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import { IconLock } from "./icons";
import { bouncy, popOut } from "./motion";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

export function PinModal({ onClose }: { onClose: () => void }) {
  const { unlock } = useAdmin();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [misses, setMisses] = useState(0); // drives the head-shake only
  const present = useIsPresent();

  // Lock background scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function press(key: string) {
    setError(false);
    if (key === "clear") return setPin("");
    if (key === "back") return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;

    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      // Small delay so the 4th dot renders before we act.
      setTimeout(() => {
        if (unlock(next)) {
          onClose();
        } else {
          setError(true);
          setMisses((m) => m + 1);
          setPin("");
        }
      }, 120);
    }
  }

  // Portal target (document.body) only exists on the client; this modal only
  // ever mounts after a tap, so it never renders during SSR/hydration.
  if (typeof document === "undefined") return null;

  // Rendered through a portal to <body> so the fixed overlay is positioned
  // against the viewport, NOT the header. The header uses `backdrop-blur`, and
  // any ancestor with backdrop-filter/filter/transform becomes the containing
  // block for position:fixed descendants — which would otherwise trap this modal
  // inside the header and clip it. Portalling escapes that context.
  const modal = (
    // Outer element scrolls; inner min-h-dvh flex centers the card when there's
    // room and lets it scroll into view (top reachable) on short/landscape screens.
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: popOut }}
      style={present ? undefined : { pointerEvents: "none" }}
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink/35 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div className="flex min-h-dvh items-center justify-center p-4">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="ใส่ PIN แอดมิน"
          initial={{ opacity: 0, y: 26, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: bouncy }}
          exit={{ opacity: 0, y: 10, scale: 0.96, transition: popOut }}
          className="card relative w-full max-w-[20rem] rounded-[30px] p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* The lock wiggles "no" on a wrong PIN. */}
          <span
            key={`lock-${misses}`}
            className={`sticker grid h-14 w-14 place-items-center rounded-2xl bg-sun text-ink ${misses > 0 ? "anim-wiggle" : "anim-stamp"}`}
            style={{ boxShadow: "0 4px 0 var(--sun-ledge)" }}
          >
            <IconLock className="h-7 w-7" />
          </span>
          <span className="eyebrow mt-5 block text-sun-deep">ADMIN MODE</span>
          <h2 className="mt-1.5 font-display text-title font-semibold text-ink">ใส่ PIN 4 หลัก</h2>

          <p className="mt-1 min-h-5 text-caption" aria-live="polite">
            {error ? (
              <span key={misses} className="anim-status inline-block font-semibold text-tomato-deep">
                PIN ไม่ถูกนะ ลองใหม่อีกที
              </span>
            ) : (
              <span className="text-ink-3">ปลดล็อคเพื่อจัดคิวและจับคู่</span>
            )}
          </p>

          {/* Wrong PIN: the dots shake their head. Each digit lands with a snap. */}
          <div key={misses} className={`my-6 flex justify-center gap-3.5 ${misses > 0 ? "anim-shake" : ""}`} aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={`${i}-${i < pin.length ? "on" : "off"}`}
                className={`h-4 w-4 rounded-full transition-colors duration-150 ${
                  i < pin.length ? "anim-stamp bg-ink shadow-[0_0_0_4px_var(--sun-wash)]" : "bg-sand ring-2 ring-inset ring-line-2"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {KEYS.map((key) => {
              const isText = key === "clear" || key === "back";
              const label = key === "clear" ? "ล้าง" : key === "back" ? "⌫" : key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => press(key)}
                  aria-label={key === "back" ? "ลบตัวเลขล่าสุด" : key === "clear" ? "ล้าง PIN" : key}
                  className={`btn h-14 rounded-2xl px-0 ${isText ? "text-caption text-ink-3" : "font-num text-[1.5rem] font-bold text-ink"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={onClose} className="btn btn-ghost mt-3 h-11 w-full text-caption text-ink-3">
            ไว้ก่อน
          </button>
        </motion.div>
      </div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
