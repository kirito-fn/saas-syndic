import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import {
  useReminders,
  useSendBulkReminders,
  useNotificationHistory,
} from "../hooks/useNotifications.js";
import type { ReminderPayment } from "../api/notifications.api.js";
import { useBuildings } from "../hooks/useBuildings.js";
import type { Building } from "../api/buildings.api.js";
import { formatMonthYear, getCurrentMonth, getCurrentYear, formatWhatsAppLink, formatMailtoLink, generateWhatsAppReminderMessage, formatEmailReminderBody } from "../lib/utils.js";
import { MONTHS } from "@syndic/shared";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { data: buildings } = useBuildings();

  const [tab, setTab] = useState<"reminders" | "history">("reminders");
  const [filterBuilding, setFilterBuilding] = useState<number | undefined>();
  const [filterChannel, setFilterChannel] = useState("");
  const [filterMonth, setFilterMonth] = useState<number | undefined>();
  const [filterYear, setFilterYear] = useState<number | undefined>();
  const [historyPage, setHistoryPage] = useState(1);

  const reminderFilters = { buildingId: filterBuilding, month: filterMonth, year: filterYear };
  const { data: remindersData, isLoading: remindersLoading } = useReminders(reminderFilters);
  const { data: historyData, isLoading: historyLoading } = useNotificationHistory({
    buildingId: filterBuilding,
    channel: filterChannel || undefined,
    page: historyPage,
  });

  const sendBulk = useSendBulkReminders();

  const [bulkChannel, setBulkChannel] = useState<"email" | "whatsapp" | "both">("email");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const [expandedPayment, setExpandedPayment] = useState<number | null>(null);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const payments = remindersData?.payments ?? [];

  async function handleBulkSend() {
    setBulkSending(true);
    setBulkResult(null);
    try {
      const result = await sendBulk.mutateAsync({
        buildingId: filterBuilding,
        month: filterMonth,
        year: filterYear,
        channel: bulkChannel,
      });
      setBulkResult(`${result.total} résidents traités`);
    } catch (err: unknown) {
      setBulkResult(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBulkSending(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-gray-400 mt-1">
            Envoyer des rappels de paiement par email ou WhatsApp
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("reminders")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "reminders"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Rappels
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "history"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Historique
        </button>
      </div>

      {tab === "reminders" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bâtiment</label>
              <select
                value={filterBuilding ?? ""}
                onChange={(e) => setFilterBuilding(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              >
                <option value="">Tous les bâtiments</option>
{Array.isArray(buildings) && buildings.map((b: Building) => (
  <option key={b.id} value={b.id}>{b.name}</option>
))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mois</label>
              <select
                value={filterMonth ?? ""}
                onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              >
                <option value="">Tous les mois</option>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Année</label>
              <select
                value={filterYear ?? ""}
                onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              >
                <option value="">Toutes années</option>
                {(() => { const c = getCurrentYear(); const ys: number[] = []; for (let y = c - 3; y <= c; y++) ys.push(y); return ys.map((y) => <option key={y} value={y}>{y}</option>); })()}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Canal</label>
              <select
                value={bulkChannel}
                onChange={(e) => setBulkChannel(e.target.value as "email" | "whatsapp" | "both")}
                className="h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="both">Les deux</option>
              </select>
            </div>
            <button
              onClick={handleBulkSend}
              disabled={bulkSending}
              className="h-10 px-5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-lg shadow-gray-900/10"
            >
              {bulkSending ? "Envoi..." : `Envoyer à tous (${payments.length})`}
            </button>
          </div>

          {bulkResult && (
            <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              {bulkResult}
            </div>
          )}

          {/* Reminders table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Résident</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Appartement</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bâtiment</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Période</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {remindersLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Chargement...</td>
                    </tr>
                  )}
                  {!remindersLoading && payments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                        Aucun impayé trouvé
                      </td>
                    </tr>
                  )}
                  {!remindersLoading && payments.map((p: ReminderPayment) => {
                    const resident = p.resident;
                    const building = p.building;
                    const name = resident ? `${resident.firstName} ${resident.lastName}` : "—";
                    const phone = resident?.phone || "";
                    const email = resident?.email || "";
                    const hasEmail = !!email;
                    const hasPhone = !!phone;
                    const isExpanded = expandedPayment === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{resident?.apartment || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{building?.name || ""}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatMonthYear(p.month, p.year)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {p.amount.toLocaleString("fr-FR")} MAD
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {hasEmail && <span className="text-[11px] text-gray-400 truncate max-w-[160px]">{email}</span>}
                            {hasPhone && <span className="text-[11px] text-gray-400">{phone}</span>}
                            {!hasEmail && !hasPhone && <span className="text-[11px] text-red-400">Aucun contact</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => {
                                if (!email) return;
                                const subject = `Rappel de paiement — ${formatMonthYear(p.month, p.year)}`;
                                const body = formatEmailReminderBody(name, p.month, p.year, p.amount, building?.name || "");
                                window.open(formatMailtoLink(email, subject, body), "_blank");
                              }}
                              disabled={!hasEmail}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                              title="Envoyer email"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                              </svg>
                              Email
                            </button>
                            <button
                              onClick={() => {
                                if (!phone) return;
                                const msg = generateWhatsAppReminderMessage(name, p.month, p.year, building?.name || "Syndic");
                                window.open(formatWhatsAppLink(phone, msg), "_blank");
                              }}
                              disabled={!hasPhone}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 disabled:opacity-30 transition-colors"
                              title="WhatsApp"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              WhatsApp
                            </button>
                            <button
                              onClick={() => setExpandedPayment(isExpanded ? null : p.id)}
                              className="inline-flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                className={isExpanded ? "rotate-180" : ""}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-left">
                              <p className="text-xs font-medium text-gray-500 mb-1">Aperçu du message :</p>
                              <p className="text-xs text-gray-700 whitespace-pre-line">
                                {`Bonjour ${name},\n\nNous vous rappelons que votre paiement de syndic pour le mois de ${formatMonthYear(p.month, p.year)} d'un montant de ${p.amount.toLocaleString("fr-FR")} MAD n'a pas encore été effectué.\n\nMerci de bien vouloir procéder au règlement dans les plus brefs délais.\n\nCordialement,\n— Gestion ${building?.name || ""}`}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "history" && (
        <>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bâtiment</label>
              <select
                value={filterBuilding ?? ""}
                onChange={(e) => { setFilterBuilding(e.target.value ? parseInt(e.target.value, 10) : undefined); setHistoryPage(1); }}
                className="h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              >
                <option value="">Tous les bâtiments</option>
{Array.isArray(buildings) && buildings.map((b: Building) => (
  <option key={b.id} value={b.id}>{b.name}</option>
))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Canal</label>
              <select
                value={filterChannel}
                onChange={(e) => { setFilterChannel(e.target.value); setHistoryPage(1); }}
                className="h-10 border border-gray-200 rounded-xl px-3.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              >
                <option value="">Tous les canaux</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Canal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinataire</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sujet</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {historyLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Chargement...</td>
                    </tr>
                  )}
                  {!historyLoading && (!historyData?.logs || historyData.logs.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Aucun historique</td>
                    </tr>
                  )}
                  {!historyLoading && historyData?.logs.map((log) => {
                    const isExpanded = expandedLog === log.id;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            log.channel === "email" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {log.channel === "email" ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            )}
                            {log.channel === "email" ? "Email" : "WhatsApp"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{log.recipient}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{log.subject}</td>
                        <td className="px-4 py-3">
                          {log.status === "sent" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                              Envoyé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700" title={log.error || ""}>
                              Échec
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            className="inline-flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                              className={isExpanded ? "rotate-180" : ""}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          {isExpanded && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-left max-w-md">
                              <p className="text-xs font-medium text-gray-500 mb-1">Message :</p>
                              <p className="text-xs text-gray-700 whitespace-pre-line">{log.message}</p>
                              {log.error && (
                                <p className="text-xs text-red-500 mt-1">Erreur : {log.error}</p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {historyData && historyData.total > historyData.pageSize && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage <= 1}
                className="h-9 px-3 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                Précédent
              </button>
              <span className="flex items-center text-sm text-gray-400">
                Page {historyData.page} / {Math.ceil(historyData.total / historyData.pageSize)}
              </span>
              <button
                onClick={() => setHistoryPage((p) => p + 1)}
                disabled={historyPage >= Math.ceil(historyData.total / historyData.pageSize)}
                className="h-9 px-3 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
