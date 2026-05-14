import React from "react";
import { formatCurrency } from "../../lib/utils.js";

interface StatsCardsProps {
  totalResidents: number;
  totalPaid: number;
  totalPending: number;
  totalUnpaid: number;
  totalCollected: number;
  totalExpenses: number;
  currentBalance: number;
}

const StatCard = ({
  label,
  value,
  trend,
  icon,
  color,
}: {
  label: string;
  value: string;
  trend?: { label: string; positive: boolean };
  icon: React.JSX.Element;
  color: string;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all duration-200 animate-slide-up">
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
    {trend && (
      <p className={`text-xs font-medium mt-1.5 ${trend.positive ? "text-emerald-600" : "text-red-500"}`}>
        {trend.label}
      </p>
    )}
  </div>
);

export default function StatsCards({
  totalResidents, totalPaid, totalPending, totalUnpaid,
  totalCollected, totalExpenses, currentBalance,
}: StatsCardsProps) {
  const recoveryRate = totalResidents > 0 ? Math.round((totalPaid / totalResidents) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Résidents"
        value={String(totalResidents)}
        trend={{ label: `${recoveryRate}% de taux de recouvrement`, positive: recoveryRate >= 50 }}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
        color="bg-blue-50 text-blue-600"
      />
      <StatCard
        label="Payé / Vérifié"
        value={String(totalPaid)}
        trend={{ label: `${formatCurrency(totalCollected)} encaissés`, positive: true }}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        }
        color="bg-emerald-50 text-emerald-600"
      />
      <StatCard
        label="En attente"
        value={String(totalPending)}
        trend={{ label: `${totalPending} à vérifier`, positive: totalPending === 0 }}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        }
        color="bg-amber-50 text-amber-600"
      />
      <StatCard
        label="Impayés"
        value={String(totalUnpaid)}
        trend={{ label: `${formatCurrency(totalUnpaid * 100)} MAD en souffrance`, positive: totalUnpaid === 0 }}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        }
        color="bg-red-50 text-red-600"
      />
    </div>
  );
}

export function FinanceSummary({ collected, expenses, balance }: { collected: number; expenses: number; balance: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all duration-200">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Résumé financier</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Total encaissé</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(collected)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Total charges</p>
          <p className="text-xl font-bold text-red-500">{formatCurrency(expenses)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Solde</p>
          <p className={`text-xl font-bold ${balance >= 0 ? "text-gray-900" : "text-red-500"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>
  );
}
