const API_BASE = "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(
      `Impossible de contacter le serveur. Vérifiez que le serveur est en cours d'exécution. (${err instanceof Error ? err.message : "Erreur réseau"})`
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    try {
      const data = JSON.parse(text);
      throw new ApiError(response.status, data.error || `Erreur ${response.status}`, data.details);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new Error(`Erreur ${response.status} : le serveur a répondu avec un format inattendu. Vérifiez que le backend est bien démarré.`);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
