import { api } from "./client.js";

export interface DashboardStats {
  totalResidents: number;
  totalPaid: number;
  totalPending: number;
  totalUnpaid: number;
  monthlyBreakdown: {
    month: number;
    year: number;
    collected: number;
    expenses: number;
    balance: number;
  }[];
  totalCollected: number;
  totalExpenses: number;
  currentBalance: number;
}

export const dashboardApi = {
  getStats: (buildingId?: number, month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (buildingId) params.set("buildingId", String(buildingId));
    if (month) params.set("month", String(month));
    if (year) params.set("year", String(year));
    const qs = params.toString();
    return api.get<DashboardStats>(`/dashboard/stats${qs ? `?${qs}` : ""}`);
  },
};
