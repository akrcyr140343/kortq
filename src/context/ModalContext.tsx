"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";

export interface ModalOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

interface ModalRequest extends ModalOptions {
  kind: "confirm" | "alert";
  resolve: (ok: boolean) => void;
}

interface ModalContextValue {
  /** Ask a yes/no question. Resolves true if confirmed, false if dismissed. */
  confirm: (opts: ModalOptions) => Promise<boolean>;
  /** Show a message with a single OK button. Resolves when dismissed. */
  alert: (opts: ModalOptions) => Promise<void>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/**
 * Provides the app-wide confirm()/alert() replacing raw window dialogs. Only one
 * dialog shows at a time (the latest request wins); each returns a promise the
 * caller awaits, so click handlers read like the old synchronous flow.
 */
export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = useState<ModalRequest | null>(null);

  const confirm = useCallback(
    (opts: ModalOptions) =>
      new Promise<boolean>((resolve) => setReq({ ...opts, kind: "confirm", resolve })),
    [],
  );

  const alert = useCallback(
    (opts: ModalOptions) =>
      new Promise<void>((resolve) => setReq({ ...opts, kind: "alert", resolve: () => resolve() })),
    [],
  );

  const close = useCallback((ok: boolean) => {
    setReq((cur) => {
      cur?.resolve(ok);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      {req && (
        <ConfirmModal
          title={req.title}
          message={req.message}
          confirmLabel={req.confirmLabel}
          cancelLabel={req.cancelLabel}
          tone={req.tone}
          showCancel={req.kind === "confirm"}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      )}
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within a ModalProvider");
  return ctx;
}
