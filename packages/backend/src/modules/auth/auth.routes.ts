import { Router, Request, Response, NextFunction } from "express";
import { loginSchema, createManagerSchema, changePasswordSchema, resetPasswordSchema } from "@syndic/shared";
import { login, getMe, createManager, listManagers, deleteManager, changePassword, resetManagerPassword, assignBuilding } from "./auth.service.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/roles.js";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await login(input);
    res.json(result);
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getMe(req.user!.id);
    res.json(user);
  })
);

router.post(
  "/signup",
  authenticate,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = createManagerSchema.parse(req.body);
    const user = await createManager(input);
    res.status(201).json(user);
  })
);

router.get(
  "/managers",
  authenticate,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const managers = await listManagers();
    res.json(managers);
  })
);

router.delete(
  "/managers/:id",
  authenticate,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    await deleteManager(id);
    res.status(204).end();
  })
);

router.put(
  "/managers/:id/assign-building",
  authenticate,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const { buildingId } = req.body;
    if (!buildingId || typeof buildingId !== "number") {
      res.status(400).json({ error: "buildingId requis" });
      return;
    }
    const result = await assignBuilding(id, buildingId);
    res.json(result);
  })
);

router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    await changePassword(req.user!.id, input.oldPassword, input.newPassword);
    res.json({ message: "Mot de passe modifié avec succès" });
  })
);

router.post(
  "/managers/:id/reset-password",
  authenticate,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const input = resetPasswordSchema.parse(req.body);
    const password = input.password || Math.random().toString(36).slice(2, 10) + "A1!";
    await resetManagerPassword(id, password);
    res.json({ password });
  })
);

export default router;
