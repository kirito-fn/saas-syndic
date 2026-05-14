import nodemailer from "nodemailer";
import { prisma } from "../../db/client.js";
import { logger } from "../../lib/logger.js";
import { MONTHS, MONTHLY_FEE } from "@syndic/shared";

let _transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    });
  }
  return _transport;
}

function getFromAddress() {
  return {
    address: process.env.NOTIFICATION_FROM_EMAIL || "syndic@example.com",
    name: process.env.NOTIFICATION_FROM_NAME || "Syndic Management",
  };
}

// ---- In-app notification CRUD ----

export async function getNotifications() {
  return prisma.notification.findMany({
    include: {
      building: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadCount() {
  return prisma.notification.count({ where: { isRead: false } });
}

export async function markAsRead(id: number) {
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllAsRead() {
  await prisma.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
}

export async function createNotification(
  type: string,
  title: string,
  message: string,
  buildingId?: number
) {
  const notification = await prisma.notification.create({
    data: { type, title, message, buildingId: buildingId ?? null },
    include: {
      building: { select: { id: true, name: true } },
    },
  });

  logger.info("notifications", `Notification créée: ${type} — ${title}`);
  return notification;
}

// ---- Templates ----

export function formatPaymentReminderMessage(
  residentName: string,
  month: number,
  year: number,
  amount: number,
  buildingName: string,
  locale: "fr" | "ar" = "fr"
): string {
  if (locale === "ar") {
    return `السلام عليكم،
نذكركم أن واجب السنديك لشهر ${MONTHS[month - 1]} ${year} بمبلغ ${amount} درهم لم يتم دفعه بعد.
الرجاء التكرم بدفع المستحقات في أقرب وقت ممكن.
شكرا جزيلا.
— إدارة ${buildingName}`;
  }
  return `Bonjour ${residentName},

Nous vous rappelons que votre paiement de syndic pour le mois de ${MONTHS[month - 1]} ${year} d'un montant de ${amount} MAD n'a pas encore été effectué.

Merci de bien vouloir procéder au règlement dans les plus brefs délais.

Cordialement,
— Gestion ${buildingName}`;
}

export function formatPaymentConfirmationMessage(
  residentName: string,
  month: number,
  year: number,
  amount: number,
  buildingName: string
): string {
  return `Bonjour ${residentName},

Nous confirmons la réception de votre paiement de syndic pour le mois de ${MONTHS[month - 1]} ${year} d'un montant de ${amount} MAD.

Nous vous remercions pour votre règlement.

Cordialement,
— Gestion ${buildingName}`;
}

export function formatWhatsAppReminder(
  residentName: string,
  month: number,
  year: number,
  amount: number,
  buildingName: string
): string {
  return `السلام عليكم،
نذكركم أن واجب syndic لشهر ${MONTHS[month - 1]} ${year} (${
    amount
  } درهم) لم يتم دفعه بعد.
— ${buildingName}`;
}

// ---- WhatsApp Link ----

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const countryCode = cleanPhone.startsWith("0") ? "212" + cleanPhone.slice(1) : cleanPhone;
  return `https://wa.me/${countryCode}?text=${encodeURIComponent(message)}`;
}

// ---- Email ----

export async function sendEmailNotification(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await getTransport().sendMail({
      from: getFromAddress(),
      to,
      subject,
      text: body,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    logger.error("notifications", `Échec envoi email à ${to}: ${msg}`);
    return { success: false, error: msg };
  }
}

// ---- Notification Log ----

export async function logSentNotification(
  type: string,
  channel: string,
  recipient: string,
  subject: string,
  message: string,
  buildingId?: number,
  residentId?: number,
  paymentId?: number,
  error?: string
) {
  return prisma.notificationLog.create({
    data: {
      type,
      channel,
      recipient,
      subject,
      message,
      buildingId: buildingId ?? null,
      residentId: residentId ?? null,
      paymentId: paymentId ?? null,
      status: error ? "failed" : "sent",
      error: error ?? null,
    },
  });
}

export async function getNotificationHistory(
  buildingId?: number,
  channel?: string,
  page = 1,
  pageSize = 50
) {
  const where: Record<string, unknown> = {};
  if (buildingId) where.buildingId = buildingId;
  if (channel) where.channel = channel;

  const [logs, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return { logs, total, page, pageSize };
}

// ---- Reminder actions ----

export async function sendPaymentReminder(
  paymentId: number,
  channel: "email" | "whatsapp" | "both"
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      resident: true,
      building: { select: { id: true, name: true } },
    },
  });
  if (!payment) throw new Error("Paiement introuvable");
  if (payment.status !== "UNPAID" && payment.status !== "PENDING") {
    throw new Error("Seuls les paiements impayés ou en attente peuvent être rappelés");
  }

  const results: { channel: string; success: boolean; link?: string }[] = [];
  const residentName = `${payment.resident.firstName} ${payment.resident.lastName}`;
  const msg = formatPaymentReminderMessage(
    residentName, payment.month, payment.year, payment.amount, payment.building.name, "fr"
  );

  if (channel === "email" || channel === "both") {
    const email = payment.resident.email;
    if (email) {
      const subject = `Rappel de paiement — ${MONTHS[payment.month - 1]} ${payment.year}`;
      const result = await sendEmailNotification(email, subject, msg);
      await logSentNotification(
        "payment_reminder", "email", email, subject, msg,
        payment.buildingId, payment.residentId, payment.id,
        result.error
      );
      results.push({ channel: "email", success: result.success });
    } else {
      results.push({ channel: "email", success: false });
    }
  }

  if (channel === "whatsapp" || channel === "both") {
    const phone = payment.resident.phone;
    if (phone) {
      const waMsg = formatWhatsAppReminder(
        residentName, payment.month, payment.year, payment.amount, payment.building.name
      );
      const link = generateWhatsAppLink(phone, waMsg);
      await logSentNotification(
        "payment_reminder", "whatsapp", phone, `WhatsApp — ${MONTHS[payment.month - 1]} ${payment.year}`,
        waMsg, payment.buildingId, payment.residentId, payment.id
      );
      results.push({ channel: "whatsapp", success: true, link });
    } else {
      results.push({ channel: "whatsapp", success: false });
    }
  }

  return results;
}

export async function sendBulkReminders(
  buildingId: number | undefined,
  month: number | undefined,
  year: number | undefined,
  channel: "email" | "whatsapp" | "both"
) {
  const where: Record<string, unknown> = { status: "UNPAID" };
  if (buildingId) where.buildingId = buildingId;
  if (month) where.month = month;
  if (year) where.year = year;

  const payments = await prisma.payment.findMany({
    where,
    include: {
      resident: true,
      building: { select: { id: true, name: true } },
    },
  });

  const results = [];
  for (const payment of payments) {
    try {
      const r = await sendPaymentReminder(payment.id, channel);
      results.push({ paymentId: payment.id, residentName: `${payment.resident.firstName} ${payment.resident.lastName}`, results: r });
    } catch (err) {
      results.push({ paymentId: payment.id, residentName: `${payment.resident.firstName} ${payment.resident.lastName}`, error: err instanceof Error ? err.message : "Erreur" });
    }
  }

  return { total: payments.length, sent: results };
}

export async function sendPaymentConfirmation(paymentId: number) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      resident: true,
      building: { select: { id: true, name: true } },
    },
  });
  if (!payment) throw new Error("Paiement introuvable");
  if (payment.status !== "PAID") throw new Error("Seuls les paiements vérifiés peuvent être confirmés");

  const email = payment.resident.email;
  if (!email) return { success: false, reason: "no_email" };

  const msg = formatPaymentConfirmationMessage(
    `${payment.resident.firstName} ${payment.resident.lastName}`,
    payment.month, payment.year, payment.amount, payment.building.name
  );
  const subject = `Confirmation de paiement — ${MONTHS[payment.month - 1]} ${payment.year}`;
  const result = await sendEmailNotification(email, subject, msg);
  await logSentNotification(
    "payment_confirmation", "email", email, subject, msg,
    payment.buildingId, payment.residentId, payment.id,
    result.error
  );

  return result;
}
