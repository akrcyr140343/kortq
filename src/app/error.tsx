"use client";

import { useEffect } from "react";
import { ShuttleBuddy } from "@/components/art";

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
    console.error("[KortQ] Render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="anim-rise w-full max-w-sm rounded-[36px] bg-paper p-7 text-center shadow-lift">
        <span className="anim-bob mx-auto block w-fit" style={{ ["--bob-y" as string]: "-6px", ["--bob-d" as string]: "3s" }}>
          <ShuttleBuddy className="h-16 w-16" mood="wow" />
        </span>
        <span className="eyebrow mt-5 block text-danger-deep">เกิดข้อผิดพลาด</span>
        <h2 className="display mt-2 text-h3 leading-tight text-ink">ขอโทษที ไปต่อไม่ได้</h2>
        <p className="mt-2 break-words text-body text-ink-2">{error?.message || "แอปสะดุดนิดหน่อย ลองใหม่อีกทีนะ"}</p>
        <div className="mt-6 space-y-2.5">
          <button type="button" onClick={reset} className="btn btn-ink h-12 w-full">
            ลองใหม่
          </button>
          <button type="button" onClick={() => window.location.reload()} className="btn h-12 w-full">
            โหลดหน้าใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
