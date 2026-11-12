import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type EventItem, type MapItem, type Neighborhood } from "../api";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { useGeo } from "../geo";
import { isoDay, timeAgo } from "../utils";

const FILTERS = [
  { id: "tudo", label: "Tudo" },
  { id: "noticias", label: "Notícias" },
  { id: "telejornais", label: "Telejornais" },
  { id: "servicos", label: "Serviços" },
] as const;

export default function Home() {
  const geo = useGeo();
  const [hoods, setHoods] = useState<Neighborhood[]>([]);
  const [hoodId, setHoodId] = useState("");
  const [items, setItems] = useState<MapItem[]>([]);
  const [filter, setFilter] = useState<string>("tudo");
  const [today, setToday] = useState(0);
  const [error, setError] = useState("");

  const hood = hoods.find((h) => String(h.id) === hoodId);
  const lat = hood ? hood.latitude : geo.lat;
  const lng = hood ? hood.longitude : geo.lng;

  useEffect(() => { api<Neighborhood[]>("/neighborhoods/").then(setHoods).catch(() => {}); }, []);
  useEffect(() => {
    setError("");
    api<MapItem[]>(`/map/?lat=${lat}&lng=${lng}&radius_km=5`).then(setItems).catch((e: Error) => setError(e.message));
  }, [lat, lng]);
  useEffect(() => {
    api<EventItem[]>(`/events/?date=${isoDay(new Date())}`).then((e) => setToday(e.length)).catch(() => {});
  }, []);

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
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--teal)" }}>Bairro em Pauta</h1>
        <select className="hood" aria-label="Escolher bairro" value={hoodId} onChange={(e) => setHoodId(e.target.value)}>
          <option value="">Perto de mim</option>
          {hoods.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </header>
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
          <div className="row"><Badge status={hero.verification} /><span className="m">{timeAgo(hero.created_at)}</span></div>
        </article>
      )}
      {!hero && !error && (
        <div className="card" role="status">
          <strong>Nada por perto ainda</strong>
          <span className="m">Não encontramos notícias nem relatos num raio de 5 km. Escolha um bairro para ver o que está acontecendo por lá:</span>
          <div className="chips" style={{ flexWrap: "wrap" }}>
            {hoods.map((h) => (
              <button key={h.id} className="chip" onClick={() => setHoodId(String(h.id))}>{h.name}</button>
            ))}
          </div>
        </div>
      )}
      {hero && <div className="sec"><h2>Perto de você</h2><Link to="/mapa">Ver no mapa</Link></div>}
      {rest.map((i) => (
        <article key={`${i.type}-${i.id}`} className="card" style={{ flexDirection: "row", gap: 12 }}>
          <div className="thumb" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="k">{i.category} · {i.neighborhood}</span>
            <h3 className="t" style={{ fontSize: 16 }}>{i.title}</h3>
            <Badge status={i.verification} />
          </div>
        </article>
      ))}
      <Link to="/agenda" className="strip" style={{ textDecoration: "none" }}>
        Hoje na Agenda: {today} {today === 1 ? "pauta" : "pautas"} dos telejornais no seu bairro
      </Link>
    </main>
  );
}
