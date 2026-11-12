const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
const TOKEN_KEY = "bp_token";

export type Verification = "verificado" | "comunidade" | "analise";
export type ReportStatus = "em_analise" | "comunidade" | "verificado" | "descartado";

export interface Me { id: number; username: string; is_staff: boolean; reputation: number; level: number; level_label: string }
export interface Neighborhood { id: number; name: string; city: string; latitude: number; longitude: number }
export interface Report {
  id: number; category: string; category_label: string; title: string; description: string; photo: string | null;
  latitude: number; longitude: number; neighborhood_name: string; status: ReportStatus; status_label: string;
  triage_passed: boolean; triage_notes: string; review_note: string; confirmations_count: number;
  confirmed_by_me: boolean; is_mine: boolean; distance_m: number | null; created_at: string;
}
export interface MapItem {
  type: "noticia" | "pauta" | "alerta" | "relato"; id: number; title: string; category: string; neighborhood: string;
  latitude: number; longitude: number; live: boolean; verification: Verification; created_at: string; distance_m?: number;
}
export interface EventItem {
  id: number; title: string; category: string; neighborhood_name: string; starts_at: string;
  source: "redacao" | "comunidade"; source_label: string; has_reminder: boolean;
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

function errorMessage(data: unknown): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    const first = Object.values(d)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    if (typeof first === "string") return first;
  }
  return "Algo deu errado. Tente de novo.";
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) body = options.body;
  else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, { method: options.method ?? "GET", headers, body });
  } catch {
    throw new Error("Sem conexão com o servidor.");
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorMessage(data));
  return data as T;
}

export const mediaUrl = (url: string | null) => (url && url.startsWith("http") ? url : url ? `${BASE}${url}` : null);
