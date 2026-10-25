"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { motion, useIsPresent } from "framer-motion";
import { ShuttleBuddy } from "./art";
import { bouncy, popOut } from "./motion";

/**
 * The app's single confirm/alert dialog — replaces raw window.confirm/alert.
 * Portalled to <body> and elevated above every drawer/modal (z-[120]) so it can
 * be raised from inside the roster sheet. A card that springs up from the
 * bottom with a coloured top band: sun for a question, red for a deletion.
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
  // While animating out, the dialog is already answered: ignore keys/taps.
  const present = useIsPresent();
  const titleId = useId();
  const messageId = useId();

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

  // Portal target only exists on the client; dialogs only open on request.
  if (typeof document === "undefined") return null;

  const danger = tone === "danger";

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: popOut }}
      style={present ? undefined : { pointerEvents: "none" }}
      className="fixed inset-0 z-[120] overflow-y-auto bg-ink/30 backdrop-blur-[4px]"
      onClick={showCancel ? onCancel : onConfirm}
    >
      <div className="flex min-h-dvh items-end justify-center p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:items-center">
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={message ? messageId : undefined}
          initial={{ opacity: 0, y: 60, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, transition: bouncy }}
          exit={{ opacity: 0, y: 20, scale: 0.96, transition: popOut }}
          className="relative w-full max-w-[23rem] overflow-hidden rounded-[36px] bg-paper shadow-lift"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`relative flex h-24 items-end px-6 pb-0 ${danger ? "bg-danger-wash" : "bg-sun"}`}>
            <span
              aria-hidden
              className={`anim-stamp absolute -bottom-7 left-6 grid h-16 w-16 place-items-center rounded-full ring-4 ring-paper ${
                danger ? "bg-danger-deep text-white" : "bg-paper"
              }`}
            >
              {danger ? <span className="num text-[2rem] leading-none">!</span> : <ShuttleBuddy className="h-11 w-11" mood="wow" />}
            </span>
          </div>
          <div className="px-6 pb-6 pt-10">
            <h2 id={titleId} className="display text-title leading-snug text-ink">
              {title}
            </h2>
            {message && (
              <p id={messageId} className="mt-2 text-body leading-relaxed text-ink-2">
                {message}
              </p>
            )}

            <div className="mt-6 flex gap-2.5">
              {showCancel && (
                <button type="button" onClick={onCancel} className="btn h-12 flex-1">
                  {cancelLabel}
                </button>
              )}
              <button type="button" onClick={onConfirm} className={`btn h-12 flex-1 ${danger ? "btn-danger" : "btn-ink"}`}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
