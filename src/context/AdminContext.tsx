"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ADMIN_PIN = "1234";
const STORAGE_KEY = "kortq_admin";

interface AdminContextValue {
  isAdmin: boolean;
  unlock: (pin: string) => boolean;
  lock: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  // Restore the unlocked state so an admin isn't logged out on refresh.
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1") {
      setIsAdmin(true);
    }
  }, []);

  const unlock = useCallback((pin: string) => {
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
      window.localStorage.setItem(STORAGE_KEY, "1");
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    setIsAdmin(false);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(() => ({ isAdmin, unlock, lock }), [isAdmin, unlock, lock]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within an AdminProvider");
  return ctx;
}
