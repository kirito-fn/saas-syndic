import React, { useState, useEffect, useCallback } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let listeners: Array<(toast: Toast) => void> = [];

export function toast(message: string, type: Toast["type"] = "info") {
  const t: Toast = { id: Date.now(), message, type };
  listeners.forEach((fn) => fn(t));
}

const ICONS: Record<string, React.JSX.Element> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const STYLES: Record<string, string> = {
  success: "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20",
  error: "bg-red-600 text-white shadow-lg shadow-red-600/20",
  info: "bg-slate-800 text-white shadow-lg shadow-slate-800/20",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => { listeners = listeners.filter((l) => l !== addToast); };
  }, [addToast]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-2.5 p-4 pb-safe pointer-events-none sm:bottom-6 sm:right-6 sm:left-auto sm:p-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-slide-up sm:animate-slide-in-right ${STYLES[t.type]}`}
        >
          {ICONS[t.type]}
          <span className="flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
