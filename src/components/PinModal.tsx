"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useAdmin } from "@/context/AdminContext";
import { press as tapPress } from "./motion";
import { E3 } from "./ui";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

export function PinModal({ onClose }: { onClose: () => void }) {
  const { unlock } = useAdmin();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal target (document.body) only exists on the client.
  useEffect(() => setMounted(true), []);

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
          setPin("");
        }
      }, 120);
    }
  }

  if (!mounted) return null;

  // Rendered through a portal to <body> so the fixed overlay is positioned
  // against the viewport, NOT the header. The header uses `backdrop-blur`, and
  // any ancestor with backdrop-filter/filter/transform becomes the containing
  // block for position:fixed descendants — which would otherwise trap this modal
  // inside the header and clip it. Portalling escapes that context.
  const modal = (
    // Outer element scrolls; inner min-h-dvh flex centers the card when there's
    // room and lets it scroll into view (top reachable) on short/landscape screens.
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-accent-deep/35 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="flex min-h-dvh items-center justify-center p-4">
        <div
          className={`${E3} anim-pop relative w-full max-w-xs overflow-hidden rounded-[28px] p-6`}
          onClick={(e) => e.stopPropagation()}
        >
          <div aria-hidden className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-mint-wash blur-2xl" />
          <span className="relative grid h-12 w-12 place-items-center rounded-[16px] bg-accent text-xl text-mint">KD</span>
          <span className="relative mt-4 block text-xs font-extrabold tracking-[0.14em] text-mint-deep">โหมดแอดมิน</span>
          <h2 className="display relative mt-2 text-title leading-none text-ink">ใส่ PIN 4 หลัก</h2>

          <p className="relative mt-2 text-caption">
            {error ? (
              <span className="font-semibold text-alert">PIN ไม่ถูกนะ ลองใหม่อีกที</span>
            ) : (
              <span className="text-ink-3">ปลดล็อคเพื่อจัดคิวและจับคู่</span>
            )}
          </p>

          <div className="relative my-6 flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-3 w-3 rounded-full transition-all duration-200 ${
                  i < pin.length ? "scale-110 bg-mint-deep shadow-[0_0_0_4px_rgba(184,242,61,0.18)]" : "bg-line-2"
                }`}
              />
            ))}
          </div>

          <div className="relative grid grid-cols-3 gap-2.5">
            {KEYS.map((key) => {
              const label = key === "clear" ? "ล้าง" : key === "back" ? "⌫" : key;
              const isText = key === "clear" || key === "back";
              return (
                <motion.button
                  key={key}
                  whileTap={tapPress}
                  onClick={() => press(key)}
                  className={`h-14 rounded-[16px] border border-line bg-surface-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent-wash ${
                    isText ? "text-caption font-bold text-ink-3" : "numeral text-h3 text-ink"
                  }`}
                >
                  {label}
                </motion.button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="relative mt-4 h-11 w-full rounded-[14px] text-caption font-semibold text-ink-3 transition-colors duration-200 hover:bg-canvas hover:text-ink"
          >
            ไว้ก่อน
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
