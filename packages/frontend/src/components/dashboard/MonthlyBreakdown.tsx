import { Card, CardHeader, CardContent } from "../ui/Card.js";
import { formatCurrency, formatMonthYear } from "../../lib/utils.js";

interface MonthlyRow {
  month: number;
  year: number;
  collected: number;
  expenses: number;
  balance: number;
}

export default function MonthlyBreakdown({ data }: { data: MonthlyRow[] }) {
  const maxVal = Math.max(...data.map((r) => Math.max(r.collected, r.expenses, 1)));

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-gray-900">Détail mensuel</h2>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mois</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Encaissé</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Charges</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Solde</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Proportion</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={`${row.year}-${row.month}`}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                  style={{ animation: `fade-in 0.2s ease-out ${idx * 0.05}s both` }}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {formatMonthYear(row.month, row.year)}
                  </td>
                  <td className="px-6 py-4 text-emerald-600 font-medium">{formatCurrency(row.collected)}</td>
                  <td className="px-6 py-4 text-red-500">{formatCurrency(row.expenses)}</td>
                  <td className={`px-6 py-4 font-semibold ${row.balance >= 0 ? "text-gray-900" : "text-red-500"}`}>
                    {formatCurrency(row.balance)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${(row.collected / maxVal) * 100}%` }} />
                      </div>
                      <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${(row.expenses / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y divide-gray-100">
          {data.map((row, idx) => (
            <div
              key={`${row.year}-${row.month}`}
              className="p-4 space-y-2"
              style={{ animation: `fade-in 0.2s ease-out ${idx * 0.05}s both` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  {formatMonthYear(row.month, row.year)}
                </span>
                <span className={`text-sm font-bold ${row.balance >= 0 ? "text-gray-900" : "text-red-500"}`}>
                  {formatCurrency(row.balance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Encaissé</span>
                <span className="font-medium text-emerald-600">{formatCurrency(row.collected)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Charges</span>
                <span className="font-medium text-red-500">{formatCurrency(row.expenses)}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${(row.collected / maxVal) * 100}%` }} />
                </div>
                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${(row.expenses / maxVal) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
