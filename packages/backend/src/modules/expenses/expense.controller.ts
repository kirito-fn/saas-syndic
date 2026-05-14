import { Router, type Request, type Response, type NextFunction } from "express";
import { createExpenseSchema, updateExpenseSchema } from "@syndic/shared";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import * as expenseService from "./expense.service.js";

const router = Router();

function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 50));
    const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string, 10) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    const result = await expenseService.getAllExpenses(req.user!.role, req.user!.buildingId, {
      page, pageSize, buildingId, month, year,
    });
    res.json(result);
  })
);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const input = createExpenseSchema.parse(req.body);
    const expense = await expenseService.createExpense(input, req.user!.id);
    res.status(201).json(expense);
  })
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const input = updateExpenseSchema.parse(req.body);
    const expense = await expenseService.updateExpense(id, input);
    res.json(expense);
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await expenseService.deleteExpense(id);
    res.status(204).end();
  })
);

export default router;
