import { useState, type FormEvent } from "react";
import { useManagers, useDeleteManager } from "../hooks/useManagers.js";
import { useBuildings } from "../hooks/useBuildings.js";
import type { Manager } from "../api/auth.api.js";
import type { Building } from "../api/buildings.api.js";
import { Card, CardContent } from "../components/ui/Card.js";
import { SmartTable, type Column } from "../components/ui/Table.js";
import { TableSkeleton } from "../components/ui/Skeleton.js";
import { Modal } from "../components/ui/Modal.js";
import { Badge } from "../components/ui/Badge.js";
import { toast } from "../components/ui/Toast.js";
import { authApi } from "../api/auth.api.js";
import { formatDate } from "../lib/utils.js";
import { useQueryClient } from "@tanstack/react-query";

function generatePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd + "A1!";
}

export default function ManagersPage() {
  const { data: managers, isLoading } = useManagers();
  const { data: buildings } = useBuildings();
  const deleteMutation = useDeleteManager();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: number; name: string; building: string | null;
  } | null>(null);

  const [assignTarget, setAssignTarget] = useState<{
    id: number; name: string;
  } | null>(null);
  const [assignBuildingId, setAssignBuildingId] = useState("");

  const [resetTarget, setResetTarget] = useState<{
    id: number; name: string;
  } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [newPasswordRevealed, setNewPasswordRevealed] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const list: Manager[] = Array.isArray(managers) ? managers : [];
  const buildingList: Building[] = Array.isArray(buildings) ? buildings : [];

  const assigned = list.filter((m) => m.buildingId);
  const unassigned = list.filter((m) => !m.buildingId);

  const buildingsWithoutManager = buildingList.filter(
    (b) => !assigned.some((m) => m.buildingId === b.id)
  );

  function resetForm() {
    setName(""); setEmail(""); setPassword(""); setBuildingId(""); setShowCreate(false);
  }

  async function handleAssign() {
    if (!assignTarget || !assignBuildingId) return;
    try {
      await authApi.assignBuilding(assignTarget.id, parseInt(assignBuildingId, 10));
      qc.invalidateQueries({ queryKey: ["managers"] });
      qc.invalidateQueries({ queryKey: ["buildings"] });
      toast("Bâtiment assigné avec succès", "success");
      setAssignTarget(null);
      setAssignBuildingId("");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      if (!buildingId) { toast("Veuillez sélectionner un bâtiment", "error"); setCreating(false); return; }
      await authApi.createManager({
        email, password, name,
        buildingId: parseInt(buildingId, 10),
      });
      qc.invalidateQueries({ queryKey: ["managers"] });
      qc.invalidateQueries({ queryKey: ["buildings"] });
      toast("Gestionnaire créé avec succès", "success");
      resetForm();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast("Gestionnaire supprimé", "success");
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
      setDeleteTarget(null);
    }
  }

  function openReset(m: Manager) {
    setResetTarget({ id: m.id, name: m.name });
    setResetPassword(generatePassword());
    setNewPasswordRevealed(null);
  }

  async function handleReset() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const result = await authApi.resetManagerPassword(resetTarget.id, resetPassword);
      setNewPasswordRevealed(result.password);
      toast("Mot de passe réinitialisé", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setResetting(false);
    }
  }

  const columns: Column<Manager>[] = [
    {
      key: "name",
      header: "Gestionnaire",
      render: (m: Manager) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700">
            {m.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-medium text-gray-900">{m.name}</p>
            <p className="text-xs text-gray-400">{m.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "building",
      header: "Bâtiment",
      render: (m: Manager) => {
        return m.building
          ? <Badge variant="blue">{m.building.name}</Badge>
          : <Badge variant="gray">Non assigné</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Date de création",
      render: (m: Manager) => (
        <span className="text-gray-500 text-sm">{formatDate(m.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (m: Manager) => {
        return (
          <div className="flex gap-1.5 justify-end">
            {!m.building && (
              <button
                onClick={() => { setAssignTarget({ id: m.id, name: m.name }); setAssignBuildingId(""); }}
                className="px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 border border-brand-200 transition-colors"
              >
                Assigner
              </button>
            )}
            <button
              onClick={() => openReset(m)}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              Réinitialiser
            </button>
            <button
              onClick={() => setDeleteTarget({
                id: m.id,
                name: m.name,
                building: m.building?.name || null,
              })}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
            >
              Supprimer
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Gestionnaires</h1>
          <p className="text-sm text-gray-400 mt-1">{list.length} gestionnaire{list.length > 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 h-10 px-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 shrink-0 self-start sm:self-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Créer un gestionnaire
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{list.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Assignés</p>
          <p className="text-2xl font-bold text-emerald-600">{assigned.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Non assignés</p>
          <p className={`text-2xl font-bold ${unassigned.length > 0 ? "text-amber-600" : "text-gray-900"}`}>
            {unassigned.length}
          </p>
          {unassigned.length > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-1">Gestionnaires sans bâtiment</p>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <SmartTable columns={columns} data={list} keyExtractor={(m: Manager) => m.id} />
        )}
      </Card>

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={resetForm}
        title="Créer un gestionnaire"
        actions={
          <>
            <button onClick={resetForm} className="h-10 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Annuler
            </button>
            <button
              form="create-manager-form"
              type="submit"
              disabled={creating}
              className="h-10 px-5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-600/20"
            >
              {creating ? "Création..." : "Créer"}
            </button>
          </>
        }
      >
        <form id="create-manager-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              placeholder="Ex: Omar Alami"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              placeholder="gestionnaire@exemple.ma"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              placeholder="Minimum 6 caractères"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bâtiment</label>
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              required
            >
              <option value="">Sélectionner un bâtiment...</option>
              {buildingsWithoutManager.map((b: Building) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
              {assigned.length > 0 && (
                <optgroup label="Bâtiments avec gestionnaire">
                  {assigned.map((m: Manager) => {
                    if (!m.building) return null;
                    return (
                      <option key={m.building.id} value={m.building.id} disabled>
                        {m.building.name} ({m.name})
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
            {buildingsWithoutManager.length === 0 && buildingList.length > 0 && (
              <p className="text-xs text-amber-600 mt-1.5">Tous les bâtiments ont déjà un gestionnaire.</p>
            )}
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={!!resetTarget}
        onClose={() => { setResetTarget(null); setNewPasswordRevealed(null); }}
        title={newPasswordRevealed ? "Mot de passe réinitialisé" : "Réinitialiser le mot de passe"}
        actions={
          newPasswordRevealed ? (
            <button
              onClick={() => { setResetTarget(null); setNewPasswordRevealed(null); }}
              className="h-10 px-5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Fermer
            </button>
          ) : (
            <>
              <button onClick={() => { setResetTarget(null); setNewPasswordRevealed(null); }} className="h-10 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                Annuler
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="h-10 px-5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20"
              >
                {resetting ? "Réinitialisation..." : "Réinitialiser"}
              </button>
            </>
          )
        }
      >
        {resetTarget && !newPasswordRevealed && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Nouveau mot de passe pour <strong className="text-gray-900">{resetTarget.name}</strong> :
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="flex-1 h-10 border border-gray-200 rounded-xl px-3.5 text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setResetPassword(generatePassword())}
                className="h-10 px-3 text-xs font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                title="Générer un mot de passe aléatoire"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {newPasswordRevealed && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
              <p className="font-semibold mb-2">Mot de passe mis à jour</p>
              <p>Voici le nouveau mot de passe. Copiez-le et partagez-le avec le gestionnaire.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newPasswordRevealed}
                className="flex-1 h-10 border border-emerald-200 rounded-xl px-3.5 text-sm font-mono bg-emerald-50/50 text-emerald-900"
              />
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(newPasswordRevealed); toast("Copié !", "success"); }}
                className="h-10 px-3 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                title="Copier"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le gestionnaire"
        actions={
          <>
            <button onClick={() => setDeleteTarget(null)} className="h-10 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Annuler
            </button>
            <button onClick={handleDelete} className="h-10 px-5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">
              Supprimer
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Êtes-vous sûr de vouloir supprimer <strong className="text-gray-900">{deleteTarget.name}</strong> ?
            </p>
            {deleteTarget.building && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                Le bâtiment <strong>{deleteTarget.building}</strong> n'aura plus de gestionnaire.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Assign building modal */}
      <Modal
        open={!!assignTarget}
        onClose={() => { setAssignTarget(null); setAssignBuildingId(""); }}
        title="Assigner un bâtiment"
        actions={
          <>
            <button onClick={() => { setAssignTarget(null); setAssignBuildingId(""); }} className="h-10 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Annuler
            </button>
            <button
              onClick={handleAssign}
              disabled={!assignBuildingId}
              className="h-10 px-5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-600/20"
            >
              Assigner
            </button>
          </>
        }
      >
        {assignTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Assigner un bâtiment à <strong className="text-gray-900">{assignTarget.name}</strong>
            </p>
            <select
              value={assignBuildingId}
              onChange={(e) => setAssignBuildingId(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            >
              <option value="">Sélectionner un bâtiment...</option>
              {buildingList
                .filter((b: Building) =>
                  !list.some((m: Manager) => m.buildingId === b.id && m.id !== assignTarget!.id)
                )
                .map((b: Building) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
            </select>
            {buildingList.filter((b: Building) =>
              !list.some((m: Manager) => m.buildingId === b.id && m.id !== assignTarget!.id)
            ).length === 0 && (
              <p className="text-xs text-amber-600">Tous les bâtiments ont déjà un gestionnaire.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
