"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useIsPresent } from "framer-motion";
import { popOut, press } from "./motion";
import { E3 } from "./ui";

/**
 * The app's single confirm/alert dialog — replaces raw window.confirm/alert.
 * Portalled to <body> and elevated above every drawer/modal (z-[120]) so it can
 * be raised from inside the roster drawer. Reuses the PinModal overlay pattern.
 */
export function ConfirmModal({
  title,
  message,
  confirmLabel = "ตกลง",
  cancelLabel = "ยกเลิก",
  tone = "default",
  showCancel = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  // While animating out, the dialog is already answered: ignore keys/taps.
  const present = useIsPresent();

  // Portal target (document.body) only exists on the client.
  useEffect(() => setMounted(true), []);

  // Lock background scroll; Esc dismisses, Enter confirms.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (!present) return;
      if (e.key === "Escape") (showCancel ? onCancel : onConfirm)();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [showCancel, onConfirm, onCancel, present]);

  if (!mounted) return null;

  const danger = tone === "danger";

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: popOut }}
      style={present ? undefined : { pointerEvents: "none" }}
      className="fixed inset-0 z-[120] overflow-y-auto bg-accent-deep/35 backdrop-blur-md"
      onClick={showCancel ? onCancel : onConfirm}
    >
      <div className="flex min-h-dvh items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 460, damping: 32 } }}
          exit={{ opacity: 0, y: 8, scale: 0.97, transition: popOut }}
          className={`${E3} relative w-full max-w-xs overflow-hidden rounded-[28px] p-6`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            aria-hidden
            className={`absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl ${danger ? "bg-alert-wash" : "bg-mint-wash"}`}
          />
          <h2 className="display relative text-title leading-tight text-ink">{title}</h2>
          {message && <p className="relative mt-2 text-body leading-relaxed text-ink-2">{message}</p>}

          <div className="relative mt-6 flex gap-2.5">
            {showCancel && (
              <motion.button
                whileTap={press}
                onClick={onCancel}
                className="h-12 flex-1 rounded-[15px] border border-line bg-white text-caption font-bold text-ink-2 shadow-sm transition-colors duration-200 hover:bg-canvas"
              >
                {cancelLabel}
              </motion.button>
            )}
            <motion.button
              whileTap={press}
              onClick={onConfirm}
              className={`h-12 flex-1 rounded-[15px] text-caption font-extrabold transition-all duration-200 hover:-translate-y-0.5 ${
                danger
                  ? "bg-alert text-white shadow-[0_12px_24px_-14px_rgba(237,70,101,0.8)]"
                  : "lime-button shine-button"
              }`}
            >
              {confirmLabel}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
