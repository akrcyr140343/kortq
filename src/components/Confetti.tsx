import type { CSSProperties } from "react";

const COLORS = ["var(--lime)", "var(--court)", "var(--coral)", "var(--sky)", "var(--grape)", "var(--sun)"];

/**
 * A one-shot burst of confetti from the centre of its positioned parent.
 * CSS-only (see `.confetti` in globals.css); trajectories are derived from the
 * piece index, not Math.random, so renders stay pure. Mount it (or change its
 * `key`) at the moment worth celebrating; it removes nothing and costs nothing
 * once the burst has faded. Hidden entirely for "reduce motion".
 */
export function Confetti({
  pieces = 16,
  spread = 1,
  className = "",
}: {
  pieces?: number;
  spread?: number;
  className?: string;
}) {
  const items = Array.from({ length: pieces }, (_, i) => {
    const angle = (i / pieces) * Math.PI * 2 + ((i * 7) % 5) * 0.11;
    const dist = (54 + ((i * 29) % 46)) * spread;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist * 0.85 - 28 * spread,
      r: ((i * 97) % 540) - 270,
      c: COLORS[i % COLORS.length],
      d: (i % 5) * 0.018,
      shape: i % 3,
    };
  });

  return (
    <span aria-hidden className={`confetti ${className}`}>
      {items.map((p, i) => (
        <i
          key={i}
          className={p.shape === 1 ? "round" : p.shape === 2 ? "strip" : undefined}
          style={
            {
              "--dx": `${p.dx.toFixed(1)}px`,
              "--dy": `${p.dy.toFixed(1)}px`,
              "--r": `${p.r}deg`,
              "--c": p.c,
              "--d": `${p.d.toFixed(3)}s`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
