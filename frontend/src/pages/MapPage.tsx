import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { api, type MapItem } from "../api";
import { Badge } from "../components/Badge";
import { useGeo } from "../geo";
import { distanceLabel, timeAgo } from "../utils";

const GLYPH: Record<string, string> = {
  noticia: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg>',
  pauta: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  alerta: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
  relato: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
};

function pinIcon(i: MapItem) {
  const mark = i.verification === "analise" ? "…" : "✓";
  return L.divIcon({
    className: "",
    html: `<div class="pin ${i.type}">${GLYPH[i.type]}<i class="${i.verification}">${mark}</i></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}
const meIcon = L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], zoom); }, [lat, lng, zoom, map]);
  return null;
}

const KINDS = [
  { id: "noticia", label: "Notícias" },
  { id: "pauta", label: "Pautas" },
  { id: "alerta", label: "Alertas" },
  { id: "relato", label: "Relatos" },
] as const;

export default function MapPage() {
  const geo = useGeo();
  const [items, setItems] = useState<MapItem[]>([]);
  const [radius, setRadius] = useState(2);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [kinds, setKinds] = useState<string[]>(KINDS.map((k) => k.id));
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api<MapItem[]>(`/map/?lat=${geo.lat}&lng=${geo.lng}&radius_km=${radius}${onlyVerified ? "&only_verified=1" : ""}`)
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, [geo.lat, geo.lng, radius, onlyVerified]);

  const shown = useMemo(() => items.filter((i) => kinds.includes(i.type)), [items, kinds]);
  const toggle = (id: string) => setKinds((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]));

  return (
    <main className="screen flush">
      <div className="map-wrap">
        <MapContainer center={[geo.lat, geo.lng]} zoom={14} scrollWheelZoom style={{ height: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter lat={geo.lat} lng={geo.lng} zoom={radius <= 2 ? 14 : 13} />
          <Circle center={[geo.lat, geo.lng]} radius={radius * 1000} pathOptions={{ color: "#2f6b69", dashArray: "6 6", fillOpacity: 0.12 }} />
          <Marker position={[geo.lat, geo.lng]} icon={meIcon} title="Você está aqui" />
          {shown.map((i) => (
            <Marker key={`${i.type}-${i.id}`} position={[i.latitude, i.longitude]} icon={pinIcon(i)} title={i.title} />
          ))}
        </MapContainer>
      </div>
      <section className="sheet" aria-label="Itens nesta área">
        <div className="handle" />
        <div className="row between">
          <h1 style={{ margin: 0, fontSize: 22 }}>{shown.length} {shown.length === 1 ? "item" : "itens"} nesta área</h1>
          <button className="btn ghost" style={{ minHeight: 44 }} onClick={() => setRadius(radius === 2 ? 5 : 2)}>raio de {radius} km</button>
        </div>
        {geo.source === "demo" && <p className="m" style={{ margin: 0 }}>Usando localização de demonstração. Permita o GPS para ver o seu bairro.</p>}
        <div className="chips">
          {KINDS.map((k) => (
            <button key={k.id} className={`chip ${kinds.includes(k.id) ? "on" : ""}`} aria-pressed={kinds.includes(k.id)} onClick={() => toggle(k.id)}>{k.label}</button>
          ))}
        </div>
        <div className="row between" style={{ fontSize: 14, fontWeight: 600 }}>
          <span id="so-verif">Mostrar só verificados</span>
          <button className="switch" role="switch" aria-checked={onlyVerified} aria-labelledby="so-verif" onClick={() => setOnlyVerified(!onlyVerified)} />
        </div>
        {error && <p className="err">{error}</p>}
        {!error && shown.length === 0 && (
          <p className="m" role="status">Nada neste raio. {radius === 2 ? "Toque em “raio de 2 km” para ampliar para 5 km." : "Tente tirar o filtro de verificados ou ligar outros tipos de item."}</p>
        )}
        {shown.map((i) => (
          <article key={`${i.type}-${i.id}`} className="card" style={{ background: "var(--bg)" }}>
            <span className={`k ${i.live ? "red" : ""}`}>{i.live ? "Ao vivo" : i.category} · {i.neighborhood}</span>
            <h2 className="t">{i.title}</h2>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <Badge status={i.verification} />
              <span className="m">{timeAgo(i.created_at)} · {distanceLabel(i.distance_m)}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
