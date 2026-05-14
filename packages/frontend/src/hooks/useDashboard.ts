import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard.api.js";

export function useDashboardStats(buildingId?: number, month?: number, year?: number) {
  return useQuery({
    queryKey: ["dashboard", buildingId, month, year],
    queryFn: () => dashboardApi.getStats(buildingId, month, year),
  });
}
