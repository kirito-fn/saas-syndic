import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../lib/auth.js";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "../../hooks/useNotifications.js";

export default function NotificationBell() {
  const { user } = useAuth();
  const { data, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (user?.role !== "ADMIN") return null;

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-scale-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32" />
                </svg>
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">Aucune notification</div>
            )}

            {!isLoading && notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${!n.isRead ? "bg-brand-50/40" : ""}`}
                onClick={() => { if (!n.isRead) markAsRead.mutate(n.id); }}
              >
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.isRead ? "bg-transparent" : "bg-brand-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR");
}
