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
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink/30 backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div className="flex min-h-dvh items-center justify-center p-4">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="ใส่ PIN แอดมิน"
          initial={{ opacity: 0, y: 40, scale: 0.9, rotate: 2 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, transition: bouncy }}
          exit={{ opacity: 0, y: 14, scale: 0.96, transition: popOut }}
          className="relative w-full max-w-[21rem] overflow-hidden rounded-[36px] bg-paper p-5 shadow-lift"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            {/* The lock wiggles "no" on a wrong PIN. */}
            <span
              key={`lock-${misses}`}
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-full bg-lime text-ink ${misses > 0 ? "anim-wiggle" : "anim-stamp"}`}
            >
              <IconLock className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <span className="eyebrow block text-ink-3">ADMIN MODE</span>
              <h2 className="display mt-1 text-title text-ink">ใส่ PIN 4 หลัก</h2>
            </div>
          </div>

          <p className="mt-3 min-h-5 text-caption" aria-live="polite">
            {error ? (
              <span key={misses} className="anim-status inline-block font-semibold text-danger-deep">
                PIN ไม่ถูกนะ ลองใหม่อีกที
              </span>
            ) : (
              <span className="text-ink-3">ปลดล็อคเพื่อจัดคิวและจับคู่</span>
            )}
          </p>

          {/* Wrong PIN: the dots shake their head. Each digit lands with a hop. */}
          <div key={misses} className={`my-5 flex justify-center gap-3 ${misses > 0 ? "anim-shake" : ""}`} aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={`${i}-${i < pin.length ? "on" : "off"}`}
                className={`grid h-12 w-12 place-items-center rounded-2xl transition-colors duration-150 ${
                  i < pin.length ? "anim-hop-in bg-ink" : "bg-mist"
                }`}
              >
                {i < pin.length && <span className="h-3 w-3 rounded-full bg-lime" />}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((key) => {
              const isText = key === "clear" || key === "back";
              const label = key === "clear" ? "ล้าง" : key === "back" ? "⌫" : key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => press(key)}
                  aria-label={key === "back" ? "ลบตัวเลขล่าสุด" : key === "clear" ? "ล้าง PIN" : key}
                  className={`btn h-14 rounded-[20px] px-0 ${isText ? "btn-ghost text-caption text-ink-3" : "bg-mist! num text-[1.5rem] text-ink shadow-none!"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={onClose} className="btn btn-ghost mt-2 h-11 w-full text-caption text-ink-3">
            ไว้ก่อน
          </button>
        </motion.div>
      </div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
