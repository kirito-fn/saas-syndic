import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/client.js";
import { UnauthorizedError, ConflictError, NotFoundError, ForbiddenError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import type { LoginInput, CreateManagerInput } from "@syndic/shared";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = "24h";

interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    buildingId: number | null;
    building?: { id: number; name: string } | null;
  };
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      building: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    logger.warn("auth", `Tentative connexion email inconnu: ${input.email}`);
    throw new UnauthorizedError("Email ou mot de passe incorrect");
  }

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) {
    logger.warn("auth", `Mot de passe incorrect pour: ${input.email}`);
    throw new UnauthorizedError("Email ou mot de passe incorrect");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      buildingId: user.buildingId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  logger.info("auth", `Utilisateur ${user.email} connecté`);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      buildingId: user.buildingId,
      building: user.building,
    },
  };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      buildingId: true,
      building: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    throw new UnauthorizedError("Utilisateur introuvable");
  }

  return user;
}

export async function createManager(input: CreateManagerInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("Un utilisateur avec cet email existe déjà");
  }

  const building = await prisma.building.findUnique({
    where: { id: input.buildingId },
    include: { manager: { select: { id: true, name: true } } },
  });
  if (!building) {
    throw new NotFoundError("Bâtiment introuvable");
  }
  if (building.manager) {
    throw new ConflictError(`Ce bâtiment a déjà un gestionnaire : ${building.manager.name}`);
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role: "MANAGER",
      buildingId: input.buildingId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      buildingId: true,
      building: { select: { id: true, name: true } },
    },
  });

  logger.info("auth", `Gestionnaire créé: ${user.email} pour bâtiment ${building.name}`);

  return user;
}

export async function listManagers() {
  return prisma.user.findMany({
    where: { role: "MANAGER" },
    select: {
      id: true,
      email: true,
      name: true,
      buildingId: true,
      building: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function deleteManager(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "MANAGER") {
    throw new NotFoundError("Gestionnaire introuvable");
  }

  await prisma.user.update({
    where: { id },
    data: { buildingId: null },
  });

  await prisma.user.delete({ where: { id } });

  logger.info("auth", `Gestionnaire supprimé: ${user.email}`);
}

export async function changePassword(userId: number, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("Utilisateur introuvable");

  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) throw new UnauthorizedError("Mot de passe actuel incorrect");

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  logger.info("auth", `Mot de passe modifié pour ${user.email}`);
}

export async function assignBuilding(managerId: number, buildingId: number) {
  const user = await prisma.user.findUnique({ where: { id: managerId } });
  if (!user || user.role !== "MANAGER") throw new NotFoundError("Gestionnaire introuvable");
  if (user.buildingId) throw new ConflictError("Ce gestionnaire a déjà un bâtiment assigné");

  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    include: { manager: { select: { id: true, name: true } } },
  });
  if (!building) throw new NotFoundError("Bâtiment introuvable");
  if (building.manager) {
    throw new ConflictError(`Ce bâtiment a déjà un gestionnaire : ${building.manager.name}`);
  }

  const updated = await prisma.user.update({
    where: { id: managerId },
    data: { buildingId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      buildingId: true,
      building: { select: { id: true, name: true } },
    },
  });

  logger.info("auth", `Bâtiment assigné: ${user.email} → ${building.name}`);
  return updated;
}

export async function resetManagerPassword(managerId: number, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: managerId } });
  if (!user || user.role !== "MANAGER") throw new NotFoundError("Gestionnaire introuvable");

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: managerId }, data: { password: hashed } });

  logger.info("auth", `Mot de passe réinitialisé pour ${user.email}`);
}
