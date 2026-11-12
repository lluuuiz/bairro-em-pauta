import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type EventItem, type MapItem, type Neighborhood } from "../api";
import { useAuth } from "../auth";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { useGeo } from "../geo";
import { useNotices } from "../notices";
import { isoDay, timeAgo } from "../utils";

const FILTERS = [
  { id: "tudo", label: "Tudo" },
  { id: "noticias", label: "Notícias" },
  { id: "telejornais", label: "Telejornais" },
  { id: "servicos", label: "Serviços" },
] as const;

const airsLabel = (i: MapItem) =>
  i.program ? `No ar: ${i.program}${i.airs_at ? ` · ${new Date(i.airs_at).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : ""}` : "";

export default function Home() {
  const geo = useGeo();
  const { user } = useAuth();
  const { unread } = useNotices();
  const nav = useNavigate();
  const { toast, show } = useToast();
  const [hoods, setHoods] = useState<Neighborhood[]>([]);
  const [hoodId, setHoodId] = useState("");
  const [items, setItems] = useState<MapItem[]>([]);
  const [filter, setFilter] = useState<string>("tudo");
  const [today, setToday] = useState(0);
  const [error, setError] = useState("");

  const mine = hoodId === "mine";
  const hood = hoods.find((h) => String(h.id) === hoodId);
  const followedIds = hoods.filter((h) => h.followed).map((h) => h.id).join(",");
  const lat = hood ? hood.latitude : geo.lat;
  const lng = hood ? hood.longitude : geo.lng;

  useEffect(() => { api<Neighborhood[]>("/neighborhoods/").then(setHoods).catch(() => {}); }, [user]);
  useEffect(() => {
    setError("");
    const url = mine ? `/map/?neighborhoods=${followedIds || 0}` : `/map/?lat=${lat}&lng=${lng}&radius_km=5`;
    api<MapItem[]>(url).then(setItems).catch((e: Error) => setError(e.message));
  }, [lat, lng, mine, followedIds]);
  useEffect(() => {
    api<EventItem[]>(`/events/?date=${isoDay(new Date())}`).then((e) => setToday(e.length)).catch(() => {});
  }, []);

  const follow = async (h: Neighborhood) => {
    if (!user) return nav("/entrar");
    try {
      const updated = await api<Neighborhood>(`/neighborhoods/${h.id}/follow/`, { method: "POST", body: {} });
      setHoods((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      if (updated.followed) {
        show(`Você vai receber avisos quando ${updated.name} for pauta.`);
        if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
      } else show(`Você deixou de seguir ${updated.name}.`);
    } catch (e) { show((e as Error).message); }
  };

  const shown = useMemo(
    () =>
      items.filter((i) =>
        filter === "noticias" ? i.type === "noticia" || i.type === "alerta"
        : filter === "telejornais" ? i.type === "pauta"
        : filter === "servicos" ? i.type === "relato"
        : true
      ),
    [items, filter]
  );
  const hero = shown[0];
  const rest = shown.slice(1, 6);

  return (
    <main className="screen">
      <header className="row between" style={{ paddingTop: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--teal)" }}>Bairro em Pauta</h1>
        <div className="row">
          <Link to="/avisos" className="btn ghost" aria-label={`Avisos${unread ? `, ${unread} novos` : ""}`} style={{ width: 44, padding: 0, position: "relative", textDecoration: "none" }}>
            <Icon name="bell" />
            {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "var(--red)", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 800, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>}
          </Link>
          <select className="hood" aria-label="Escolher bairro" value={hoodId} onChange={(e) => setHoodId(e.target.value)}>
            <option value="">Perto de mim</option>
            {user && followedIds && <option value="mine">Meus bairros</option>}
            {hoods.map((h) => <option key={h.id} value={h.id}>{h.name}{h.followed ? " ★" : ""}</option>)}
          </select>
        </div>
      </header>
      {hood && (
        <button className={`btn ${hood.followed ? "on" : ""}`} style={{ alignSelf: "flex-start" }} aria-pressed={hood.followed} onClick={() => follow(hood)}>
          <Icon name={hood.followed ? "check" : "bell"} />{hood.followed ? `Seguindo ${hood.name}` : `Seguir ${hood.name}`}
        </button>
      )}
      <div className="chips" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${filter === f.id ? "on" : ""}`} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      {error && <p className="err">{error}</p>}
      {hero && (
        <article className="card">
          <div className="hero-img"><Icon name="image" className="ic" /></div>
          <span className={`k ${hero.live ? "red" : ""}`}>{hero.live ? "Ao vivo" : hero.category} · {hero.neighborhood}</span>
          <h2 className="t" style={{ fontSize: 20 }}>{hero.title}</h2>
          {airsLabel(hero) && <span className="m" style={{ fontWeight: 600 }}>{airsLabel(hero)}</span>}
          <div className="row"><Badge status={hero.verification} /><span className="m">{timeAgo(hero.created_at)}</span></div>
        </article>
      )}
      {!hero && !error && (
        <div className="card" role="status">
          <strong>{mine ? "Nada nos seus bairros ainda" : "Nada por perto ainda"}</strong>
          <span className="m">{mine ? "Seus bairros seguidos não têm notícias ou relatos agora." : "Não encontramos notícias nem relatos num raio de 5 km. Escolha um bairro para ver o que está acontecendo por lá:"}</span>
          {!mine && (
            <div className="chips" style={{ flexWrap: "wrap" }}>
              {hoods.map((h) => <button key={h.id} className="chip" onClick={() => setHoodId(String(h.id))}>{h.name}</button>)}
            </div>
          )}
        </div>
      )}
      {hero && <div className="sec"><h2>{mine ? "Nos seus bairros" : "Perto de você"}</h2><Link to="/mapa">Ver no mapa</Link></div>}
      {rest.map((i) => (
        <article key={`${i.type}-${i.id}`} className="card" style={{ flexDirection: "row", gap: 12 }}>
          <div className="thumb" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="k">{i.category} · {i.neighborhood}</span>
            <h3 className="t" style={{ fontSize: 16 }}>{i.title}</h3>
            {airsLabel(i) && <span className="m" style={{ fontWeight: 600 }}>{airsLabel(i)}</span>}
            <Badge status={i.verification} />
          </div>
        </article>
      ))}
      <Link to="/agenda" className="strip" style={{ textDecoration: "none" }}>
        Hoje na Agenda: {today} {today === 1 ? "pauta" : "pautas"} dos telejornais no seu bairro
      </Link>
      {toast}
    </main>
  );
}
