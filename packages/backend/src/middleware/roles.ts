import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../lib/errors.js";

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError("Non authentifié"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("Accès refusé : rôle insuffisant"));
    }
    next();
  };
}

export function requireBuildingAccess() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError("Non authentifié"));
    }
    if (req.user.role === "ADMIN") {
      return next();
    }

    const buildingId = parseInt(
      req.params.buildingId || req.query.buildingId as string || req.body?.buildingId
    );

    if (!buildingId || buildingId !== req.user.buildingId) {
      return next(new ForbiddenError("Accès refusé à ce bâtiment"));
    }
    next();
  };
}
