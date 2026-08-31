"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary. Replaces the white-screen crash with a readable
 * message + retry, instead of a blank page (seen on mobile Safari).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[KortQ] Render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas p-6">
      <div className="e3 w-full max-w-sm rounded-xl p-8">
        <span className="eyebrow text-alert">เกิดข้อผิดพลาด</span>
        <h2 className="display mt-3 text-h2 leading-none text-ink">ขอโทษที ไปต่อไม่ได้</h2>
        <p className="mt-3 break-words text-body text-ink-2">
          {error?.message || "แอปสะดุดนิดหน่อย ลองใหม่อีกทีนะ"}
        </p>
        <div className="mt-6 space-y-2">
          <button
            onClick={reset}
            className="h-12 w-full rounded-sm bg-accent text-caption font-bold text-white transition-colors duration-200 hover:bg-accent-deep"
          >
            ลองใหม่
          </button>
          <button
            onClick={() => window.location.reload()}
            className="h-12 w-full rounded-sm border border-line-2 bg-surface-2 text-caption font-bold text-ink-2 transition-colors duration-200 hover:border-ink-4 hover:bg-white"
          >
            โหลดหน้าใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
