import { useState, type FormEvent } from "react";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "../hooks/useExpenses.js";
import type { Expense } from "../api/expenses.api.js";
import { useBuildings } from "../hooks/useBuildings.js";
import type { Building } from "../api/buildings.api.js";
import { useAuth } from "../lib/auth.js";
import { formatCurrency, formatDate, getCurrentMonth, getCurrentYear } from "../lib/utils.js";
import { MONTHS } from "@syndic/shared";
import { Card, CardContent } from "../components/ui/Card.js";
import { SmartTable, FilterBar, type Column } from "../components/ui/Table.js";
import { Badge } from "../components/ui/Badge.js";
import { TableSkeleton } from "../components/ui/Skeleton.js";
import { toast } from "../components/ui/Toast.js";

export default function ExpensesPage() {
  const { user } = useAuth();
  const [filterBuilding, setFilterBuilding] = useState<number | undefined>(undefined);
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const { data: expensesData, isLoading } = useExpenses({ buildingId: filterBuilding, month: filterMonth, year: filterYear });
  const { data: buildings } = useBuildings();
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [buildingId, setBuildingId] = useState("");

  const expenses: Expense[] = expensesData && "expenses" in expensesData
    ? (expensesData as unknown as Expense[])
    : Array.isArray(expensesData) ? expensesData : [];

  const totalAmount = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);

  function resetForm() {
    setShowForm(false); setEditId(null); setTitle(""); setDescription(""); setAmount("");
    setDate(new Date().toISOString().slice(0, 10)); setBuildingId("");
  }

  function handleEdit(e: Expense) {
    setEditId(e.id); setTitle(e.title);
    setDescription(e.description || ""); setAmount(String(e.amount));
    setDate(e.date.slice(0, 10)); setBuildingId(e.buildingId ? String(e.buildingId) : "");
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const data = { title, description: description || undefined, amount: parseFloat(amount), date, buildingId: buildingId ? parseInt(buildingId, 10) : null };
      if (editId) await updateMutation.mutateAsync({ id: editId, data });
      else await createMutation.mutateAsync(data);
      resetForm();
      toast(editId ? "Charge modifiée" : "Charge créée", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur lors de la création", "error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer cette charge ?")) return;
    try { await deleteMutation.mutateAsync(id); toast("Charge supprimée", "success"); }
    catch (err: unknown) { toast(err instanceof Error ? err.message : "Erreur", "error"); }
  }

  const multipleBuildings = Array.isArray(buildings) && buildings.length > 1;

  const columns: Column<Expense>[] = [
    { key: "title", header: "Titre", render: (e: Expense) => (
      <div>
        <p className="font-medium text-gray-900">{e.title}</p>
        {e.description && <p className="text-xs text-gray-400 mt-0.5">{e.description}</p>}
      </div>
    )},
    { key: "amount", header: "Montant", render: (e: Expense) => (
      <span className="font-semibold text-red-500">{formatCurrency(e.amount)}</span>
    )},
    { key: "date", header: "Date", render: (e: Expense) => (
      <span className="text-gray-500">{formatDate(e.date)}</span>
    )},
    ...(multipleBuildings ? [{ key: "building", header: "Bâtiment", render: (e: Expense) => (
      e.buildingId ? <Badge variant="blue">{e.building?.name || "Spécifique"}</Badge> : <Badge variant="gray">Global</Badge>
    )}] : []),
    ...(user?.role === "ADMIN" ? [{ key: "actions", header: "", render: (e: Expense) => (
      <div className="flex gap-1.5 justify-end">
        <button onClick={() => handleEdit(e)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">Modifier</button>
        <button onClick={() => handleDelete(e.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">Supprimer</button>
      </div>
    )}] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Charges</h1>
          <p className="text-sm text-gray-400 mt-1">{formatCurrency(totalAmount)} MAD de charges au total</p>
        </div>
        {user?.role === "ADMIN" && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 h-10 px-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 shrink-0 self-start sm:self-auto">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter une charge
          </button>
        )}
      </div>

      {showForm && user?.role === "ADMIN" && (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Titre</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Montant</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
              </div>
              {multipleBuildings && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bâtiment</label>
                  <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
                    <option value="">Global</option>
                    {Array.isArray(buildings) && buildings.map((b: Building) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" className="h-10 px-5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">
                  {editId ? "Enregistrer" : "Créer"}
                </button>
                <button type="button" onClick={resetForm} className="h-10 px-4 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">Annuler</button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <FilterBar>
          <select value={filterMonth ?? ""} onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-10 sm:h-9 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
            <option value="">Tous les mois</option>
            {MONTHS.map((name: string, i: number) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select value={filterYear ?? ""} onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-10 sm:h-9 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
            <option value="">Toutes les années</option>
            <option value={getCurrentYear()}>{getCurrentYear()}</option>
          </select>
          {multipleBuildings && (
            <select value={filterBuilding ?? ""} onChange={(e) => setFilterBuilding(e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-10 sm:h-9 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
              <option value="">Tous les bâtiments</option>
              {Array.isArray(buildings) && buildings.map((b: Building) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </FilterBar>
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <SmartTable columns={columns} data={expenses} keyExtractor={(e: Expense) => e.id} />
        )}
      </Card>
    </div>
  );
}
