import { useState, type FormEvent } from "react";
import { useBuildings, useCreateBuilding, useUpdateBuilding, useDeleteBuilding } from "../hooks/useBuildings.js";
import { useAuth } from "../lib/auth.js";
import type { Building } from "../api/buildings.api.js";
import { Card, CardContent } from "../components/ui/Card.js";
import { SmartTable, type Column } from "../components/ui/Table.js";
import { TableSkeleton } from "../components/ui/Skeleton.js";
import { Modal } from "../components/ui/Modal.js";
import { toast } from "../components/ui/Toast.js";
import { authApi } from "../api/auth.api.js";
import { downloadMonthlyReport } from "../api/export.api.js";
import { importExcel, previewExcel, type ImportResult, type ImportPreview } from "../api/import.api.js";
import { getCurrentMonth, getCurrentYear } from "../lib/utils.js";

type BuildingRow = Building & {
  manager?: { id: number; name: string; email: string } | null;
};

export default function BuildingsPage() {
  const { user } = useAuth();
  const { data: buildings, isLoading, refetch } = useBuildings();
  const createMutation = useCreateBuilding();
  const updateMutation = useUpdateBuilding();
  const deleteMutation = useDeleteBuilding();

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [managerName, setManagerName] = useState("");
  const [creatingManager, setCreatingManager] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BuildingRow | null>(null);
  const [forceDelete, setForceDelete] = useState(false);

  const [deleteManagerTarget, setDeleteManagerTarget] = useState<{ id: number; name: string; building: string } | null>(null);

  const buildingList = Array.isArray(buildings) ? buildings : [];

  function resetForm() {
    setShowForm(false); setEditId(null); setName(""); setAddress("");
    setManagerEmail(""); setManagerPassword(""); setManagerName(""); setCreatingManager(false);
  }

  function handleEdit(b: BuildingRow) {
    setEditId(b.id); setName(b.name); setAddress(b.address || "");
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, data: { name, address } });
        resetForm();
        toast("Bâtiment modifié", "success");
      } else {
        const building = await createMutation.mutateAsync({ name, address });
        if (creatingManager && managerEmail && managerPassword && managerName) {
          try {
            await authApi.createManager({
              email: managerEmail,
              password: managerPassword,
              name: managerName,
              buildingId: building.id,
            });
            toast("Bâtiment et gestionnaire créés avec succès", "success");
          } catch {
            toast("Bâtiment créé, mais erreur lors de la création du gestionnaire", "error");
          }
        } else {
          toast("Bâtiment créé", "success");
        }
        resetForm();
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur lors de la création", "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id as number, force: forceDelete });
      setDeleteTarget(null);
      setForceDelete(false);
      toast("Bâtiment supprimé", "success");
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("?force=true")) {
        setForceDelete(true);
      } else {
        toast(err instanceof Error ? err.message : "Erreur", "error");
        setDeleteTarget(null);
      }
    }
  }

  async function handleDeleteManager() {
    if (!deleteManagerTarget) return;
    try {
      await authApi.deleteManager(deleteManagerTarget.id);
      toast(`Gestionnaire ${deleteManagerTarget.name} supprimé`, "success");
      setDeleteManagerTarget(null);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
      setDeleteManagerTarget(null);
    }
  }

  async function handleCreateManager(buildingId: number, buildingName: string) {
    const email = prompt(`Email du gestionnaire pour ${buildingName}:`);
    if (!email) return;
    const password = prompt("Mot de passe (min. 6 caractères):");
    if (!password || password.length < 6) { toast("Mot de passe trop court", "error"); return; }
    const name = prompt("Nom du gestionnaire:");
    if (!name) return;

    try {
      await authApi.createManager({ email, password, name, buildingId });
      toast(`Gestionnaire ${name} créé pour ${buildingName}`, "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleFileSelect(file: File | null) {
    setImportFile(file);
    setImportPreview(null);
    setImportResult(null);
    if (!file) return;
    try {
      const preview = await previewExcel(file);
      setImportPreview(preview);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur de lecture du fichier", "error");
      setImportFile(null);
    }
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    try {
      const result = await importExcel(importFile);
      setImportResult(result);
      if (result.errors.length === 0) {
        toast("Import terminé avec succès", "success");
      }
      refetch();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur lors de l'import", "error");
    } finally {
      setImporting(false);
    }
  }

  const columns: Column<BuildingRow>[] = [
    { key: "name", header: "Nom", render: (b: BuildingRow) => (
      <p className="font-medium text-gray-900">{b.name}</p>
    )},
    { key: "address", header: "Adresse", render: (b: BuildingRow) => (
      <span className="text-gray-500">{b.address || "—"}</span>
    )},
    { key: "residents", header: "Résidents", render: (b: BuildingRow) => (
      <span className="text-gray-700">{b._count?.residents ?? "—"}</span>
    )},
    { key: "manager", header: "Gestionnaire", render: (b: BuildingRow) => {
      const m = b.manager;
      return m
        ? (
          <div className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-semibold text-brand-700">{m.name?.[0] || "?"}</div>
            <span className="text-gray-700 text-sm">{m.name}</span>
            {user?.role === "ADMIN" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteManagerTarget({ id: m.id, name: m.name, building: b.name });
                }}
                className="ml-1 p-1 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                title="Supprimer ce gestionnaire"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        )
        : <span className="text-gray-400 text-sm italic">Aucun</span>;
    }},
    ...(user?.role === "ADMIN" ? [{
      key: "actions",
      header: "",
      render: (b: BuildingRow) => {
        const hasManager = !!b.manager;
        return (
          <div className="flex gap-1.5 justify-end">
            {!hasManager && (
              <button
                onClick={() => handleCreateManager(b.id, b.name)}
                className="px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 border border-brand-200 transition-colors"
              >
                + Gestionnaire
              </button>
            )}
            <button onClick={() => handleEdit(b)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">Modifier</button>
            <button onClick={() => { setDeleteTarget(b); setForceDelete(false); }} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">Supprimer</button>
          </div>
        );
      },
    }] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bâtiments</h1>
          <p className="text-sm text-gray-400 mt-1">{buildingList.length} bâtiments</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === "ADMIN" && (
            <>
              <button
                onClick={() => { setShowImport(true); setImportFile(null); setImportResult(null); }}
                className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-brand-700 bg-brand-50 rounded-xl border border-brand-200 hover:bg-brand-100 transition-colors shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import Excel
              </button>
              <button
                onClick={() => downloadMonthlyReport(getCurrentMonth(), getCurrentYear()).catch((e) => toast(e.message, "error"))}
                className="inline-flex items-center gap-2 h-10 px-4 text-sm font-semibold text-gray-700 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Excel
              </button>
            </>
          )}
          <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 h-10 px-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter un bâtiment
          </button>
        </div>
      </div>

      {showForm && user?.role === "ADMIN" && (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col sm:flex-row flex-wrap items-end gap-4">
                <div className="w-full sm:w-auto">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full sm:w-56 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" required />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Adresse</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full sm:w-64 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button type="submit" className="flex-1 sm:flex-none h-10 px-5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">
                    {editId ? "Enregistrer" : "Créer"}
                  </button>
                  <button type="button" onClick={resetForm} className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">Annuler</button>
                </div>
              </div>

              {!editId && (
                <div className="border-t border-gray-100 pt-4">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={creatingManager}
                      onChange={(e) => setCreatingManager(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/20"
                    />
                    <span className="text-sm font-medium text-gray-700">Créer un gestionnaire pour ce bâtiment</span>
                  </label>

                  {creatingManager && (
                    <div className="flex flex-col sm:flex-row flex-wrap items-end gap-4 mt-4 animate-slide-up">
                      <div className="w-full sm:w-auto">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom</label>
                        <input value={managerName} onChange={(e) => setManagerName(e.target.value)} className="w-full sm:w-44 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" placeholder="Ex: Omar Alami" />
                      </div>
                      <div className="w-full sm:w-auto">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                        <input type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} className="w-full sm:w-48 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" placeholder="gestionnaire@exemple.ma" />
                      </div>
                      <div className="w-full sm:w-auto">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mot de passe</label>
                        <input type="password" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} className="w-full sm:w-40 h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" placeholder="••••••••" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        {isLoading ? <TableSkeleton rows={5} cols={4} /> : (
          <SmartTable columns={columns} data={buildingList} keyExtractor={(b: Building) => b.id} />
        )}
      </Card>

      {/* Delete building modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setForceDelete(false); }}
        title={forceDelete ? "Confirmer la suppression en cascade" : "Supprimer le bâtiment"}
        actions={
          <>
            <button
              onClick={() => { setDeleteTarget(null); setForceDelete(false); }}
              className="h-10 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              className="h-10 px-5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
            >
              {forceDelete ? "Supprimer en cascade" : "Supprimer"}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Êtes-vous sûr de vouloir supprimer               <strong className="text-gray-900">{deleteTarget.name}</strong> ?
            </p>
            {forceDelete && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
                <p className="font-semibold">Cette action supprimera également :</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>{deleteTarget._count?.residents ?? 0} résident(s)</li>
                  <li>Tous les paiements liés</li>
                  <li>Toutes les charges liées</li>
                  <li>Le gestionnaire sera désassigné</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete manager modal */}
      <Modal
        open={!!deleteManagerTarget}
        onClose={() => setDeleteManagerTarget(null)}
        title="Supprimer le gestionnaire"
        actions={
          <>
            <button
              onClick={() => setDeleteManagerTarget(null)}
              className="h-10 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteManager}
              className="h-10 px-5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
            >
              Supprimer
            </button>
          </>
        }
      >
        {deleteManagerTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Êtes-vous sûr de vouloir supprimer <strong className="text-gray-900">{deleteManagerTarget.name}</strong> ?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Le bâtiment <strong>{deleteManagerTarget.building}</strong> n'aura plus de gestionnaire.
            </div>
          </div>
        )}
      </Modal>

      {/* Import Excel modal */}
      {showImport && user?.role === "ADMIN" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setShowImport(false); setImportFile(null); setImportPreview(null); setImportResult(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-scale-in max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Import Excel</h2>
              <button
                onClick={() => { setShowImport(false); setImportFile(null); setImportPreview(null); setImportResult(null); }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
              {/* Step 1: File selection */}
              {!importPreview && !importResult && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${dragOver ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-gray-300 bg-gray-50/50"}`}
                  onClick={() => document.getElementById("import-file-input")?.click()}
                >
                  <input
                    id="import-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  />
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-brand-50 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {importFile ? importFile.name : "Déposez votre fichier Excel ici"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {importFile
                      ? `${(importFile.size / 1024).toFixed(1)} Ko`
                      : "ou cliquez pour parcourir — format .xlsx"
                    }
                  </p>
                  {importFile && !importPreview && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-600">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32" />
                      </svg>
                      Analyse du fichier...
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Preview */}
              {importPreview && !importResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 rounded-xl text-brand-700 font-medium">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                      </svg>
                      {importPreview.buildings.length} bâtiment{importPreview.buildings.length > 1 ? "s" : ""}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-xl text-emerald-700 font-medium">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      {importPreview.totalRows} résident{importPreview.totalRows > 1 ? "s" : ""}
                    </div>
                  </div>

                  {importPreview.buildings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {importPreview.buildings.map((b) => (
                        <span key={b} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bâtiment</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">APP</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Résident</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {importPreview.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-700">{row.building}</td>
                              <td className="px-4 py-2 text-gray-500">{row.apartment}</td>
                              <td className="px-4 py-2 font-medium text-gray-900">{row.resident}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>Les bâtiments existants seront ignorés. Les doublons d'appartement dans un même bâtiment seront signalés.</span>
                  </div>
                </div>
              )}

              {/* Step 3: Result */}
              {importResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{importResult.buildingsCreated}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Bâtiments créés</p>
                    </div>
                    <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-brand-700">{importResult.buildingsSkipped}</p>
                      <p className="text-xs text-brand-600 mt-0.5">Bâtiments ignorés</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{importResult.residentsCreated}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Résidents importés</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-red-800 mb-2">
                        {importResult.errors.length} avertissement{importResult.errors.length > 1 ? "s" : ""}
                      </p>
                      <ul className="space-y-1">
                        {importResult.errors.map((err, i) => (
                          <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                            <span className="mt-0.5 shrink-0">•</span>
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importResult.errors.length === 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 text-center font-medium">
                      Import terminé avec succès !
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              {!importResult ? (
                <>
                  <button
                    onClick={() => { setShowImport(false); setImportFile(null); setImportPreview(null); setImportResult(null); }}
                    className="h-10 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  {importPreview && (
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="inline-flex items-center gap-2 h-10 px-5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-600/20"
                    >
                      {importing ? (
                        <>
                          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32" />
                          </svg>
                          Import en cours...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Importer {importPreview.totalRows} résident{importPreview.totalRows > 1 ? "s" : ""}
                        </>
                      )}
                    </button>
                  )}
                  {!importPreview && importFile && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32" />
                      </svg>
                      Analyse en cours...
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => { setShowImport(false); setImportFile(null); setImportPreview(null); setImportResult(null); }}
                  className="h-10 px-5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10"
                >
                  Terminé
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
