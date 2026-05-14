import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import { generateMonthlyReport } from "./export.service.js";

const router = Router();

function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.get(
  "/monthly",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();

    const workbook = await generateMonthlyReport(month, year, req.user!.role, req.user!.buildingId);

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="rapport-mensuel-${month}-${year}.xlsx"`);
    res.send(buffer);
  })
);

export default router;
