import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@syndic/shared";
import { UnauthorizedError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

interface JwtPayload {
  userId: number;
  email: string;
  name: string;
  role: string;
  buildingId: number | null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Token manquant"));
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role as UserRole,
      buildingId: decoded.buildingId,
    };
    next();
  } catch {
    logger.warn("auth", "Tentative de connexion avec token invalide");
    return next(new UnauthorizedError("Token invalide ou expiré"));
  }
}
