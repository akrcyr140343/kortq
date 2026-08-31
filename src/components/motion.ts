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
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Inline style that offsets a CSS entrance, for releasing a list in sequence. */
export function staggerDelay(index: number, step = 0.05) {
  return { animationDelay: `${(index * step).toFixed(2)}s` };
}

/** Standard interactive feedback for cards and buttons. */
export const lift = { y: -2, transition: { duration: 0.18, ease: EASE } };
export const press = { scale: 0.97, transition: { duration: 0.12, ease: EASE } };
