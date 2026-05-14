import { prisma } from "../../db/client.js";
import { MONTHLY_FEE, PAYMENT_STATUS } from "@syndic/shared";
import { NotFoundError, ForbiddenError, ConflictError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import type { CreatePaymentInput, UpdatePaymentInput, PaymentStatus } from "@syndic/shared";
import { MONTHS } from "@syndic/shared";
import * as notificationService from "../notifications/notification.service.js";

interface QueryParams {
  buildingId?: number;
  month?: number;
  year?: number;
  status?: string;
  page: number;
  pageSize: number;
  residentId?: number;
}

async function verifyBuildingAccess(
  buildingId: number,
  role: string,
  userBuildingId: number | null
): Promise<void> {
  if (role === "MANAGER" && buildingId !== userBuildingId) {
    throw new ForbiddenError("Accès refusé à ce bâtiment");
  }
}

export async function getAllPayments(
  userId: number,
  role: string,
  userBuildingId: number | null,
  params: QueryParams
) {
  const where: Record<string, unknown> = {};

  if (role === "MANAGER") {
    if (!userBuildingId) throw new ForbiddenError("Aucun bâtiment assigné");
    where.buildingId = userBuildingId;
  } else if (params.buildingId) {
    where.buildingId = params.buildingId;
  }

  if (params.month) where.month = params.month;
  if (params.year) where.year = params.year;
  if (params.status) where.status = params.status;
  if (params.residentId) where.residentId = params.residentId;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, apartment: true } },
        building: { select: { id: true, name: true } },
        declaredBy: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { resident: { lastName: "asc" } }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, total, page: params.page, pageSize: params.pageSize };
}

export async function getPaymentById(id: number, role: string, userBuildingId: number | null) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, apartment: true } },
      building: { select: { id: true, name: true } },
      declaredBy: { select: { id: true, name: true } },
      verifiedBy: { select: { id: true, name: true } },
    },
  });

  if (!payment) throw new NotFoundError("Paiement introuvable");
  if (role === "MANAGER" && payment.buildingId !== userBuildingId) {
    throw new ForbiddenError("Accès refusé à ce paiement");
  }

  return payment;
}

export async function declarePayment(
  input: CreatePaymentInput,
  userId: number,
  role: string,
  userBuildingId: number | null
) {
  const resident = await prisma.resident.findUnique({
    where: { id: input.residentId },
    include: { building: { select: { id: true } } },
  });
  if (!resident) throw new NotFoundError("Résident introuvable");

  await verifyBuildingAccess(resident.buildingId, role, userBuildingId);

  const existing = await prisma.payment.findUnique({
    where: { residentId_month_year: { residentId: input.residentId, month: input.month, year: input.year } },
  });

  if (existing) {
    throw new ConflictError("Un paiement existe déjà pour ce résident sur cette période");
  }

  const directPaid = input.directPaid && role === "ADMIN";
  const payment = await prisma.payment.create({
    data: {
      residentId: input.residentId,
      buildingId: resident.buildingId,
      month: input.month,
      year: input.year,
      amount: MONTHLY_FEE,
      status: directPaid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
      declaredById: userId,
      declaredAt: new Date(),
      verifiedById: directPaid ? userId : null,
      verifiedAt: directPaid ? new Date() : null,
      notes: input.notes ?? null,
    },
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, apartment: true } },
      building: { select: { id: true, name: true } },
    },
  });

  logger.info("payments", `Paiement déclaré #${payment.id} - résident #${input.residentId} ${input.month}/${input.year}${directPaid ? " (payé directement)" : ""}`);

  await prisma.notification.create({
    data: {
      type: directPaid ? "payment_confirmed" : "payment_declared",
      title: directPaid ? "Paiement confirmé" : "Nouveau paiement déclaré",
      message: `${payment.building?.name || "—"} — ${payment.resident.firstName} ${payment.resident.lastName} : ${directPaid ? "paiement confirmé" : "paiement déclaré"} pour ${MONTHS[input.month - 1]} ${input.year}`,
      buildingId: resident.buildingId,
    },
  });

  return payment;
}

export async function updatePayment(
  id: number,
  input: UpdatePaymentInput,
  userId: number,
  role: string,
  userBuildingId: number | null
) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Paiement introuvable");

  await verifyBuildingAccess(payment.buildingId, role, userBuildingId);

  if (payment.status === PAYMENT_STATUS.PAID && role === "MANAGER") {
    throw new ForbiddenError("Ce paiement a été vérifié et ne peut plus être modifié");
  }

  const data: Record<string, unknown> = {};
  if (input.month !== undefined && input.month !== payment.month) {
    const conflict = await prisma.payment.findFirst({
      where: {
        residentId: payment.residentId,
        month: input.month,
        year: input.year ?? payment.year,
        id: { not: id },
      },
    });
    if (conflict) throw new ConflictError("Un paiement existe déjà pour ce résident sur cette période");
    data.month = input.month;
  }
  if (input.year !== undefined) data.year = input.year;
  if (input.notes !== undefined) data.notes = input.notes;

  const updated = await prisma.payment.update({
    where: { id },
    data,
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, apartment: true } },
      building: { select: { id: true, name: true } },
    },
  });

  logger.info("payments", `Paiement #${id} modifié`);
  return updated;
}

export async function verifyPayment(id: number, userId: number, role: string) {
  if (role !== "ADMIN") throw new ForbiddenError("Seul l'admin peut vérifier les paiements");

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Paiement introuvable");

  if (payment.status !== PAYMENT_STATUS.PENDING) {
    throw new ForbiddenError("Seuls les paiements en attente peuvent être vérifiés");
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: PAYMENT_STATUS.PAID,
      verifiedById: userId,
      verifiedAt: new Date(),
    },
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, apartment: true } },
      building: { select: { id: true, name: true } },
      declaredBy: { select: { id: true, name: true } },
      verifiedBy: { select: { id: true, name: true } },
    },
  });

  logger.info("payments", `Paiement #${id} vérifié par admin #${userId}`);

  await notificationService.createNotification(
    "payment_verified",
    "Paiement vérifié",
    `${updated.building?.name || "—"} — ${updated.resident.firstName} ${updated.resident.lastName} : paiement vérifié pour ${MONTHS[updated.month - 1]} ${updated.year}`,
    updated.buildingId
  );

  return updated;
}

export async function unverifyPayment(id: number, userId: number, role: string) {
  if (role !== "ADMIN") throw new ForbiddenError("Seul l'admin peut modifier un paiement vérifié");

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Paiement introuvable");

  if (payment.status !== PAYMENT_STATUS.PAID) {
    throw new ForbiddenError("Ce paiement n'est pas vérifié");
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: PAYMENT_STATUS.PENDING,
      verifiedById: null,
      verifiedAt: null,
    },
  });

  logger.warn("payments", `Paiement #${id} dé-vérifié par admin #${userId}`);
  return updated;
}

export async function resetPayment(id: number, userId: number, role: string, userBuildingId: number | null) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Paiement introuvable");

  await verifyBuildingAccess(payment.buildingId, role, userBuildingId);

  if (payment.status === PAYMENT_STATUS.PAID && role !== "ADMIN") {
    throw new ForbiddenError("Seul l'admin peut réinitialiser un paiement vérifié");
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: PAYMENT_STATUS.UNPAID,
      declaredById: null,
      declaredAt: null,
      verifiedById: null,
      verifiedAt: null,
      notes: null,
    },
  });

  logger.warn("payments", `Paiement #${id} réinitialisé par utilisateur #${userId}`);

  await notificationService.createNotification(
    "payment_reset",
    "Paiement réinitialisé",
    `Paiement #${id} réinitialisé au statut impayé par ${role === "ADMIN" ? "admin" : "gestionnaire"}`,
    payment.buildingId
  );

  return updated;
}

export async function generateMonthlyPayments(
  year: number,
  month: number,
  adminId: number,
  role: string
) {
  if (role !== "ADMIN") throw new ForbiddenError("Seul l'admin peut générer les paiements mensuels");

  const residents = await prisma.resident.findMany({
    include: { building: { select: { id: true } } },
  });

  let created = 0;
  let skipped = 0;

  for (const resident of residents) {
    const existing = await prisma.payment.findUnique({
      where: { residentId_month_year: { residentId: resident.id, month, year } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.payment.create({
      data: {
        residentId: resident.id,
        buildingId: resident.building.id,
        month,
        year,
        amount: MONTHLY_FEE,
        status: PAYMENT_STATUS.UNPAID,
      },
    });
    created++;
  }

  logger.info("payments", `Génération mensuelle ${month}/${year}: ${created} créés, ${skipped} existants`);

  await notificationService.createNotification(
    "payments_generated",
    "Paiements mensuels générés",
    `${created} paiements générés pour ${MONTHS[month - 1]} ${year} (${skipped} existants ignorés)`
  );

  return { created, skipped, total: residents.length };
}

export async function getPaymentLogs(id: number, role: string, userBuildingId: number | null) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Paiement introuvable");
  if (role === "MANAGER" && payment.buildingId !== userBuildingId) {
    throw new ForbiddenError("Accès refusé à ce paiement");
  }

  return prisma.paymentLog.findMany({
    where: { paymentId: id },
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function markAsUnpaid(id: number, userId: number, role: string, userBuildingId: number | null) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Paiement introuvable");

  if (role === "MANAGER" && payment.buildingId !== userBuildingId) {
    throw new ForbiddenError("Accès refusé à ce paiement");
  }

  if (payment.status === PAYMENT_STATUS.PAID && role !== "ADMIN") {
    throw new ForbiddenError("Seul l'admin peut modifier un paiement vérifié");
  }

  if (payment.status === PAYMENT_STATUS.UNPAID) {
    throw new Error("Le paiement est déjà en statut impayé");
  }

  const [updated] = await prisma.$transaction([
    prisma.payment.update({
      where: { id },
      data: { status: PAYMENT_STATUS.UNPAID, noPaymentAt: null },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, apartment: true } },
        building: { select: { id: true, name: true } },
      },
    }),
    prisma.paymentLog.create({
      data: {
        paymentId: id,
        oldStatus: payment.status,
        newStatus: PAYMENT_STATUS.UNPAID,
        reason: "Marqué impayé par le gestionnaire",
        changedById: userId,
      },
    }),
  ]);

  logger.info("payments", `Paiement #${id} marqué impayé par utilisateur #${userId}`);

  await notificationService.createNotification(
    "payment_marked_unpaid",
    "Paiement marqué impayé",
    `Paiement #${id} — ${updated.resident.firstName} ${updated.resident.lastName} : ${payment.status} → UNPAID`,
    updated.buildingId
  );

  return updated;
}

export async function toggleNoPaymentFlag(id: number, userId: number, role: string, userBuildingId: number | null) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Paiement introuvable");

  if (role === "MANAGER" && payment.buildingId !== userBuildingId) {
    throw new ForbiddenError("Accès refusé à ce paiement");
  }

  if (payment.status !== PAYMENT_STATUS.UNPAID) {
    throw new Error("Seuls les paiements impayés peuvent être marqués");
  }

  const flagged = payment.noPaymentAt !== null;
  const updated = await prisma.payment.update({
    where: { id },
    data: { noPaymentAt: flagged ? null : new Date() },
    include: {
      resident: { select: { id: true, firstName: true, lastName: true, apartment: true } },
      building: { select: { id: true, name: true } },
    },
  });

  logger.info("payments", flagged
    ? `Paiement #${id} — marqueur "Sans paiement" retiré par utilisateur #${userId}`
    : `Paiement #${id} — marqué "Sans paiement" par utilisateur #${userId}`
  );

  return updated;
}

export async function changePaymentStatus(
  id: number,
  newStatus: string,
  reason: string | undefined,
  userId: number
) {
  if (![PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PAID].includes(newStatus as any)) {
    throw new Error("Statut invalide");
  }

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Paiement introuvable");

  if (payment.status === newStatus) {
    throw new Error("Le paiement a déjà ce statut");
  }

  const [updated] = await prisma.$transaction([
    prisma.payment.update({
      where: { id },
      data: {
        status: newStatus,
        noPaymentAt: null,
        ...(newStatus === PAYMENT_STATUS.PAID
          ? { verifiedById: userId, verifiedAt: new Date() }
          : {}),
      },
      include: {
        resident: { select: { id: true, firstName: true, lastName: true, apartment: true } },
        building: { select: { id: true, name: true } },
      },
    }),
    prisma.paymentLog.create({
      data: {
        paymentId: id,
        oldStatus: payment.status,
        newStatus,
        reason: reason ?? null,
        changedById: userId,
      },
    }),
  ]);

  logger.info("payments", `Paiement #${id} statut modifié: ${payment.status} → ${newStatus} par admin #${userId}`);

  await notificationService.createNotification(
    "payment_status_changed",
    "Statut de paiement modifié",
    `Paiement #${id} — ${updated.resident.firstName} ${updated.resident.lastName} : ${payment.status} → ${newStatus}${reason ? ` (${reason})` : ""}`,
    updated.buildingId
  );

  return updated;
}
