import { useState } from "react";
import { useAuth } from "../../lib/auth.js";
import { usePreview } from "../../lib/preview.js";
import { useBuildings } from "../../hooks/useBuildings.js";
import type { Building } from "../../api/buildings.api.js";
import { Modal } from "../ui/Modal.js";
import { toast } from "../ui/Toast.js";
import { authApi } from "../../api/auth.api.js";
import NotificationBell from "./NotificationBell.js";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { previewBuildingId, setPreviewBuildingId } = usePreview();
  const { data: buildings } = useBuildings();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("Les mots de passe ne correspondent pas", "error");
      return;
    }
    setChanging(true);
    try {
      await authApi.changePassword({ oldPassword, newPassword });
      toast("Mot de passe modifié avec succès", "success");
      setShowPasswordModal(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setChanging(false);
    }
  }

  return (
    <>
      <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 safe-top">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center w-10 h-10 shrink-0 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors -ml-1"
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm text-gray-400 font-medium truncate">
            {user?.role === "ADMIN"
              ? "Administrateur"
              : `Gestionnaire · ${user?.building?.name || ""}`
            }
          </span>
          {user?.role === "ADMIN" && (
            previewBuildingId ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                {buildings && Array.isArray(buildings)
                  ? buildings.find((b: Building) => b.id === previewBuildingId)?.name || ""
                  : ""}
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200 shrink-0">
                ADMIN
              </span>
            )
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {user?.role === "ADMIN" && (
            previewBuildingId ? (
              <button
                onClick={() => setPreviewBuildingId(null)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                Quitter l'aperçu
              </button>
            ) : (
              <div className="relative group hidden sm:block">
                <button className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  Voir comme...
                </button>
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 hidden group-hover:block animate-scale-in">
                  <div className="p-1.5">
                    {buildings && Array.isArray(buildings) && buildings.length > 0 ? (
                      buildings.map((b: Building) => (
                        <button
                          key={b.id}
                          onClick={() => setPreviewBuildingId(b.id)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          {b.name}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-gray-400">Aucun bâtiment</p>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
          <NotificationBell />
          <button
            onClick={() => setShowPasswordModal(true)}
            className="hidden md:inline-flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Changer le mot de passe"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>
          <button
            onClick={logout}
            className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Déconnexion"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <Modal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Modifier mon mot de passe"
        actions={
          <>
            <button onClick={() => setShowPasswordModal(false)} className="h-10 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Annuler
            </button>
            <button
              form="change-password-form"
              type="submit"
              disabled={changing}
              className="h-10 px-5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {changing ? "Modification..." : "Modifier"}
            </button>
          </>
        }
      >
        <form id="change-password-form" onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mot de passe actuel</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              minLength={6}
              required
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
