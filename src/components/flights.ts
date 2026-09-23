"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Player flights — continuity for people moving around the hall.
 *
 * Any element tagged `data-flip-id` (a player id) + `data-flip-place` (where it
 * stands: "queue", "rest", "next:a", "court:<id>:b" …) is measured after every
 * commit of the page. When the placement signature changes (a real roster
 * change, local or realtime), each player is animated from where it was:
 *
 *  - same place, new position (the queue closing up, a bench reorder) → the
 *    element itself glides into its new slot (FLIP, transform only);
 *  - new place (queue → court, next game → court, swap across the net,
 *    court → queue on finish) → a clone flies on a fixed layer above both
 *    scroll panes and hands over to the real element when it lands.
 *
 * Safety rails, because this runs on courtside tablets fed by Firestore:
 *  - nothing is ever delayed or hidden from input: the real element stays
 *    clickable (only its opacity waits for the clone), and every flight is
 *    torn down by a timer even if the timeline stalls;
 *  - hidden views measure as 0×0 and are skipped, so switching tabs on a
 *    phone never makes anything fly in from a corner;
 *  - background tabs and "reduce motion" skip all of it;
 *  - unchanged signatures (timer ticks, selection, typing) animate nothing.
 */

type Snap = {
  el: HTMLElement;
  place: string;
  left: number;
  top: number;
  width: number;
  height: number;
  scroller: Element | null;
  scrollTop: number;
  scrollLeft: number;
  winX: number;
  winY: number;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const MAX_CLONES = 8;

function measure(root: HTMLElement): Map<string, Snap[]> {
  const map = new Map<string, Snap[]>();
  root.querySelectorAll<HTMLElement>("[data-flip-id]").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return; // inside a hidden view
    const id = el.dataset.flipId;
    if (!id) return;
    const scroller = el.closest("[data-flip-scroll]");
    const snap: Snap = {
      el,
      place: el.dataset.flipPlace ?? "",
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      scroller,
      scrollTop: scroller?.scrollTop ?? 0,
      scrollLeft: scroller?.scrollLeft ?? 0,
      winX: window.scrollX,
      winY: window.scrollY,
    };
    const list = map.get(id);
    if (list) list.push(snap);
    else map.set(id, [snap]);
  });
  return map;
}

/** Where a snapshot would sit now, after any scrolling since it was taken. */
function current(s: Snap) {
  const dy = (s.scroller ? s.scroller.scrollTop - s.scrollTop : 0) + (window.scrollY - s.winY);
  const dx = (s.scroller ? s.scroller.scrollLeft - s.scrollLeft : 0) + (window.scrollX - s.winX);
  return { left: s.left - dx, top: s.top - dy };
}

function allowed() {
  return (
    typeof window !== "undefined" &&
    document.visibilityState === "visible" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Drop a CSS entrance still running on a landed element (it would re-pop). */
function stopCssAnimations(el: HTMLElement) {
  if (typeof el.getAnimations !== "function" || typeof CSSAnimation === "undefined") return;
  for (const a of el.getAnimations()) if (a instanceof CSSAnimation) a.cancel();
}

let layer: HTMLDivElement | null = null;
function flightLayer() {
  if (!layer || !layer.isConnected) {
    layer = document.createElement("div");
    layer.className = "kq-flight-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.append(layer);
  }
  return layer;
}

const live = new Map<string, () => void>(); // id → teardown of its running flight

function glideInPlace(id: string, el: HTMLElement, dx: number, dy: number) {
  live.get(id)?.();
  const a = el.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }],
    { duration: 300, easing: EASE, composite: "add" },
  );
  const end = () => live.delete(id);
  a.onfinish = end;
  a.oncancel = end;
  live.set(id, () => a.cancel());
}

function fly(id: string, from: { left: number; top: number }, to: Snap, delay: number) {
  live.get(id)?.();
  const el = to.el;
  const clone = el.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-flip-id");
  clone.querySelectorAll("[data-flip-id]").forEach((n) => n.removeAttribute("data-flip-id"));
  clone.classList.add("kq-flight");
  clone.style.left = `${to.left}px`;
  clone.style.top = `${to.top}px`;
  clone.style.width = `${to.width}px`;
  clone.style.height = `${to.height}px`;
  clone.style.transform = "none";
  clone.style.opacity = "1";
  flightLayer().append(clone);

  const dx = from.left - to.left;
  const dy = from.top - to.top;
  const dist = Math.hypot(dx, dy);
  // Longer trips take a little longer, but never drag: 300–560ms.
  const duration = Math.min(560, 300 + dist * 0.32);
  // A shallow lob — a shuttle's arc, not a slide on rails.
  const lift = Math.min(28, dist * 0.09);

  stopCssAnimations(el);
  el.style.opacity = "0";

  const a = clone.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(0.97)`, boxShadow: "0 0 0 rgba(11,81,72,0)" },
      {
        transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(1.035)`,
        boxShadow: "0 22px 34px -20px rgba(11,81,72,0.55)",
        offset: 0.45,
      },
      { transform: "translate(0px, 0px) scale(1)", boxShadow: "0 0 0 rgba(11,81,72,0)" },
    ],
    { duration, delay, easing: EASE, fill: "backwards" },
  );

  let done = false;
  const land = () => {
    if (done) return;
    done = true;
    clearTimeout(guard);
    clone.remove();
    el.style.opacity = "";
    if (live.get(id) === teardown) live.delete(id);
  };
  const teardown = () => {
    a.cancel();
    land();
  };
  // A stalled timeline (tab switched mid-flight) must never strand a player.
  const guard = window.setTimeout(land, duration + delay + 250);
  a.onfinish = land;
  a.oncancel = land;
  live.set(id, teardown);
}

function run(prev: Map<string, Snap[]>, next: Map<string, Snap[]>) {
  let clones = 0;
  let order = 0;
  for (const [id, nowList] of next) {
    const before = prev.get(id);
    if (!before) continue; // brand new player: its own entrance plays
    for (const now of nowList) {
      const same = before.find((b) => b.place === now.place);
      if (same) {
        const p = current(same);
        const dx = p.left - now.left;
        const dy = p.top - now.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) glideInPlace(id, now.el, dx, dy);
        continue;
      }
      if (clones >= MAX_CLONES) continue;
      clones += 1;
      fly(id, current(before[0]), now, Math.min(order++, 5) * 45);
    }
  }
}

/**
 * Measures after every commit; animates only when `signature` (the
 * placement of every player) changed since the previous commit.
 */
export function usePlayerFlights(rootRef: RefObject<HTMLElement | null>, signature: string) {
  const snaps = useRef<Map<string, Snap[]>>(new Map());
  const lastSig = useRef(signature);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const next = measure(root);
    const changed = lastSig.current !== signature;
    lastSig.current = signature;
    if (changed && allowed()) run(snaps.current, next);
    snaps.current = next;
  });

  // Rotation / resize moves everything: start the next change from fresh rects.
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (rootRef.current) snaps.current = measure(rootRef.current);
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [rootRef]);
}
