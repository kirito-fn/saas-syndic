import { Router, type Request, type Response, type NextFunction } from "express";
import { createPaymentSchema, updatePaymentSchema } from "@syndic/shared";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";
import * as paymentService from "./payment.service.js";

const router = Router();

function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.get(
  "/",
  authenticate,
  wrap(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string, 10) || 50));
    const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string, 10) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const status = req.query.status as string | undefined;
    const residentId = req.query.residentId ? parseInt(req.query.residentId as string, 10) : undefined;

    const result = await paymentService.getAllPayments(
      req.user!.id, req.user!.role, req.user!.buildingId,
      { page, pageSize, buildingId, month, year, status, residentId }
    );
    res.json(result);
  })
);

router.get(
  "/:id",
  authenticate,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const payment = await paymentService.getPaymentById(id, req.user!.role, req.user!.buildingId);
    res.json(payment);
  })
);

router.post(
  "/",
  authenticate,
  wrap(async (req, res) => {
    const input = createPaymentSchema.parse(req.body);
    const payment = await paymentService.declarePayment(
      input, req.user!.id, req.user!.role, req.user!.buildingId
    );
    res.status(201).json(payment);
  })
);

router.put(
  "/:id",
  authenticate,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const input = updatePaymentSchema.parse(req.body);
    const payment = await paymentService.updatePayment(
      id, input, req.user!.id, req.user!.role, req.user!.buildingId
    );
    res.json(payment);
  })
);

router.patch(
  "/:id/verify",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const payment = await paymentService.verifyPayment(id, req.user!.id, req.user!.role);
    res.json(payment);
  })
);

router.patch(
  "/:id/unverify",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const payment = await paymentService.unverifyPayment(id, req.user!.id, req.user!.role);
    res.json(payment);
  })
);

router.patch(
  "/:id/reset",
  authenticate,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const payment = await paymentService.resetPayment(
      id, req.user!.id, req.user!.role, req.user!.buildingId
    );
    res.json(payment);
  })
);

router.patch(
  "/:id/mark-unpaid",
  authenticate,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const payment = await paymentService.markAsUnpaid(id, req.user!.id, req.user!.role, req.user!.buildingId);
    res.json(payment);
  })
);

router.patch(
  "/:id/no-payment",
  authenticate,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const payment = await paymentService.toggleNoPaymentFlag(id, req.user!.id, req.user!.role, req.user!.buildingId);
    res.json(payment);
  })
);

router.get(
  "/:id/logs",
  authenticate,
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const logs = await paymentService.getPaymentLogs(id, req.user!.role, req.user!.buildingId);
    res.json(logs);
  })
);

router.post(
  "/:id/status",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const { newStatus, reason } = req.body;
    const payment = await paymentService.changePaymentStatus(id, newStatus, reason, req.user!.id);
    res.json(payment);
  })
);

router.post(
  "/generate",
  authenticate,
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const result = await paymentService.generateMonthlyPayments(year, month, req.user!.id, req.user!.role);
    res.json(result);
  })
);

export default router;
