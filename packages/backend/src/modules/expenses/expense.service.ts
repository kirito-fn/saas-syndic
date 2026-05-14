import { prisma } from "../../db/client.js";
import { NotFoundError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import type { CreateExpenseInput, UpdateExpenseInput } from "@syndic/shared";

export async function getAllExpenses(
  role: string,
  _userBuildingId: number | null,
  params: { buildingId?: number; month?: number; year?: number; page: number; pageSize: number }
) {
  const where: Record<string, unknown> = {};

  if (params.buildingId) {
    where.buildingId = params.buildingId;
  }

  if (params.month || params.year) {
    const now = new Date();
    const y = params.year || now.getFullYear();
    const m = params.month || 1;
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        building: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.expense.count({ where }),
  ]);

  return { expenses, total, page: params.page, pageSize: params.pageSize };
}

export async function createExpense(input: CreateExpenseInput, userId: number) {
  if (input.buildingId) {
    const building = await prisma.building.findUnique({ where: { id: input.buildingId } });
    if (!building) throw new NotFoundError("Bâtiment introuvable");
  }

  const expense = await prisma.expense.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      amount: input.amount,
      date: new Date(input.date),
      buildingId: input.buildingId ?? null,
      createdById: userId,
    },
    include: {
      building: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  logger.info("expenses", `Charge créée #${expense.id}: ${input.title} ${input.amount} MAD`);
  return expense;
}

export async function updateExpense(id: number, input: UpdateExpenseInput) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Charge introuvable");

  if (input.buildingId !== undefined && input.buildingId !== null) {
    const building = await prisma.building.findUnique({ where: { id: input.buildingId } });
    if (!building) throw new NotFoundError("Bâtiment introuvable");
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.date !== undefined && { date: new Date(input.date) }),
      ...(input.buildingId !== undefined && { buildingId: input.buildingId }),
    },
    include: {
      building: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  logger.info("expenses", `Charge #${id} modifiée`);
  return updated;
}

export async function deleteExpense(id: number) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Charge introuvable");

  await prisma.expense.delete({ where: { id } });
  logger.info("expenses", `Charge #${id} supprimée`);
}
