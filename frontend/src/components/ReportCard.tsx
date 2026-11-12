import type { Me, Report } from "../api";
import { distanceLabel, timeAgo } from "../utils";
import { Badge } from "./Badge";
import { Icon } from "./Icon";

interface Props {
  report: Report;
  user: Me | null;
  onConfirm: (r: Report) => void;
  onListen: (r: Report) => void;
  onFlag: (r: Report) => void;
  onReview: (r: Report, approve: boolean) => void;
}

const KICKER: Record<string, string> = { alagamento: "", iluminacao: "amber", transito: "", outro: "red" };

export function ReportCard({ report: r, user, onConfirm, onListen, onFlag, onReview }: Props) {
  const inReview = r.status === "em_analise";
  const final = r.status === "verificado" || r.status === "descartado";
  return (
    <article className="card">
      <span className={`k ${KICKER[r.category] ?? ""}`}>{r.category_label} · {r.neighborhood_name}</span>
      <h3 className="t">{r.title}</h3>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <Badge status={r.status} />
        <span className="m">{timeAgo(r.created_at)}{r.distance_m != null ? ` · ${distanceLabel(r.distance_m)}` : ""}</span>
      </div>
      {r.review_note && <p className="m" style={{ margin: 0 }}>Redação: {r.review_note}</p>}
      {inReview && (
        <div className="steps" aria-label="Progresso da verificação">
          <span className={r.triage_passed ? "done" : ""}>Triagem {r.triage_passed ? "✓" : "com alertas"}</span>→<span>Comunidade</span>→<span>Redação</span>
        </div>
      )}
      {r.status !== "descartado" && (
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button className={`btn ${r.confirmed_by_me ? "on" : ""}`} onClick={() => onConfirm(r)} aria-pressed={r.confirmed_by_me}>
            <Icon name="thumb" />Confirmo · {r.confirmations_count}
          </button>
          <button className="btn ghost" onClick={() => onListen(r)}><Icon name="speaker" />Ouvir</button>
          <button className="btn ghost" aria-label="Denunciar relato" onClick={() => onFlag(r)}><Icon name="flag" /></button>
        </div>
      )}
      {user?.is_staff && !final && (
        <div className="row">
          <button className="btn on" onClick={() => onReview(r, true)}>Verificar</button>
          <button className="btn ghost" onClick={() => onReview(r, false)}>Descartar</button>
        </div>
      )}
    </article>
  );
}
