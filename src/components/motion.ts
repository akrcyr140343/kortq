/**
 * Shared motion vocabulary — deliberately small.
 *
 * Split by who drives the clock:
 *
 *  - **Entrances live in CSS** (`.anim-enter`, `.anim-enter-x`, `.anim-pop`,
 *    `.anim-rise` in globals.css). A backgrounded tab stops firing rAF, so a
 *    JS-driven entrance freezes at opacity 0 — unacceptable on a courtside
 *    iPad that is constantly switched away from. `staggerDelay()` below is the
 *    only helper needed for them.
 *  - **Hover and tap stay in Framer**, because they only ever run while
 *    someone is looking at the screen.
 *
 * House rules: one easing curve everywhere; nothing exceeds 350ms.
 */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Inline style that offsets a CSS entrance, for releasing a list in sequence. */
export function staggerDelay(index: number, step = 0.05) {
  return { animationDelay: `${(index * step).toFixed(2)}s` };
}

/** Standard interactive feedback for cards and buttons. */
export const lift = { y: -2, transition: { duration: 0.18, ease: EASE } };
export const press = { scale: 0.97, transition: { duration: 0.12, ease: EASE } };

/**
 * Springs for things the user moved (sliding pills, sheets). Critically
 * damped-ish: they arrive fast and settle without bouncing past the target.
 */
export const glide = { type: "spring", stiffness: 520, damping: 42, mass: 0.9 } as const;
export const sheetIn = { type: "spring", stiffness: 380, damping: 40 } as const;
/** Leaving is quicker than arriving, so dismissals never feel sticky. */
export const sheetOut = { duration: 0.22, ease: [0.4, 0, 1, 1] } as const;
export const popIn = { duration: 0.26, ease: EASE };
export const popOut = { duration: 0.16, ease: [0.4, 0, 1, 1] } as const;

/**
 * Wraps a handler that may return a promise, reporting "busy" while it is in
 * flight. Purely for feedback: the handler is called exactly as before and
 * nothing waits on the returned promise.
 */
export function trackBusy(result: unknown, setBusy: (busy: boolean) => void) {
  if (result && typeof (result as Promise<unknown>).finally === "function") {
    setBusy(true);
    (result as Promise<unknown>).finally(() => setBusy(false)).catch(() => {});
  }
}
