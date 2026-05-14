import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../../middleware/auth.js";
import * as dashboardService from "./dashboard.service.js";

const router = Router();

function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.get(
  "/stats",
  authenticate,
  wrap(async (req, res) => {
    const buildingId = req.query.buildingId
      ? parseInt(req.query.buildingId as string, 10)
      : undefined;
    const month = req.query.month
      ? parseInt(req.query.month as string, 10)
      : undefined;
    const year = req.query.year
      ? parseInt(req.query.year as string, 10)
      : undefined;

    const stats = await dashboardService.getStats(
      req.user!.id, req.user!.role, req.user!.buildingId, buildingId, month, year
    );
    res.json(stats);
  })
);

export default router;
