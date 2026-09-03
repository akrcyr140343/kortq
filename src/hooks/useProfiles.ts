"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeProfiles } from "@/lib/db";
import { type Profile } from "@/lib/types";

/**
 * Live roster of permanent Profiles, sorted most-frequent-first
 * (visitCount desc, then most recently joined). Subscribes only while
 * `enabled` is true (admin session) so members and locked sessions cost no
 * extra reads. The sort is done here, not in Firestore, to avoid a composite
 * index on a tiny collection.
 */
export function useProfiles(enabled: boolean): Profile[] {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (!enabled) {
      setProfiles([]);
      return;
    }
    const unsub = subscribeProfiles(setProfiles, (e) => {
      // eslint-disable-next-line no-console
      console.error("[KortQ] Profiles subscription error:", e);
    });
    return () => unsub();
  }, [enabled]);

  return useMemo(
    () =>
      [...profiles].sort(
        (a, b) => b.visitCount - a.visitCount || b.lastJoinedAt - a.lastJoinedAt,
      ),
    [profiles],
  );
}
