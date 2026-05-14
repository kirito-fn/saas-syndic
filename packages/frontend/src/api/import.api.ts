const API_BASE = "/api";

export interface ImportRow {
  building: string;
  apartment: string;
  resident: string;
}

export interface ImportPreview {
  buildings: string[];
  rows: ImportRow[];
  totalRows: number;
}

export interface ImportResult {
  buildingsCreated: number;
  buildingsSkipped: number;
  residentsCreated: number;
  errors: string[];
}

async function uploadFile<T>(endpoint: string, file: File): Promise<T> {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/import${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let data: { error?: string } = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || "Erreur lors de l'import" };
    }
    throw new Error(data.error || "Erreur lors de l'import");
  }

  return response.json();
}

export async function previewExcel(file: File): Promise<ImportPreview> {
  return uploadFile<ImportPreview>("/preview", file);
}

export async function importExcel(file: File): Promise<ImportResult> {
  return uploadFile<ImportResult>("/excel", file);
}
