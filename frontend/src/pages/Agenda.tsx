import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type EventItem } from "../api";
import { useAuth } from "../auth";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { isoDay } from "../utils";

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS = Array.from({ length: 5 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });

function scheduleNotice(ev: EventItem) {
  if (!("Notification" in window)) return;
  Notification.requestPermission().then((p) => {
    if (p !== "granted") return;
    const delay = new Date(ev.starts_at).getTime() - Date.now() - 15 * 60000;
    if (delay > 0 && delay < 2147483647) setTimeout(() => new Notification(`Daqui a 15 min: ${ev.title}`), delay);
  });
}

export default function Agenda() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { toast, show } = useToast();
  const [sel, setSel] = useState(0);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api<EventItem[]>(`/events/?date=${isoDay(DAYS[sel])}`).then(setEvents).catch((e: Error) => setError(e.message));
  }, [sel, user]);

  const remind = async (ev: EventItem) => {
    if (!user) return nav("/entrar");
    try {
      const updated = await api<EventItem>(`/events/${ev.id}/reminder/`, { method: "POST" });
      setEvents((list) => list.map((e) => (e.id === ev.id ? updated : e)));
      if (updated.has_reminder) { scheduleNotice(updated); show("Lembrete ativado."); } else show("Lembrete removido.");
    } catch (e) { show((e as Error).message); }
  };

  return (
    <main className="screen">
      <h1 className="h1">Agenda</h1>
      <div className="days" role="tablist">
        {DAYS.map((d, i) => (
          <button key={i} role="tab" aria-selected={sel === i} className={`day ${sel === i ? "on" : ""}`} onClick={() => setSel(i)}>
            <span>{i === 0 ? "Hoje" : WD[d.getDay()]}</span><b>{String(d.getDate()).padStart(2, "0")}</b>
          </button>
        ))}
      </div>
      {error && <p className="err">{error}</p>}
      {!error && events.length === 0 && <p className="m">Nenhuma pauta para este dia.</p>}
      {events.map((ev) => (
        <div key={ev.id} className="ev">
          <span className="tm">{new Date(ev.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          <article className="card">
            <span className="k">{ev.category} · {ev.neighborhood_name}</span>
            <h2 className="t">{ev.title}</h2>
            <Badge status={ev.source === "redacao" ? "verificado" : "comunidade"} label={ev.source_label} />
            <button className={`btn ${ev.has_reminder ? "on" : ""}`} style={{ alignSelf: "flex-start" }} aria-pressed={ev.has_reminder} onClick={() => remind(ev)}>
              <Icon name={ev.has_reminder ? "check" : "bell"} />{ev.has_reminder ? "Lembrete ativo" : "Lembrar-me"}
            </button>
          </article>
        </div>
      ))}
      {toast}
    </main>
  );
}
