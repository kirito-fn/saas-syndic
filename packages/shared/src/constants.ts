export const MONTHLY_FEE = 100;

export const PAYMENT_STATUS = {
  UNPAID: "UNPAID",
  PENDING: "PENDING",
  PAID: "PAID",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const USER_ROLE = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
] as const;

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Impayé",
  PENDING: "En attente de vérification",
  PAID: "Payé / Vérifié",
};

export const STATUS_COLORS: Record<PaymentStatus, string> = {
  UNPAID: "red",
  PENDING: "orange",
  PAID: "green",
};
