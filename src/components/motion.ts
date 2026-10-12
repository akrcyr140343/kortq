/**
 * Shared motion vocabulary — small on purpose.
 *
 * Split by who drives the clock:
 *
 *  - **Entrances live in CSS** (`.anim-rise`, `.anim-pop`, `.anim-enter-x`,
 *    `.anim-status` … in globals.css). A backgrounded tab stops firing rAF, so a
 *    JS-driven entrance freezes at opacity 0 — unacceptable on a courtside
 *    tablet that is constantly switched away from. `staggerDelay()` below is
 *    the only helper they need.
 *  - **Presses live in CSS too** (`.btn:active` drops a button onto its ledge),
 *    so the tactile feel never depends on JS.
 *  - **Framer** handles what CSS can't: shared-layout pills that slide between
 *    options, sheets, modals and the curtains.
 */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Inline style that offsets a CSS entrance, for releasing a list in sequence. */
export function staggerDelay(index: number, step = 0.05) {
  return { animationDelay: `${(index * step).toFixed(2)}s` };
}

/** Standard interactive feedback for things that are not chunky buttons. */
export const lift = { y: -2, transition: { duration: 0.18, ease: EASE } };
export const press = { scale: 0.96, transition: { duration: 0.12, ease: EASE } };

/**
 * Springs for things the user moved. `glide` arrives fast without bouncing
 * past the target (sliding pills); `bouncy` overshoots a touch, for playful
 * arrivals (modals, stickers).
 */
export const glide = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 } as const;
export const bouncy = { type: "spring", stiffness: 420, damping: 24, mass: 0.9 } as const;
export const sheetIn = { type: "spring", stiffness: 360, damping: 36 } as const;
/** Leaving is quicker than arriving, so dismissals never feel sticky. */
export const sheetOut = { duration: 0.22, ease: [0.4, 0, 1, 1] } as const;
export const popIn = { duration: 0.28, ease: EASE };
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
