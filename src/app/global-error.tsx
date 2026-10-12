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
          background: "#fff9f0",
          color: "#23263b",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: 360,
            width: "100%",
            textAlign: "center",
            background: "#ffffff",
            border: "2px solid #efe3d1",
            borderRadius: 28,
            boxShadow: "0 4px 0 #e3d3bb",
            padding: "28px 24px",
          }}
        >
          <div style={{ fontSize: 44 }}>🏸</div>
          <h2 style={{ margin: "12px 0 4px", fontSize: 22 }}>แอปสะดุดแรงไปหน่อย</h2>
          <p style={{ color: "#575c76", fontSize: 15, wordBreak: "break-word" }}>
            {error?.message || "ลองโหลดหน้าใหม่อีกทีนะ"}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              height: 48,
              width: "100%",
              borderRadius: 16,
              border: "none",
              background: "#ffc83d",
              boxShadow: "0 4px 0 #e6a510",
              color: "#23263b",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  );
}
