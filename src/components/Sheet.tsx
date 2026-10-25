"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { IconX } from "./icons";
import { sheetIn, sheetOut } from "./motion";

/**
 * The app's panel for longer tasks (history, roster) — a dark slab that
 * slides over the hall.
 *
 *  - Phones: a bottom sheet that rises from the thumb zone; drag the handle /
 *    title down (or tap the backdrop, or Esc) to dismiss.
 *  - Tablets and up: a drawer docked to the right edge.
 *
 * Portalled to <body> so a transformed / blurred ancestor can never trap the
 * fixed overlay. Locks background scroll while open.
 */
export function Sheet({
  open,
  onClose,
  label,
  eyebrow,
  title,
  subtitle,
  icon,
  toolbar,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode; // a small sticker beside the title
  toolbar?: ReactNode; // controls under the title (not part of the drag handle)
  footer?: ReactNode;
  children: ReactNode;
}) {
  const wide = useMediaQuery("(min-width: 640px)");
  const drag = useDragControls();

  // Lock background scroll + Esc to close while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Portal target only exists on the client; every caller renders this only
  // after client-side state resolves, so nothing renders during hydration.
  if (typeof document === "undefined") return null;

  const startDrag = (e: React.PointerEvent) => {
    if (!wide) drag.start(e);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.24 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/30 backdrop-blur-[4px]"
          />

          <motion.aside
            key={wide ? "side" : "bottom"}
            initial={wide ? { x: "100%" } : { y: "100%" }}
            animate={wide ? { x: 0, transition: sheetIn } : { y: 0, transition: sheetIn }}
            exit={wide ? { x: "100%", transition: sheetOut } : { y: "100%", transition: sheetOut }}
            drag={wide ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 650) onClose();
            }}
            className={
              wide
                ? "absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col overflow-hidden rounded-l-[32px] bg-canvas shadow-lift"
                : "absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col overflow-hidden rounded-t-[32px] bg-canvas shadow-lift"
            }
          >
            {/* Drag handle + title (phones drag from here) */}
            <div
              onPointerDown={startDrag}
              className={`shrink-0 select-none px-5 ${
                wide ? "pt-[calc(env(safe-area-inset-top)+1.25rem)]" : "touch-none pt-2.5"
              }`}
            >
              {!wide && <span aria-hidden className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-line-2" />}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {icon}
                  <div className="min-w-0">
                    {eyebrow && <span className="eyebrow block text-ink-3">{eyebrow}</span>}
                    <h2 className="display mt-1 text-h3 leading-none text-ink">{title}</h2>
                    {subtitle && <p className="mt-1.5 text-caption text-ink-3">{subtitle}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="ปิด"
                  className="btn h-11 w-11 shrink-0 px-0"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>
            </div>

            {toolbar && <div className="shrink-0 px-5 pt-3">{toolbar}</div>}

            <div className="scroll-pane min-h-0 flex-1 overflow-y-auto">{children}</div>

            {footer}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
