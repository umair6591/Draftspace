"use client";

import { useEffect } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastState = {
  message: string;
  variant: ToastVariant;
} | null;

const variantClasses: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-cyan-200 bg-cyan-50 text-cyan-800",
};

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className={`fixed right-4 top-4 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${variantClasses[toast.variant]}`}
      role={toast.variant === "error" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3">
        <p>{toast.message}</p>
        <button
          aria-label="Dismiss notification"
          className="ml-auto rounded px-1 text-current opacity-70 hover:opacity-100"
          onClick={onDismiss}
          type="button"
        >
          x
        </button>
      </div>
    </div>
  );
}
