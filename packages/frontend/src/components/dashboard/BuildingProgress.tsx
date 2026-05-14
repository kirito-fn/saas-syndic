import { useQuery } from "@tanstack/react-query";
import { buildingsApi, type Building } from "../../api/buildings.api.js";
import { paymentsApi } from "../../api/payments.api.js";
import { Card, CardContent } from "../ui/Card.js";
import { formatCurrency } from "../../lib/utils.js";

export default function BuildingProgress() {
  const { data: buildings } = useQuery({ queryKey: ["buildings"], queryFn: buildingsApi.getAll });

  if (!Array.isArray(buildings) || buildings.length <= 1) return null;

  return (
    <Card>
      <CardContent>
        <h2 className="text-sm font-semibold text-gray-900 mb-5">Progression par bâtiment</h2>
        <div className="space-y-5">
          {buildings.map((b: Building, idx: number) => (
            <BuildingRow
              key={b.id}
              buildingId={b.id}
              name={b.name}
              index={idx}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BuildingRow({ buildingId, name, index }: { buildingId: number; name: string; index: number }) {
  const { data: paymentsData } = useQuery({
    queryKey: ["payments", { buildingId, month: new Date().getMonth() + 1, year: new Date().getFullYear() }],
    queryFn: () => paymentsApi.getAll({
      buildingId,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    }),
  });

  const payments = paymentsData && "payments" in paymentsData
    ? (paymentsData as { payments: { status: string }[] }).payments
    : [];

  const total = payments.length;
  const paid = payments.filter((p) => p.status === "PAID").length;
  const pending = payments.filter((p) => p.status === "PENDING").length;
  const unpaid = payments.filter((p) => p.status === "UNPAID").length;
  const rate = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div style={{ animation: `fade-in 0.2s ease-out ${index * 0.05}s both` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{name}</span>
        <span className="text-xs font-medium text-gray-400">
          {paid}/{total} payés
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${rate}%` }}
        />
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        {paid > 0 && <span className="text-xs text-emerald-600 font-medium">{paid} payé{paid > 1 ? "s" : ""}</span>}
        {pending > 0 && <span className="text-xs text-amber-600 font-medium">{pending} en attente</span>}
        {unpaid > 0 && <span className="text-xs text-red-500 font-medium">{unpaid} impayé{unpaid > 1 ? "s" : ""}</span>}
        <span className="text-xs text-gray-400 ml-auto">{formatCurrency(paid * 100)} / {formatCurrency(total * 100)}</span>
      </div>
    </div>
  );
}
