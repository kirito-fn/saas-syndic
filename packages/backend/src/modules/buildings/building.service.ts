import { prisma } from "../../db/client.js";
import { NotFoundError, ForbiddenError } from "../../lib/errors.js";
import type { CreateBuildingInput } from "@syndic/shared";

export async function getAllBuildings(userId: number, role: string, buildingId: number | null) {
  if (role === "MANAGER") {
    if (!buildingId) throw new ForbiddenError("Aucun bâtiment assigné");
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { manager: { select: { id: true, name: true, email: true } } },
    });
    if (!building) throw new NotFoundError("Bâtiment introuvable");
    return [building];
  }

  return prisma.building.findMany({
    include: {
      _count: { select: { residents: true, payments: true } },
      manager: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getBuildingById(id: number, role: string, userBuildingId: number | null) {
  if (role === "MANAGER" && id !== userBuildingId) {
    throw new ForbiddenError("Accès refusé à ce bâtiment");
  }

  const building = await prisma.building.findUnique({
    where: { id },
    include: {
      _count: { select: { residents: true, payments: true } },
      manager: { select: { id: true, name: true, email: true } },
      residents: {
        select: { id: true, firstName: true, lastName: true, apartment: true },
        orderBy: { apartment: "asc" },
      },
    },
  });

  if (!building) throw new NotFoundError("Bâtiment introuvable");
  return building;
}

export async function createBuilding(input: CreateBuildingInput) {
  return prisma.building.create({
    data: { name: input.name, address: input.address ?? null },
  });
}

export async function updateBuilding(id: number, input: Partial<CreateBuildingInput>) {
  const existing = await prisma.building.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Bâtiment introuvable");

  return prisma.building.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.address !== undefined && { address: input.address }),
    },
  });
}

export async function deleteBuilding(id: number, force = false) {
  const existing = await prisma.building.findUnique({
    where: { id },
    include: { _count: { select: { residents: true, expenses: true } } },
  });
  if (!existing) throw new NotFoundError("Bâtiment introuvable");

  if (!force) {
    const warnings: string[] = [];
    if (existing._count.residents > 0) {
      warnings.push(`${existing._count.residents} résident(s) lié(s)`);
    }
    if (existing._count.expenses > 0) {
      warnings.push(`${existing._count.expenses} charge(s) liée(s)`);
    }
    const managerCount = await prisma.user.count({ where: { buildingId: id } });
    if (managerCount > 0) {
      warnings.push(`${managerCount} gestionnaire(s) lié(s)`);
    }
    if (warnings.length > 0) {
      throw new ForbiddenError(
        `Impossible de supprimer : ${warnings.join(", ")}. Utilisez ?force=true pour supprimer en cascade.`
      );
    }
  }

  await prisma.user.updateMany({
    where: { buildingId: id },
    data: { buildingId: null },
  });
  await prisma.notificationLog.deleteMany({ where: { buildingId: id } });
  await prisma.notification.deleteMany({ where: { buildingId: id } });
  await prisma.expense.deleteMany({ where: { buildingId: id } });
  const paymentIds = (await prisma.payment.findMany({ where: { buildingId: id }, select: { id: true } })).map(p => p.id);
  await prisma.paymentLog.deleteMany({ where: { paymentId: { in: paymentIds } } });
  await prisma.payment.deleteMany({ where: { buildingId: id } });
  await prisma.resident.deleteMany({ where: { buildingId: id } });
  await prisma.building.delete({ where: { id } });
}
