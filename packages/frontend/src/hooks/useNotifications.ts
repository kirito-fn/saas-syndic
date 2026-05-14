import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type Notification } from "../api/notifications.api.js";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.getAll,
    refetchInterval: 15_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 15_000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useNotificationHistory(params?: { buildingId?: number; channel?: string; page?: number }) {
  return useQuery({
    queryKey: ["notifications", "history", params],
    queryFn: () => notificationsApi.getHistory(params),
  });
}

export function useReminders(params?: { buildingId?: number; month?: number; year?: number }) {
  return useQuery({
    queryKey: ["notifications", "reminders", params],
    queryFn: () => notificationsApi.getReminders(params),
  });
}

export function useSendEmailReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.sendEmail,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "history"] });
    },
  });
}

export function useSendWhatsAppReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.sendWhatsApp,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "history"] });
    },
  });
}

export function useGenerateWhatsAppLink() {
  return useMutation({
    mutationFn: notificationsApi.generateWhatsAppLink,
  });
}

export function useSendBulkReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.sendBulk,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "history"] });
    },
  });
}

export function useSendConfirmation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.sendConfirmation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
