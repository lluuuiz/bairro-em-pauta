import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Icon } from "../components/Icon";
import { useNotices } from "../notices";
import { timeAgo } from "../utils";

export default function Avisos() {
  const { user } = useAuth();
  const { items, unread, markRead } = useNotices();
  const nav = useNavigate();

  return (
    <main className="screen">
      <div className="row" style={{ paddingTop: 20 }}>
        <button className="btn ghost" aria-label="Voltar" style={{ width: 44, padding: 0 }} onClick={() => nav(-1)}><Icon name="back" /></button>
        <h1 style={{ margin: 0, fontSize: 24 }}>Avisos</h1>
      </div>
      {!user && (
        <div className="card">
          <strong>Entre para receber avisos</strong>
          <span className="m">Siga seus bairros e saiba quando eles forem pauta nos telejornais.</span>
          <Link to="/entrar" className="btn on" style={{ textDecoration: "none" }}>Entrar</Link>
        </div>
      )}
      {user && unread > 0 && <button className="btn" style={{ alignSelf: "flex-start" }} onClick={markRead}>Marcar todos como lidos</button>}
      {user && items.length === 0 && (
        <p className="m">Nenhum aviso ainda. Na tela Início, escolha um bairro e toque em “Seguir” para ser avisado quando ele for pauta.</p>
      )}
      {items.map((n) => (
        <article key={n.id} className="card" style={n.read ? undefined : { borderColor: "var(--teal)", borderWidth: 2 }}>
          <span className="k">{n.kind === "alerta" ? "Alerta" : "Pauta de telejornal"} · {n.neighborhood}</span>
          <h2 className="t">{n.title}</h2>
          {n.program && (
            <span className="m">
              {n.program}{n.airs_at ? ` · ${new Date(n.airs_at).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
          )}
          <span className="m">{timeAgo(n.created_at)}</span>
        </article>
      ))}
    </main>
  );
}
