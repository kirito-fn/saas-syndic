import { prisma } from "../../db/client.js";
import { NotFoundError, ForbiddenError } from "../../lib/errors.js";
import type { CreateResidentInput, UpdateResidentInput } from "@syndic/shared";

interface PaginationParams {
  page: number;
  pageSize: number;
  buildingId?: number;
}

export async function getAllResidents(
  userId: number,
  role: string,
  userBuildingId: number | null,
  params: PaginationParams
) {
  const where: Record<string, unknown> = {};

  if (role === "MANAGER") {
    if (!userBuildingId) throw new ForbiddenError("Aucun bâtiment assigné");
    where.buildingId = userBuildingId;
  } else if (params.buildingId) {
    where.buildingId = params.buildingId;
  }

  const [residents, total] = await Promise.all([
    prisma.resident.findMany({
      where,
      include: {
        building: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
      orderBy: [{ buildingId: "asc" }, { apartment: "asc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.resident.count({ where }),
  ]);

  return { residents, total, page: params.page, pageSize: params.pageSize };
}

export async function getResidentById(id: number, role: string, userBuildingId: number | null) {
  const resident = await prisma.resident.findUnique({
    where: { id },
    include: {
      building: { select: { id: true, name: true } },
      payments: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 12,
      },
    },
  });

  if (!resident) throw new NotFoundError("Résident introuvable");

  if (role === "MANAGER" && resident.buildingId !== userBuildingId) {
    throw new ForbiddenError("Accès refusé à ce résident");
  }

  return resident;
}

export async function createResident(input: CreateResidentInput) {
  const building = await prisma.building.findUnique({ where: { id: input.buildingId } });
  if (!building) throw new NotFoundError("Bâtiment introuvable");

  return prisma.resident.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      apartment: input.apartment,
      phone: input.phone ?? null,
      email: input.email ?? null,
      buildingId: input.buildingId,
    },
    include: { building: { select: { id: true, name: true } } },
  });
}

export async function updateResident(id: number, input: UpdateResidentInput) {
  const existing = await prisma.resident.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Résident introuvable");

  if (input.buildingId) {
    const building = await prisma.building.findUnique({ where: { id: input.buildingId } });
    if (!building) throw new NotFoundError("Bâtiment introuvable");
  }

  return prisma.resident.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.apartment !== undefined && { apartment: input.apartment }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.buildingId !== undefined && { buildingId: input.buildingId }),
    },
    include: { building: { select: { id: true, name: true } } },
  });
}

export async function deleteResident(id: number) {
  const existing = await prisma.resident.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Résident introuvable");

  await prisma.payment.deleteMany({ where: { residentId: id } });
  await prisma.resident.delete({ where: { id } });
}
