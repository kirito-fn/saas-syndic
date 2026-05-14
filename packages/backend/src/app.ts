import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/error.js";
import authRoutes from "./modules/auth/auth.routes.js";
import buildingRoutes from "./modules/buildings/building.controller.js";
import residentRoutes from "./modules/residents/resident.controller.js";
import paymentRoutes from "./modules/payments/payment.controller.js";
import expenseRoutes from "./modules/expenses/expense.controller.js";
import dashboardRoutes from "./modules/dashboard/dashboard.controller.js";
import exportRoutes from "./modules/export/export.controller.js";
import importRoutes from "./modules/import/import.controller.js";
import notificationRoutes from "./modules/notifications/notification.controller.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/buildings", buildingRoutes);
  app.use("/api/residents", residentRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/expenses", expenseRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/export", exportRoutes);
  app.use("/api/import", importRoutes);
  app.use("/api/notifications", notificationRoutes);

  app.use(errorHandler);

  return app;
}
