"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "@/context/AdminContext";

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
  // block for position:fixed descendants — which previously trapped this modal
  // inside the ~57px header and clipped it. Portalling escapes that context.
  const modal = (
    // Outer element scrolls; inner min-h-dvh flex centers the card when there's
    // room and lets it scroll into view (top reachable) on short/landscape screens.
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex min-h-dvh items-center justify-center p-4">
        <div
          className="w-full max-w-xs rounded-3xl border border-white/10 bg-neutral-900 p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-center text-lg font-semibold">ใส่ PIN แอดมิน</h2>
          <p className="mt-1 text-center text-sm text-neutral-400">
            {error ? (
              <span className="text-rose-400">PIN ไม่ถูกต้อง ลองใหม่</span>
            ) : (
              "ปลดล็อคเพื่อจัดการคิว"
            )}
          </p>

          <div className="my-6 flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-4 w-4 rounded-full ${
                  i < pin.length ? "bg-emerald-400" : "bg-neutral-700"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {KEYS.map((key) => {
              if (key === "clear") {
                return (
                  <button
                    key={key}
                    onClick={() => press(key)}
                    className="h-16 rounded-2xl bg-neutral-800 text-sm font-medium text-neutral-300 active:bg-neutral-700"
                  >
                    ล้าง
                  </button>
                );
              }
              if (key === "back") {
                return (
                  <button
                    key={key}
                    onClick={() => press(key)}
                    className="h-16 rounded-2xl bg-neutral-800 text-2xl text-neutral-300 active:bg-neutral-700"
                  >
                    ⌫
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  onClick={() => press(key)}
                  className="h-16 rounded-2xl bg-neutral-800 text-2xl font-semibold active:bg-neutral-700"
                >
                  {key}
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="mt-4 h-12 w-full rounded-2xl text-sm font-medium text-neutral-400 active:text-neutral-200"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
