import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type Report } from "../api";
import { useAuth } from "../auth";
import { Badge } from "../components/Badge";
import { ReportCard } from "../components/ReportCard";
import { useToast } from "../components/Toast";
import { useGeo } from "../geo";
import { speak } from "../utils";

const TABS = [
  { id: "verificados", label: "Verificados" },
  { id: "analise", label: "Em análise" },
  { id: "meus", label: "Meus relatos" },
] as const;

export default function Reports() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const geo = useGeo();
  const { toast, show } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "verificados";
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api<Report[]>(`/reports/?tab=${tab}&lat=${geo.lat}&lng=${geo.lng}`)
      .then(setReports)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, geo.lat, geo.lng, user]);

  useEffect(load, [load]);

  const replace = (r: Report) => setReports((list) => list.map((x) => (x.id === r.id ? { ...x, ...r, distance_m: x.distance_m } : x)));

  const confirm = async (r: Report) => {
    if (!user) return nav("/entrar");
    try {
      replace(await api<Report>(`/reports/${r.id}/confirm/`, { method: "POST", body: { lat: geo.lat, lng: geo.lng } }));
      refresh();
    } catch (e) { show((e as Error).message); }
  };
  const flag = async (r: Report) => {
    if (!user) return nav("/entrar");
    if (!window.confirm("Denunciar este relato como falso ou enganoso?")) return;
    try { show((await api<{ detail: string }>(`/reports/${r.id}/flag/`, { method: "POST", body: {} })).detail); }
    catch (e) { show((e as Error).message); }
  };
  const review = async (r: Report, approve: boolean) => {
    try {
      await api<Report>(`/reports/${r.id}/review/`, { method: "POST", body: { action: approve ? "approve" : "reject" } });
      show(approve ? "Relato verificado." : "Relato descartado.");
      load();
    } catch (e) { show((e as Error).message); }
  };
  const listen = (r: Report) => speak(`${r.category_label}, ${r.neighborhood_name}. ${r.title}. ${r.status_label}.`);

  return (
    <main className="screen">
      <div className="row between" style={{ paddingTop: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Relatos</h1>
        {!user && <Link to="/entrar" className="btn ghost" style={{ textDecoration: "none" }}>Entrar</Link>}
      </div>
      {user && (
        <div className="row">
          <Badge status="comunidade" label={`${user.level_label} · nível ${user.level}`} />
          <span className="m">{user.reputation} pontos</span>
        </div>
      )}
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setParams({ tab: t.id })}>{t.label}</button>
        ))}
      </div>
      {error && <p className="err">{error}</p>}
      {!loading && !error && reports.length === 0 && (
        <p className="m">{tab === "meus" && !user ? "Entre na sua conta para ver os seus relatos." : "Nenhum relato por aqui ainda."}</p>
      )}
      {reports.map((r) => (
        <ReportCard key={r.id} report={r} user={user} onConfirm={confirm} onListen={listen} onFlag={flag} onReview={review} />
      ))}
      <button className="btn primary" style={{ marginTop: 4 }} onClick={() => nav(user ? "/relatos/novo" : "/entrar")}>+ Enviar um relato</button>
      {toast}
    </main>
  );
}
