import { Router, type Request, type Response, type NextFunction } from "express";
import { createBuildingSchema } from "@syndic/shared";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import * as buildingService from "./building.service.js";

const router = Router();

function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.get(
  "/",
  authenticate,
  wrap(async (req, res) => {
    const buildings = await buildingService.getAllBuildings(
      req.user!.id, req.user!.role, req.user!.buildingId
    );
    res.json(buildings);
  })
);

router.get(
  "/:id",
  authenticate,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const building = await buildingService.getBuildingById(id, req.user!.role, req.user!.buildingId);
    res.json(building);
  })
);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const input = createBuildingSchema.parse(req.body);
    const building = await buildingService.createBuilding(input);
    res.status(201).json(building);
  })
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const input = createBuildingSchema.partial().parse(req.body);
    const building = await buildingService.updateBuilding(id, input);
    res.json(building);
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const force = req.query.force === "true";
    await buildingService.deleteBuilding(id, force);
    res.status(204).end();
  })
);

export default router;
