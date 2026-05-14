import { api } from "./client.js";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  buildingId: number | null;
  building: { id: number; name: string } | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationLog {
  id: number;
  type: string;
  channel: string;
  recipient: string;
  subject: string;
  message: string;
  buildingId: number | null;
  residentId: number | null;
  paymentId: number | null;
  status: string;
  error: string | null;
  createdAt: string;
}

export interface ReminderPayment {
  id: number;
  month: number;
  year: number;
  amount: number;
  status: string;
  resident?: {
    id: number;
    firstName: string;
    lastName: string;
    apartment: string;
    phone?: string | null;
    email?: string | null;
  };
  building?: { id: number; name: string };
}

export const notificationsApi = {
  getAll: () => api.get<{ notifications: Notification[]; unread: number }>("/notifications"),
  getUnreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post("/notifications/read-all"),

  getHistory: (params?: { buildingId?: number; channel?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.buildingId) q.set("buildingId", String(params.buildingId));
    if (params?.channel) q.set("channel", params.channel);
    if (params?.page) q.set("page", String(params.page));
    return api.get<{ logs: NotificationLog[]; total: number; page: number; pageSize: number }>(
      `/notifications/history?${q.toString()}`
    );
  },

  getReminders: (params?: { buildingId?: number; month?: number; year?: number }) => {
    const q = new URLSearchParams();
    if (params?.buildingId) q.set("buildingId", String(params.buildingId));
    if (params?.month) q.set("month", String(params.month));
    if (params?.year) q.set("year", String(params.year));
    return api.get<{ payments: ReminderPayment[] }>(`/notifications/reminders?${q.toString()}`);
  },

  sendEmail: (paymentId: number) =>
    api.post<{ channel: string; success: boolean; error?: string }[]>("/notifications/send-email", { paymentId }),

  sendWhatsApp: (paymentId: number) =>
    api.post<{ channel: string; success: boolean; link?: string; error?: string }[]>("/notifications/send-whatsapp", { paymentId }),

  generateWhatsAppLink: (paymentId: number) =>
    api.post<{ link: string | null; phone: string; message: string; error?: string }>("/notifications/whatsapp-link", { paymentId }),

  sendBulk: (params: { buildingId?: number; month?: number; year?: number; channel: string }) =>
    api.post<{ total: number; sent: { paymentId: number; channel: string; success: boolean }[] }>("/notifications/send-bulk", params),

  sendConfirmation: (paymentId: number) =>
    api.post<{ success: boolean; error?: string }>("/notifications/send-confirmation", { paymentId }),
};
