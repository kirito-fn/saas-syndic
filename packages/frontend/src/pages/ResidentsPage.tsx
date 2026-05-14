import { useState, useEffect, type FormEvent } from "react";
import { useResidents, useCreateResident, useUpdateResident, useDeleteResident } from "../hooks/useResidents.js";
import type { Resident } from "../api/residents.api.js";
import { useBuildings } from "../hooks/useBuildings.js";
import type { Building } from "../api/buildings.api.js";
import { useAuth } from "../lib/auth.js";
import { usePreview } from "../lib/preview.js";
import { Card, CardContent } from "../components/ui/Card.js";
import { SmartTable, FilterBar, type Column } from "../components/ui/Table.js";
import { TableSkeleton } from "../components/ui/Skeleton.js";
import { Modal } from "../components/ui/Modal.js";
import { toast } from "../components/ui/Toast.js";
import { getCurrentMonth, getCurrentYear, formatWhatsAppLink, generateWhatsAppReminderMessage } from "../lib/utils.js";

export default function ResidentsPage() {
  const { user } = useAuth();
  const { previewBuildingId } = usePreview();
  const [filterBuilding, setFilterBuilding] = useState<number | undefined>(previewBuildingId ?? undefined);
  const { data: residentsData, isLoading } = useResidents(filterBuilding);

  useEffect(() => {
    setFilterBuilding(previewBuildingId ?? undefined);
  }, [previewBuildingId]);
  const { data: buildings } = useBuildings();
  const createMutation = useCreateResident();
  const updateMutation = useUpdateResident();
  const deleteMutation = useDeleteResident();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [apartment, setApartment] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [buildingId, setBuildingId] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);

  const multipleBuildings = Array.isArray(buildings) && buildings.length > 1;
  const residents: Resident[] = residentsData && "residents" in residentsData
    ? (residentsData as unknown as Resident[])
    : Array.isArray(residentsData) ? residentsData : [];

  function resetForm() {
    setShowForm(false); setEditId(null); setFirstName(""); setLastName(""); setApartment(""); setPhone(""); setEmail(""); setBuildingId("");
  }

  function handleEdit(r: Resident) {
    setEditId(r.id);
    setFirstName(r.firstName);
    setLastName(r.lastName);
    setApartment(r.apartment);
    setPhone(r.phone || "");
    setEmail(r.email || "");
    setBuildingId(String(r.buildingId));
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const data = { firstName, lastName, apartment, phone: phone || undefined, email: email || undefined, buildingId: parseInt(buildingId, 10) };
      if (editId) await updateMutation.mutateAsync({ id: editId, data });
      else await createMutation.mutateAsync(data);
      resetForm();
      toast(editId ? "Résident modifié" : "Résident créé", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur lors de la création", "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast("Résident supprimé", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
      setDeleteTarget(null);
    }
  }

  function handleWhatsApp(r: Resident) {
    if (!r.phone) {
      toast("Aucun numéro de téléphone pour ce résident", "error");
      return;
    }
    const msg = generateWhatsAppReminderMessage(
      `${r.firstName} ${r.lastName}`,
      getCurrentMonth(),
      getCurrentYear(),
      (r.building?.name || "Syndic")
    );
    const link = formatWhatsAppLink(r.phone, msg);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  const columns: Column<Resident>[] = [
    { key: "name", header: "Nom", render: (r: Resident) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500">
          {r.firstName?.[0]?.toUpperCase() || "?"}{r.lastName?.[0]?.toUpperCase() || ""}
        </div>
        <p className="font-medium text-gray-900">{`${r.firstName} ${r.lastName}`}</p>
      </div>
    )},
    { key: "apartment", header: "Appartement", render: (r: Resident) => (
      <span className="text-gray-500">{r.apartment}</span>
    )},
    { key: "phone", header: "Téléphone", render: (r: Resident) => (
      <span className="text-sm text-gray-500">{r.phone ? r.phone : <span className="text-gray-300">—</span>}</span>
    )},
    ...(multipleBuildings ? [{ key: "building", header: "Bâtiment", render: (r: Resident) => (
      <span className="text-gray-500">{r.building?.name || "—"}</span>
    )}] : []),
    { key: "whatsapp", header: "", render: (r: Resident) => {
      const hasPhone = !!r.phone;
      return (
        <div className="flex justify-end">
          <button
            onClick={() => handleWhatsApp(r)}
            disabled={!hasPhone}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={hasPhone ? "Envoyer rappel WhatsApp" : "Aucun numéro"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </button>
        </div>
      );
    }},
    ...(user?.role === "ADMIN" ? [{ key: "actions", header: "", render: (r: Resident) => {
      return (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => handleEdit(r)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">Modifier</button>
          <button onClick={() => setDeleteTarget(r)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">Supprimer</button>
        </div>
      );
    }}] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Résidents</h1>
          <p className="text-sm text-gray-400 mt-1">{residents.length} résidents</p>
        </div>
        {user?.role === "ADMIN" && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 h-10 px-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 shrink-0 self-start sm:self-auto">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter un résident
          </button>
        )}
      </div>

      {showForm && user?.role === "ADMIN" && (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row flex-wrap items-end gap-4">
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Prénom</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full sm:w-40 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full sm:w-40 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Appartement</label>
                <input value={apartment} onChange={(e) => setApartment(e.target.value)} className="w-full sm:w-32 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Téléphone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2126XXXXXXXX" className="w-full sm:w-40 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@example.com" className="w-full sm:w-44 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bâtiment</label>
                <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className="w-full sm:w-44 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required>
                  <option value="">Sélectionner...</option>
                  {Array.isArray(buildings) && buildings.map((b: Building) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button type="submit" className="flex-1 sm:flex-none h-10 px-5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">{editId ? "Enregistrer" : "Créer"}</button>
                <button type="button" onClick={resetForm} className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">Annuler</button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        {multipleBuildings && (
          <FilterBar>
            <select value={filterBuilding ?? ""} onChange={(e) => setFilterBuilding(e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-10 sm:h-9 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
              <option value="">Tous les bâtiments</option>
              {Array.isArray(buildings) && buildings.map((b: Building) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </FilterBar>
        )}
        {isLoading ? (
          <TableSkeleton rows={5} cols={3} />
        ) : (
          <SmartTable columns={columns} data={residents} keyExtractor={(r: Resident) => r.id} />
        )}
      </Card>

      {/* Delete resident modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le résident"
        actions={
          <>
            <button onClick={() => setDeleteTarget(null)} className="h-10 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">Annuler</button>
            <button onClick={handleDelete} className="h-10 px-5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">Supprimer</button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Êtes-vous sûr de vouloir supprimer <strong className="text-gray-900">{`${deleteTarget.firstName} ${deleteTarget.lastName}`}</strong> ?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Tous les paiements de ce résident seront également supprimés définitivement.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
