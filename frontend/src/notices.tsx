import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, type Notice } from "./api";
import { useAuth } from "./auth";

interface Value { unread: number; items: Notice[]; refresh: () => Promise<void>; markRead: () => Promise<void> }
const Ctx = createContext<Value | null>(null);

// Consulta os avisos a cada minuto. Se chegar um novo com o app aberto, mostra uma notificação do navegador.
export function NoticesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notice[]>([]);
  const last = useRef(-1);

  const refresh = useCallback(async () => {
    if (!user) { setUnread(0); setItems([]); last.current = -1; return; }
    try {
      const r = await api<{ unread: number; items: Notice[] }>("/notices/");
      if (last.current >= 0 && r.unread > last.current && "Notification" in window && Notification.permission === "granted") {
        const n = r.items.find((i) => !i.read);
        if (n) new Notification("Seu bairro é pauta", { body: n.title });
      }
      last.current = r.unread;
      setUnread(r.unread);
      setItems(r.items);
    } catch { /* sem conexão: tenta de novo no próximo ciclo */ }
  }, [user]);

  useEffect(() => {
    last.current = -1;
    refresh();
    const id = window.setInterval(refresh, 60000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const markRead = async () => {
    await api("/notices/", { method: "POST", body: {} });
    last.current = 0;
    setUnread(0);
    setItems((list) => list.map((i) => ({ ...i, read: true })));
  };

  return <Ctx.Provider value={{ unread, items, refresh, markRead }}>{children}</Ctx.Provider>;
}

export function useNotices() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNotices fora do NoticesProvider");
  return v;
}
