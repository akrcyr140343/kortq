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
          background: "#f4f8f6",
          color: "#0d1a16",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 40 }}>😵</div>
          <h2 style={{ margin: "12px 0 4px", fontSize: 20 }}>แอปสะดุดแรงไปหน่อย</h2>
          <p style={{ color: "#3c4b46", fontSize: 15, wordBreak: "break-word" }}>
            {error?.message || "ลองโหลดหน้าใหม่อีกทีนะ"}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              height: 48,
              width: "100%",
              borderRadius: 10,
              border: "none",
              background: "#059669",
              color: "#ffffff",
              fontSize: 15,
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
