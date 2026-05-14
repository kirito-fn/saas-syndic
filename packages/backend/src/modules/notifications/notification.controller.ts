import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import * as notificationService from "./notification.service.js";

const router = Router();

function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

// ---- In-app notifications ----

router.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (_req, res) => {
    const notifications = await notificationService.getNotifications();
    const unread = await notificationService.getUnreadCount();
    res.json({ notifications, unread });
  })
);

router.get(
  "/unread-count",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (_req, res) => {
    const count = await notificationService.getUnreadCount();
    res.json({ count });
  })
);

router.patch(
  "/:id/read",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await notificationService.markAsRead(id);
    res.status(204).end();
  })
);

router.post(
  "/read-all",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (_req, res) => {
    await notificationService.markAllAsRead();
    res.status(204).end();
  })
);

// ---- Send email reminder ---- 

router.post(
  "/send-email",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const { paymentId } = req.body;
    const result = await notificationService.sendPaymentReminder(paymentId, "email");
    res.json(result);
  })
);

// ---- Send WhatsApp reminder ----

router.post(
  "/send-whatsapp",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const { paymentId } = req.body;
    const result = await notificationService.sendPaymentReminder(paymentId, "whatsapp");
    res.json(result);
  })
);

// ---- Generate WhatsApp link ----

router.post(
  "/whatsapp-link",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const { paymentId } = req.body;
    const payment = await prismaPaymentWithResident(paymentId);
    if (!payment) return void res.status(404).json({ error: "Paiement introuvable" });

    const residentName = `${payment.resident.firstName} ${payment.resident.lastName}`;
    const msg = notificationService.formatWhatsAppReminder(
      residentName, payment.month, payment.year, payment.amount, (payment.building as { name: string }).name
    );
    const phone = payment.resident.phone;
    if (!phone) return void res.json({ link: null, error: "Aucun numéro de téléphone" });

    const link = notificationService.generateWhatsAppLink(phone, msg);
    await notificationService.logSentNotification(
      "payment_reminder", "whatsapp", phone,
      `WhatsApp — ${getMonthName(payment.month)} ${payment.year}`,
      msg, payment.buildingId, payment.residentId, payment.id
    );
    res.json({ link, phone, message: msg });
  })
);

// ---- Bulk send ----

router.post(
  "/send-bulk",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const { buildingId, month, year, channel } = req.body;
    const result = await notificationService.sendBulkReminders(buildingId, month, year, channel || "email");
    res.json(result);
  })
);

// ---- Send payment confirmation ----

router.post(
  "/send-confirmation",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const { paymentId } = req.body;
    const result = await notificationService.sendPaymentConfirmation(paymentId);
    res.json(result);
  })
);

// ---- Notification history ----

router.get(
  "/history",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string, 10) : undefined;
    const channel = req.query.channel as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const result = await notificationService.getNotificationHistory(buildingId, channel, page);
    res.json(result);
  })
);

// ---- Payment reminders page (list unpaid payments with resident info) ----

router.get(
  "/reminders",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const { buildingId, month, year } = req.query;
    const where: Record<string, unknown> = { status: "UNPAID" };
    if (buildingId) where.buildingId = parseInt(buildingId as string, 10);
    if (month) where.month = parseInt(month as string, 10);
    if (year) where.year = parseInt(year as string, 10);

    const payments = await prismaPaymentFindMany(where);
    res.json({ payments });
  })
);

// ---- Helpers ----

async function prismaPaymentWithResident(paymentId: number) {
  const { prisma } = await import("../../db/client.js");
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      resident: true,
      building: { select: { id: true, name: true } },
    },
  });
}

async function prismaPaymentFindMany(where: Record<string, unknown>) {
  const { prisma } = await import("../../db/client.js");
  return prisma.payment.findMany({
    where,
    include: {
      resident: true,
      building: { select: { id: true, name: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

function getMonthName(m: number): string {
  const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  return months[m - 1] || "";
}

export default router;
