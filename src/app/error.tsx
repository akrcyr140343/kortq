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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm rounded-3xl border border-rose-500/30 bg-rose-500/[0.06] p-8 text-center">
        <div className="text-4xl">😵</div>
        <h2 className="mt-3 text-lg font-bold">เกิดข้อผิดพลาด</h2>
        <p className="mt-2 break-words text-sm text-neutral-400">
          {error?.message || "แอปทำงานผิดพลาด กรุณาลองใหม่"}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={reset}
            className="h-12 w-full rounded-2xl bg-emerald-500 text-base font-bold text-neutral-950 active:bg-emerald-600"
          >
            ลองใหม่
          </button>
          <button
            onClick={() => window.location.reload()}
            className="h-12 w-full rounded-2xl bg-neutral-800 text-base font-semibold active:bg-neutral-700"
          >
            โหลดหน้าใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
