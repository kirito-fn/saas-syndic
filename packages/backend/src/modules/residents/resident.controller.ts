import { Router, type Request, type Response, type NextFunction } from "express";
import { createResidentSchema, updateResidentSchema } from "@syndic/shared";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import * as residentService from "./resident.service.js";

const router = Router();

function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.get(
  "/",
  authenticate,
  wrap(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 50));
    const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string, 10) : undefined;

    const result = await residentService.getAllResidents(
      req.user!.id,
      req.user!.role,
      req.user!.buildingId,
      { page, pageSize, buildingId }
    );
    res.json(result);
  })
);

router.get(
  "/:id",
  authenticate,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const resident = await residentService.getResidentById(id, req.user!.role, req.user!.buildingId);
    res.json(resident);
  })
);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const input = createResidentSchema.parse(req.body);
    const resident = await residentService.createResident(input);
    res.status(201).json(resident);
  })
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const input = updateResidentSchema.parse(req.body);
    const resident = await residentService.updateResident(id, input);
    res.json(resident);
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    await residentService.deleteResident(id);
    res.status(204).end();
  })
);

export default router;
