import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await (mode === "entrar" ? login(username.trim(), password) : register(username.trim(), password));
      nav("/relatos", { replace: true });
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="app">
      <form className="screen" onSubmit={submit}>
        <h1 style={{ margin: 0, paddingTop: 32, fontSize: 28, fontWeight: 800, color: "var(--teal)" }}>Bairro em Pauta</h1>
        <p className="m" style={{ margin: 0 }}>Entre para enviar relatos, confirmar o que acontece perto de você e ativar lembretes.</p>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "entrar"} className={mode === "entrar" ? "on" : ""} onClick={() => setMode("entrar")}>Entrar</button>
          <button type="button" role="tab" aria-selected={mode === "criar"} className={mode === "criar" ? "on" : ""} onClick={() => setMode("criar")}>Criar conta</button>
        </div>
        <label className="field">Nome de usuário
          <input className="input" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="field">Senha
          <input className="input" type="password" required minLength={6} autoComplete={mode === "entrar" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy}>{mode === "entrar" ? "Entrar" : "Criar conta"}</button>
        <button type="button" className="btn ghost" onClick={() => nav("/")}>Continuar sem entrar</button>
      </form>
    </div>
  );
}
