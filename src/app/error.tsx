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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6 text-slate-800">
      <div className="w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-lg shadow-slate-200/60">
        <div className="text-4xl">😵</div>
        <h2 className="mt-3 text-lg font-extrabold">เกิดข้อผิดพลาด</h2>
        <p className="mt-2 break-words text-sm text-slate-500">
          {error?.message || "แอปทำงานผิดพลาด กรุณาลองใหม่"}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={reset}
            className="h-12 w-full rounded-2xl bg-emerald-500 text-base font-bold text-white transition active:scale-[0.98] hover:bg-emerald-600"
          >
            ลองใหม่
          </button>
          <button
            onClick={() => window.location.reload()}
            className="h-12 w-full rounded-2xl bg-slate-100 text-base font-semibold text-slate-600 transition active:scale-95 hover:bg-slate-200"
          >
            โหลดหน้าใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
