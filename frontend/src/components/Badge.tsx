import type { ReportStatus, Verification } from "../api";
import { Icon } from "./Icon";

type Key = Verification | ReportStatus;

const MAP: Record<string, { cls: string; label: string; icon: "check" | "clock" }> = {
  verificado: { cls: "verificado", label: "Verificado pela redação", icon: "check" },
  comunidade: { cls: "comunidade", label: "Confirmado pela comunidade", icon: "check" },
  analise: { cls: "analise", label: "Em análise", icon: "clock" },
  em_analise: { cls: "analise", label: "Em análise", icon: "clock" },
  descartado: { cls: "descartado", label: "Descartado", icon: "clock" },
};

export function Badge({ status, label }: { status: Key; label?: string }) {
  const m = MAP[status];
  return (
    <span className={`badge ${m.cls}`}>
      <Icon name={m.icon} />
      {label ?? m.label}
    </span>
  );
}
