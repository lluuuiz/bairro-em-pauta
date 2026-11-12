import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, type Neighborhood, type Report } from "../api";
import { useAuth } from "../auth";
import { Icon } from "../components/Icon";
import { nearest, useGeo } from "../geo";

const CATS = [
  { id: "alagamento", label: "Alagamento" },
  { id: "iluminacao", label: "Iluminação" },
  { id: "transito", label: "Trânsito" },
  { id: "outro", label: "Outro" },
];

export default function NewReport() {
  const { user, ready } = useAuth();
  const nav = useNavigate();
  const geo = useGeo();
  const fileRef = useRef<HTMLInputElement>(null);
  const [hoods, setHoods] = useState<Neighborhood[]>([]);
  const [category, setCategory] = useState("alagamento");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Report | null>(null);

  useEffect(() => { api<Neighborhood[]>("/neighborhoods/").then(setHoods).catch(() => {}); }, []);

  if (ready && !user) return <Navigate to="/entrar" replace />;
  const hood = nearest(hoods, geo.lat, geo.lng);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("category", category);
    fd.append("title", title.trim());
    fd.append("description", description.trim());
    fd.append("latitude", String(geo.lat));
    fd.append("longitude", String(geo.lng));
    fd.append("author_latitude", String(geo.lat));
    fd.append("author_longitude", String(geo.lng));
    if (file) fd.append("photo", file);
    try { setSent(await api<Report>("/reports/", { method: "POST", body: fd })); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  if (sent) {
    return (
      <div className="app"><main className="screen">
        <h1 className="h1">Relato enviado</h1>
        <div className={`note ${sent.triage_passed ? "ok" : "warn"}`}>
          {sent.triage_passed ? "Passou na triagem automática. Agora moradores próximos podem confirmar." : "A triagem encontrou alertas. A redação vai analisar com atenção."}
        </div>
        <div className="card">
          <strong>Resultado da triagem</strong>
          {sent.triage_notes.split("\n").map((n) => <span key={n} className="m">• {n}</span>)}
        </div>
        <button className="btn primary" onClick={() => nav("/relatos?tab=meus")}>Ver meus relatos</button>
      </main></div>
    );
  }

  return (
    <div className="app">
      <form className="screen" onSubmit={submit}>
        <div className="row" style={{ paddingTop: 20 }}>
          <button type="button" className="btn ghost" aria-label="Voltar" style={{ width: 44, padding: 0 }} onClick={() => nav(-1)}><Icon name="back" className="ic" /></button>
          <h1 style={{ margin: 0, fontSize: 24 }}>Enviar um relato</h1>
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field" style={{ marginBottom: 6 }}>Categoria</legend>
          <div className="chips">
            {CATS.map((c) => (
              <button type="button" key={c.id} className={`chip ${category === c.id ? "on" : ""}`} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</button>
            ))}
          </div>
        </fieldset>
        <label className="field">Título
          <input className="input" required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Poste apagado perto do ponto" />
        </label>
        <label className="field">Descrição
          <textarea className="input" rows={3} required minLength={10} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Conte o que aconteceu, quando e onde" />
        </label>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" className="btn" style={{ borderStyle: "dashed", minHeight: 48 }} onClick={() => fileRef.current?.click()}>
          <Icon name="camera" />{file ? file.name : "Adicionar foto (ajuda na verificação)"}
        </button>
        <div className={`note ${geo.source === "gps" ? "ok" : "warn"}`}>
          <Icon name="pin" /> {geo.source === "gps" ? `Localização confirmada${hood ? ` · ${hood.name}` : ""}` : `Localização de demonstração${hood ? ` · ${hood.name}` : ""}. Permita o GPS no navegador para usar o seu local.`}
        </div>
        <div className="card">
          <strong>O que acontece depois</strong>
          <span className="m"><b>1. Triagem automática:</b> confere local, foto e duplicados.</span>
          <span className="m"><b>2. Comunidade:</b> moradores próximos confirmam.</span>
          <span className="m"><b>3. Redação:</b> jornalistas validam e liberam o selo.</span>
        </div>
        <label className="row" style={{ fontSize: 14, minHeight: 44 }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 22, height: 22, accentColor: "var(--teal)" }} />
          Declaro que as informações são verdadeiras.
        </label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy || !agree} style={{ marginTop: "auto" }}>{busy ? "Enviando..." : "Enviar para verificação"}</button>
      </form>
    </div>
  );
}
