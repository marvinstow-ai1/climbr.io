import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ToastKind = "success" | "error" | "info";
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);
  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((ts) => [...ts, { id, kind, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <ToastRail />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

function ToastRail() {
  const { toasts, dismiss } = useToast();
  // Live region for assistive tech.
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [enter, setEnter] = useState(false);
  useEffect(() => { setEnter(true); }, []);
  const tint =
    toast.kind === "success"
      ? "border-accent/30 bg-accent-dim text-accent"
      : toast.kind === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : "border-line-strong bg-bg-elevated/90 text-ink";
  return (
    <div
      className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl transition-all ${tint} ${enter ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      role={toast.kind === "error" ? "alert" : "status"}
    >
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} aria-label="Dismiss" className="opacity-60 transition-opacity hover:opacity-100">×</button>
    </div>
  );
}
