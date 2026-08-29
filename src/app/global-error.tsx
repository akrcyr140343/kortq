"use client";

import { useEffect } from "react";

/**
 * Root error boundary — catches crashes in the root layout itself (where the
 * normal error.tsx can't render). Must ship its own <html>/<body>. Kept
 * dependency-free and self-styled so it works even if app CSS failed to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[KortQ] Global error:", error);
  }, [error]);

  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eef2f6",
          color: "#0f172a",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>😵</div>
          <h2 style={{ margin: "12px 0 4px", fontSize: 18 }}>เกิดข้อผิดพลาดร้ายแรง</h2>
          <p style={{ color: "#64748b", fontSize: 14, wordBreak: "break-word" }}>
            {error?.message || "แอปทำงานผิดพลาด กรุณาโหลดหน้าใหม่"}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              height: 48,
              width: "100%",
              borderRadius: 16,
              border: "none",
              background: "#10b981",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  );
}
