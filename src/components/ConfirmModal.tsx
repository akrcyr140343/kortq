"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { motion, useIsPresent } from "framer-motion";
import { ShuttleBuddy } from "./art";
import { bouncy, popOut } from "./motion";

/**
 * The app's single confirm/alert dialog — replaces raw window.confirm/alert.
 * Portalled to <body> and elevated above every drawer/modal (z-[120]) so it can
 * be raised from inside the roster sheet.
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
      className="fixed inset-0 z-[120] overflow-y-auto bg-ink/35 backdrop-blur-[3px]"
      onClick={showCancel ? onCancel : onConfirm}
    >
      <div className="flex min-h-dvh items-end justify-center p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:items-center">
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={message ? messageId : undefined}
          initial={{ opacity: 0, y: 34, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: bouncy }}
          exit={{ opacity: 0, y: 14, scale: 0.96, transition: popOut }}
          className="card relative w-full max-w-[22rem] rounded-[30px] p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            aria-hidden
            className={`sticker anim-stamp grid h-14 w-14 place-items-center rounded-2xl ${
              danger ? "bg-tomato-wash text-tomato-deep ring-2 ring-inset ring-tomato/20" : "bg-sun-wash ring-2 ring-inset ring-sun/40"
            }`}
          >
            {danger ? (
              <span className="font-num text-[1.75rem] font-bold leading-none">!</span>
            ) : (
              <ShuttleBuddy className="h-10 w-10" mood="wow" />
            )}
          </span>
          <h2 id={titleId} className="mt-4 font-display text-title font-semibold leading-snug text-ink">
            {title}
          </h2>
          {message && (
            <p id={messageId} className="mt-2 text-body leading-relaxed text-ink-2">
              {message}
            </p>
          )}

          <div className="mt-6 flex gap-2.5">
            {showCancel && (
              <button type="button" onClick={onCancel} className="btn h-12 flex-1 rounded-2xl">
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              className={`btn h-12 flex-1 rounded-2xl ${danger ? "btn-danger" : "btn-sun"}`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
