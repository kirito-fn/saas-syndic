import { z } from "zod";
import { PAYMENT_STATUS, USER_ROLE } from "../constants.js";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const createPaymentSchema = z.object({
  residentId: z.number({ message: "Résident requis" }).int().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024).max(2030),
  notes: z.string().max(500).optional(),
  directPaid: z.boolean().optional(),
});

export const updatePaymentSchema = z.object({
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2024).max(2030).optional(),
  notes: z.string().max(500).optional(),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.number().int().positive(),
});

export const createExpenseSchema = z.object({
  title: z.string().min(1, "Titre requis").max(200),
  description: z.string().max(1000).optional(),
  amount: z.number().positive("Montant doit être positif"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date au format YYYY-MM-DD"),
  buildingId: z.number().int().positive().optional().nullable(),
});

export const updateExpenseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  amount: z.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  buildingId: z.number().int().positive().optional().nullable(),
});

export const createBuildingSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  address: z.string().max(500).optional(),
});

export const createResidentSchema = z.object({
  firstName: z.string().min(1, "Prénom requis").max(100),
  lastName: z.string().min(1, "Nom requis").max(100),
  apartment: z.string().min(1, "Appartement requis").max(50),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email invalide").max(200).optional(),
  buildingId: z.number({ message: "Bâtiment requis" }).int().positive(),
});

export const updateResidentSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  apartment: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email invalide").max(200).optional(),
  buildingId: z.number().int().positive().optional(),
});

export const createManagerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Minimum 6 caractères"),
  name: z.string().min(1, "Nom requis").max(100),
  buildingId: z.number({ message: "Bâtiment requis" }).int().positive(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(6, "Minimum 6 caractères"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Minimum 6 caractères").optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type CreateResidentInput = z.infer<typeof createResidentSchema>;
export type UpdateResidentInput = z.infer<typeof updateResidentSchema>;
export type CreateManagerInput = z.infer<typeof createManagerSchema>;
