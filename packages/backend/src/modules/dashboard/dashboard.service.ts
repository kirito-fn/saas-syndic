import { prisma } from "../../db/client.js";
import { ForbiddenError } from "../../lib/errors.js";

export async function getStats(
  userId: number, role: string, userBuildingId: number | null,
  buildingId?: number, month?: number, year?: number
) {
  const effectiveBuildingId = role === "MANAGER" ? userBuildingId : buildingId;

  if (role === "MANAGER" && !effectiveBuildingId) {
    throw new ForbiddenError("Aucun bâtiment assigné");
  }

  const residentWhere: Record<string, unknown> = effectiveBuildingId ? { buildingId: effectiveBuildingId } : {};
  const paymentWhere: Record<string, unknown> = effectiveBuildingId ? { buildingId: effectiveBuildingId } : {};
  if (month) paymentWhere.month = month;
  if (year) paymentWhere.year = year;

  const [totalResidents, payments] = await Promise.all([
    prisma.resident.count({ where: residentWhere }),
    prisma.payment.findMany({
      where: paymentWhere,
      select: { status: true, amount: true, month: true, year: true },
    }),
  ]);

  const totalPaid = payments.filter((p) => p.status === "PAID").length;
  const totalPending = payments.filter((p) => p.status === "PENDING").length;
  const totalUnpaid = payments.filter((p) => p.status === "UNPAID").length;
  const totalCollected = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  const monthMap = new Map<string, { collected: number }>();

  for (const p of payments) {
    if (p.status !== "PAID") continue;
    const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
    const entry = monthMap.get(key) || { collected: 0 };
    entry.collected += p.amount;
    monthMap.set(key, entry);
  }

  const monthlyBreakdown = Array.from(monthMap.entries())
    .map(([key, data]) => {
      const [yearStr, monthStr] = key.split("-");
      return {
        year: parseInt(yearStr, 10),
        month: parseInt(monthStr, 10),
        collected: data.collected,
        expenses: 0,
        balance: data.collected,
      };
    })
    .sort((a, b) => b.year - a.year || b.month - a.month);

  const base = {
    totalResidents,
    totalPaid,
    totalPending,
    totalUnpaid,
    monthlyBreakdown,
  };

  if (role === "ADMIN") {
    const expenseWhere: Record<string, unknown> = {};
    if (effectiveBuildingId) {
      expenseWhere.OR = [
        { buildingId: effectiveBuildingId },
        { buildingId: null },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      select: { amount: true, date: true, buildingId: true },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const currentBalance = totalCollected - totalExpenses;

    const adminBreakdown = monthlyBreakdown.map((b) => ({ ...b }));
    const expenseMonthMap = new Map<string, number>();
    for (const e of expenses) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      expenseMonthMap.set(key, (expenseMonthMap.get(key) || 0) + e.amount);
    }
    for (const b of adminBreakdown) {
      const key = `${b.year}-${String(b.month).padStart(2, "0")}`;
      const exp = expenseMonthMap.get(key) || 0;
      b.expenses = exp;
      b.balance = b.collected - exp;
    }

    return {
      ...base,
      totalCollected,
      totalExpenses,
      currentBalance,
      monthlyBreakdown: adminBreakdown,
    };
  }

  return {
    ...base,
    totalCollected: 0,
    totalExpenses: 0,
    currentBalance: 0,
    monthlyBreakdown: base.monthlyBreakdown,
  };
}
