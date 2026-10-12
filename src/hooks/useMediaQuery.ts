"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Live `matchMedia` result. Reads `false` on the server (and during hydration),
 * then follows the real viewport — used only for presentation choices such as
 * "bottom sheet on phones, side drawer on tablets".
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
