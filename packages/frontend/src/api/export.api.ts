const API_BASE = "/api";

export async function downloadMonthlyReport(month: number, year: number) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}/export/monthly?month=${month}&year=${year}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Erreur d'export" }));
    throw new Error(data.error || "Erreur d'export");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport-mensuel-${month}-${year}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
