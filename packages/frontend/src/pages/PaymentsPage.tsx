import { useState, useEffect, type FormEvent } from "react";
import {
  usePayments, useDeclarePayment, useUpdatePayment,
  useVerifyPayment, useUnverifyPayment, useResetPayment,
  useChangePaymentStatus, usePaymentLogs, useToggleNoPaymentFlag, useMarkAsUnpaid,
} from "../hooks/usePayments.js";
import type { Payment, PaymentFilters } from "../api/payments.api.js";
import { useResidents } from "../hooks/useResidents.js";
import { useBuildings } from "../hooks/useBuildings.js";
import type { Building } from "../api/buildings.api.js";
import { useAuth } from "../lib/auth.js";
import { usePreview } from "../lib/preview.js";
import { formatCurrency, formatMonthYear, getCurrentMonth, getCurrentYear } from "../lib/utils.js";
import { MONTHS, STATUS_LABELS, type PaymentStatus } from "@syndic/shared";
import { Card, CardContent } from "../components/ui/Card.js";
import { Badge } from "../components/ui/Badge.js";
import { SmartTable, Pagination, FilterBar, type Column } from "../components/ui/Table.js";
import { TableSkeleton } from "../components/ui/Skeleton.js";
import { Modal } from "../components/ui/Modal.js";
import { toast } from "../components/ui/Toast.js";

const colorToBadge: Record<string, "red" | "orange" | "green" | "blue" | "gray"> = {
  UNPAID: "red",
  PENDING: "orange",
  PAID: "green",
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const { previewBuildingId } = usePreview();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBuilding, setFilterBuilding] = useState<number | undefined>(previewBuildingId ?? undefined);
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setFilterBuilding(previewBuildingId ?? undefined);
  }, [previewBuildingId]);

  const filters: PaymentFilters = {
    ...(filterStatus && { status: filterStatus }),
    ...(filterBuilding && { buildingId: filterBuilding }),
    ...(filterMonth && { month: filterMonth }),
    ...(filterYear && { year: filterYear }),
  };

  const [declareBuildingId, setDeclareBuildingId] = useState<number | undefined>(user?.buildingId ?? undefined);
  const [showDeclare, setShowDeclare] = useState(false);

  const { data: paymentsData, isLoading } = usePayments(filters);
  const { data: buildings } = useBuildings();
  const { data: residentsData } = useResidents(declareBuildingId);
  const declareMutation = useDeclarePayment();
  const updateMutation = useUpdatePayment();
  const verifyMutation = useVerifyPayment();
  const unverifyMutation = useUnverifyPayment();
  const resetMutation = useResetPayment();
  const changeStatusMutation = useChangePaymentStatus();
  const toggleNoPaymentMutation = useToggleNoPaymentFlag();
  const markAsUnpaidMutation = useMarkAsUnpaid();

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const { data: paymentLogs } = usePaymentLogs(editingPayment ? editingPayment.id : null);

  const [selectedResident, setSelectedResident] = useState("");
  const [declareMonths, setDeclareMonths] = useState<Set<number>>(new Set());
  const [declareDirectPaid, setDeclareDirectPaid] = useState(false);
  const [declareYear, setDeclareYear] = useState(getCurrentYear());

  const payments: Payment[] = paymentsData && "payments" in paymentsData
    ? (paymentsData as unknown as Payment[])
    : Array.isArray(paymentsData) ? paymentsData : [];
  const total = paymentsData && "total" in paymentsData
    ? (paymentsData as { total: number }).total
    : 0;
  const totalPages = Math.max(1, Math.ceil(total / 50));
  const residents: { id: number; firstName: string; lastName: string; apartment: string }[] = residentsData && "residents" in residentsData
    ? (residentsData as { residents: { id: number; firstName: string; lastName: string; apartment: string }[] }).residents
    : Array.isArray(residentsData) ? residentsData : [];
  const multipleBuildings = Array.isArray(buildings) && buildings.length > 1;
  const residentExisting = selectedResident
    ? new Set(payments.filter((p: Payment) => p.residentId === parseInt(selectedResident, 10) && p.year === declareYear).map((p: Payment) => p.month))
    : new Set<number>();

  const filteredBySearch = search
    ? payments.filter((p: Payment) => {
        const r = p.resident;
        const name = r ? `${r.firstName} ${r.lastName}`.toLowerCase() : "";
        const apt = (r?.apartment || "").toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || apt.includes(q);
      })
    : payments;

  async function handleDeclare(e: FormEvent) {
    e.preventDefault();
    const months = Array.from(declareMonths);
    if (months.length === 0) return;
    try {
      await Promise.all(months.map(m =>
        declareMutation.mutateAsync({
          residentId: parseInt(selectedResident, 10),
          month: m,
          year: declareYear,
          ...(user?.role === "ADMIN" && declareDirectPaid ? { directPaid: true } : {}),
        })
      ));
      setShowDeclare(false);
      setSelectedResident("");
      setDeclareMonths(new Set());
      setDeclareDirectPaid(false);
      toast(`${months.length} paiement(s) déclaré(s) avec succès`, "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleVerify(id: number) {
    try {
      await verifyMutation.mutateAsync(id);
      toast("Paiement vérifié", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleUnverify(id: number) {
    try {
      await unverifyMutation.mutateAsync(id);
      toast("Paiement dé-vérifié", "info");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleReset(id: number) {
    try {
      await resetMutation.mutateAsync(id);
      toast("Paiement réinitialisé", "info");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleChangeStatus() {
    if (!editingPayment || !newStatus) return;
    try {
      await changeStatusMutation.mutateAsync({
        id: editingPayment.id,
        data: { newStatus, reason: statusReason || undefined },
      });
      setEditingPayment(null);
      setNewStatus("");
      setStatusReason("");
      toast("Statut modifié avec succès", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleMarkAsUnpaid(id: number) {
    try {
      await markAsUnpaidMutation.mutateAsync(id);
      toast("Paiement marqué impayé", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleNoPayment(id: number) {
    try {
      await toggleNoPaymentMutation.mutateAsync(id);
      toast("Statut mis à jour", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  function openEditStatus(payment: Payment) {
    setEditingPayment(payment);
    setNewStatus(payment.status);
    setStatusReason("");
  }

  const columns: Column<Payment>[] = [
    {
      key: "resident",
      header: "Résident",
      render: (p: Payment) => {
        const r = p.resident;
        return (
          <div>
            <p className="font-medium text-gray-900">{r ? `${r.firstName} ${r.lastName}` : "—"}</p>
            <p className="text-xs text-gray-400 mt-0.5">{r?.apartment || ""}</p>
          </div>
        );
      },
    },
    {
      key: "period",
      header: "Période",
      render: (p: Payment) => (
        <span className="text-gray-700">{formatMonthYear(p.month, p.year)}</span>
      ),
    },
    {
      key: "amount",
      header: "Montant",
      render: (p: Payment) => (
        <span className="font-semibold text-gray-900">{formatCurrency(p.amount)}</span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (p: Payment) => (
        <div className="flex items-center gap-2">
          <Badge variant={colorToBadge[p.status as PaymentStatus] || "gray"}>
            {STATUS_LABELS[p.status as PaymentStatus] || p.status}
          </Badge>
          {p.noPaymentAt && (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Sans paiement
            </span>
          )}
        </div>
      ),
    },
    ...(user?.role === "ADMIN" ? [{
      key: "building" as const,
      header: "Bâtiment" as const,
      render: (p: Payment) => (
        <span className="text-gray-500">{p.building?.name || "—"}</span>
      ),
    }] : []),
    {
      key: "actions",
      header: "",
      render: (p: Payment) => {
        const isPaid = p.status === "PAID";
        const isPending = p.status === "PENDING";
        const isUnpaid = p.status === "UNPAID";
        const isAdmin = user?.role === "ADMIN";
        const noPaymentFlagged = !!p.noPaymentAt;

        return (
          <div className="flex items-center gap-1.5 justify-end">
            {isUnpaid && !isAdmin && (
              <button
                onClick={() => handleNoPayment(p.id)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  noPaymentFlagged
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                }`}
              >
                {noPaymentFlagged ? "✓" : "○"}
              </button>
            )}
            {isPending && !isAdmin && (
              <button
                onClick={() => handleMarkAsUnpaid(p.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
              >
                Impayé
              </button>
            )}
            {isPending && isAdmin && (
              <button
                onClick={() => handleVerify(p.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Vérifier
              </button>
            )}
            {isPaid && isAdmin && (
              <button
                onClick={() => handleUnverify(p.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                Dévérifier
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => handleReset(p.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
              >
                Réinit.
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => openEditStatus(p)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
              >
                Statut
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Paiements</h1>
          <p className="text-sm text-gray-400 mt-1">Gérer les déclarations de paiement des résidents</p>
        </div>
        <button
          onClick={() => setShowDeclare(true)}
          className="inline-flex items-center gap-2 h-10 px-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 shrink-0 self-start sm:self-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Déclarer un paiement
        </button>
      </div>

      {showDeclare && (
        <Card className="border-emerald-200/50">
          <CardContent>
            <form onSubmit={handleDeclare} className="flex flex-wrap items-end gap-4">
              {user?.role === "ADMIN" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bâtiment</label>
                  <select value={declareBuildingId ?? ""} onChange={(e) => { setDeclareBuildingId(e.target.value ? parseInt(e.target.value, 10) : undefined); setSelectedResident(""); setDeclareMonths(new Set()); }} className="h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all min-w-[180px]">
                    <option value="">Tous les bâtiments</option>
                    {Array.isArray(buildings) && buildings.map((b: Building) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Résident</label>
                <select value={selectedResident} onChange={(e) => { setSelectedResident(e.target.value); setDeclareMonths(new Set()); }} className="h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all min-w-[220px]" required>
                  <option value="">Sélectionner...</option>
                  {Array.isArray(residents) && residents.map((r: { id: number; firstName: string; lastName: string; apartment: string }) => (
                    <option key={r.id} value={r.id}>
                      {`${r.firstName} ${r.lastName} (${r.apartment})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mois</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {MONTHS.map((m, i) => {
                    const month = i + 1;
                    const hasPayment = residentExisting.has(month);
                    const checked = declareMonths.has(month);
                    return (
                      <label
                        key={month}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors select-none ${
                          hasPayment
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : checked
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-white text-gray-600 border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={hasPayment}
                          onChange={() => {
                            setDeclareMonths(prev => {
                              const next = new Set(prev);
                              if (next.has(month)) next.delete(month);
                              else next.add(month);
                              return next;
                            });
                          }}
                          className="accent-emerald-600"
                        />
                        {m.slice(0, 3)}
                      </label>
                    );
                  })}
                </div>
                {selectedResident && (
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {residentExisting.size > 0 && `${residentExisting.size} mois déjà déclaré(s) pour ${declareYear}`}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Année</label>
                <select value={declareYear} onChange={(e) => setDeclareYear(parseInt(e.target.value, 10))} className="h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
                  {(() => { const c = getCurrentYear(); const ys: number[] = []; for (let y = c - 3; y <= c; y++) ys.push(y); return ys.map((y) => <option key={y} value={y}>{y}</option>); })()}
                </select>
              </div>
              {user?.role === "ADMIN" && (
                <label className="flex items-center gap-2 h-10 text-sm text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" checked={declareDirectPaid} onChange={(e) => setDeclareDirectPaid(e.target.checked)} className="accent-emerald-600 w-4 h-4" />
                  Payer directement
                </label>
              )}
              <button type="submit" className="h-10 px-5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">
                Confirmer {declareMonths.size > 0 && `(${declareMonths.size} × ${formatCurrency(100)} = ${formatCurrency(declareMonths.size * 100)})`}
              </button>
              <button type="button" onClick={() => { setShowDeclare(false); setDeclareDirectPaid(false); }} className="h-10 px-4 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
                Annuler
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <FilterBar>
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un résident..."
              className="w-full h-10 sm:h-9 pl-9 pr-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="h-10 sm:h-9 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
            <option value="">Tous les statuts</option>
            <option value="UNPAID">Impayé</option>
            <option value="PENDING">En attente</option>
            <option value="PAID">Payé / Vérifié</option>
          </select>
          {user?.role === "ADMIN" && (
            <select value={filterBuilding ?? ""} onChange={(e) => { setFilterBuilding(e.target.value ? parseInt(e.target.value, 10) : undefined); setPage(1); }} className="h-10 sm:h-9 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
              <option value="">Tous bâtiments</option>
              {Array.isArray(buildings) && buildings.map((b: Building) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <select value={filterMonth ?? ""} onChange={(e) => { setFilterMonth(e.target.value ? parseInt(e.target.value, 10) : undefined); setPage(1); }} className="h-10 sm:h-9 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
            <option value="">Tous les mois</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={filterYear ?? ""} onChange={(e) => { setFilterYear(e.target.value ? parseInt(e.target.value, 10) : undefined); setPage(1); }} className="h-10 sm:h-9 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
            <option value="">Toutes années</option>
            {(() => { const c = getCurrentYear(); const ys: number[] = []; for (let y = c - 3; y <= c; y++) ys.push(y); return ys.map((y) => <option key={y} value={y}>{y}</option>); })()}
          </select>
        </FilterBar>

        {isLoading ? (
          <TableSkeleton rows={6} cols={columns.length} />
        ) : (
          <>
            <SmartTable columns={columns} data={filteredBySearch} keyExtractor={(p: Payment) => p.id} />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={editingPayment !== null}
        onClose={() => setEditingPayment(null)}
        title="Modifier le statut"
        actions={
          <>
            <button onClick={() => setEditingPayment(null)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
              Annuler
            </button>
            <button
              onClick={handleChangeStatus}
              disabled={!newStatus || newStatus === editingPayment?.status || changeStatusMutation.isPending}
              className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {changeStatusMutation.isPending ? "..." : "Confirmer"}
            </button>
          </>
        }
      >
        {editingPayment && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {(() => {
                const r = editingPayment.resident;
                return r ? `${r.firstName} ${r.lastName}` : "";
              })()} — {formatMonthYear(editingPayment.month, editingPayment.year)}
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nouveau statut</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
                <option value="UNPAID">Impayé</option>
                <option value="PENDING">En attente</option>
                <option value="PAID">Payé / Vérifié</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Motif <span className="text-red-400">*</span></label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Indiquez la raison du changement..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Historique</label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {paymentLogs?.length ? paymentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-700">{log.oldStatus}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium text-gray-700">{log.newStatus}</span>
                      {log.reason && <span className="ml-1 text-gray-400">— {log.reason}</span>}
                      <p className="text-gray-400 mt-0.5">{log.changedBy.name} · {new Date(log.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                  </div>
                )) : <p className="text-xs text-gray-400 italic">Aucun historique</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
