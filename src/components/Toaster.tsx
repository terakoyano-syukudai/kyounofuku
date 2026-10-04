"use client";

import { useToasts } from "@/lib/toast";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex max-w-md items-center gap-2 rounded-2xl px-5 py-3.5 text-base font-bold shadow-lg ${
            t.tone === "error" ? "bg-red-600 text-white" : t.tone === "info" ? "bg-ink text-bg" : "bg-good text-white"
          }`}
        >
          <span aria-hidden>{t.tone === "error" ? "⛔" : t.tone === "info" ? "ℹ️" : "✓"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
