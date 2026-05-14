import { useState } from "react";
import { useDashboardStats } from "../hooks/useDashboard.js";
import { useAuth } from "../lib/auth.js";
import { usePreview } from "../lib/preview.js";
import { useBuildings } from "../hooks/useBuildings.js";
import type { Building } from "../api/buildings.api.js";
import StatsCards, { FinanceSummary } from "../components/dashboard/StatsCards.js";
import MonthlyBreakdown from "../components/dashboard/MonthlyBreakdown.js";
import BuildingProgress from "../components/dashboard/BuildingProgress.js";
import { Skeleton } from "../components/ui/Skeleton.js";
import { downloadMonthlyReport } from "../api/export.api.js";
import { toast } from "../components/ui/Toast.js";
import { getCurrentMonth, getCurrentYear } from "../lib/utils.js";
import { MONTHS } from "@syndic/shared";

export default function DashboardPage() {
  const { user } = useAuth();
  const { previewBuildingId } = usePreview();
  const { data: buildings } = useBuildings();
  const buildingId = user?.role === "MANAGER"
    ? user.buildingId ?? undefined
    : previewBuildingId ?? undefined;
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const { data: stats, isLoading } = useDashboardStats(buildingId, filterMonth, filterYear);
  const previewBuilding = previewBuildingId && Array.isArray(buildings)
    ? buildings.find((b: Building) => b.id === previewBuildingId)
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-gray-400 mt-1">
            {user?.role === "ADMIN" && previewBuilding
              ? `Aperçu — ${previewBuilding.name}`
              : user?.role === "ADMIN"
              ? "Vue globale — tous les bâtiments"
              : `Vue gestionnaire — ${user?.building?.name || ""}`}
          </p>
        </div>
        {user?.role === "ADMIN" && (
          <button
            onClick={() => downloadMonthlyReport(getCurrentMonth(), getCurrentYear()).catch((e) => toast(e.message, "error"))}
            className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-gray-700 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm shrink-0 self-start sm:self-auto"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Excel
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={filterMonth ?? ""} onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-9 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
          <option value="">Tous les mois</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear ?? ""} onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-9 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
          <option value="">Toutes les années</option>
          {(() => { const c = getCurrentYear(); const ys: number[] = []; for (let y = c - 3; y <= c; y++) ys.push(y); return ys.map((y) => <option key={y} value={y}>{y}</option>); })()}
        </select>
      </div>

      <StatsCards
        totalResidents={stats.totalResidents}
        totalPaid={stats.totalPaid}
        totalPending={stats.totalPending}
        totalUnpaid={stats.totalUnpaid}
        totalCollected={stats.totalCollected}
        totalExpenses={stats.totalExpenses}
        currentBalance={stats.currentBalance}
      />

      {user?.role === "ADMIN" && (
        <FinanceSummary
          collected={stats.totalCollected}
          expenses={stats.totalExpenses}
          balance={stats.currentBalance}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MonthlyBreakdown data={stats.monthlyBreakdown} />
        </div>
        {user?.role === "ADMIN" && (
          <div>
            <BuildingProgress />
          </div>
        )}
      </div>
    </div>
  );
}
