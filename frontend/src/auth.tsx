import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, type Me } from "./api";

interface AuthValue {
  user: Me | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); return; }
    try { setUser(await api<Me>("/me/")); } catch { setToken(null); setUser(null); }
  }, []);

  useEffect(() => { refresh().finally(() => setReady(true)); }, [refresh]);

  const login = async (username: string, password: string) => {
    const { token } = await api<{ token: string }>("/auth/login/", { method: "POST", body: { username, password } });
    setToken(token);
    await refresh();
  };
  const register = async (username: string, password: string) => {
    const { token } = await api<{ token: string }>("/auth/register/", { method: "POST", body: { username, password } });
    setToken(token);
    await refresh();
  };
  const logout = () => { setToken(null); setUser(null); };

  return <Ctx.Provider value={{ user, ready, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fora do AuthProvider");
  return v;
}
