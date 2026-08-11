"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  body?: string;
}

interface ToastApi {
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastType, LucideIcon> = { success: CheckCircle2, error: XCircle, info: Info };
const TONE: Record<ToastType, string> = {
  success: "border-success-500/30",
  error: "border-danger-500/30",
  info: "border-info-500/30",
};
const ICON_TONE: Record<ToastType, string> = {
  success: "text-success-600",
  error: "text-danger-600",
  info: "text-info-600",
};

let idCounter = 0;

interface ToastProviderProps {
  children: ReactNode;
}

export default function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, title: string, body?: string) => {
      const id = ++idCounter;
      setToasts((current) => [...current, { id, type, title, body }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const toast: ToastApi = {
    success: (title, body) => push("success", title, body),
    error: (title, body) => push("error", title, body),
    info: (title, body) => push("info", title, body),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className={cn("card pointer-events-auto flex items-start gap-3 border p-4", TONE[t.type])}
              >
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ICON_TONE[t.type])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-xs text-inkSoft">{t.body}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-inkMuted hover:bg-subtle hover:text-ink"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
