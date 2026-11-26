import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiJson, clearAdminSession, getAdminSession, isApiConfigured, onAuthChange, onContentChange } from "./api-client";
import { initialArticles, normalizeSettings, type Article, type Settings } from "./content";

type PublicState = { settings: Settings; articles: Article[]; loading: boolean; error: string; online: boolean; configured: boolean; formReady: boolean; refresh: () => Promise<void> };
type SessionState = { authenticated: boolean; isAdmin: boolean; loading: boolean; configured: boolean };
const PublicContext = createContext<PublicState | null>(null);
const SessionContext = createContext<SessionState>({ authenticated: false, isAdmin: false, loading: false, configured: false });

export function SiteStateProvider({ children }: { children: ReactNode }) {
  const configured = isApiConfigured();
  const [data, setData] = useState({ settings: normalizeSettings(), articles: configured ? [] as Article[] : initialArticles });
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [session, setSession] = useState<SessionState>({ authenticated: false, isAdmin: false, loading: configured && !!getAdminSession(), configured });
  const refresh = useCallback(async () => {
    if (!configured) return;
    try {
      const value = await apiJson<{ settings: Settings; articles: Article[]; capabilities?: { formEditor?: boolean } }>("/api/data");
      if (!value.settings || !Array.isArray(value.articles)) throw new Error("内容暂时不可用");
      setData({ settings: normalizeSettings(value.settings), articles: value.articles.filter((article) => article.status === "published") });
      setOnline(true);
      setFormReady(value.capabilities?.formEditor === true);
      setError("");
    } catch {
      setData({ settings: normalizeSettings({ registrationOpen: false }), articles: initialArticles });
      setOnline(false);
      setFormReady(false);
      setError("暂时无法获取最新内容，当前显示实验室介绍。请稍后重试。");
    } finally { setLoading(false); }
  }, [configured]);
  useEffect(() => {
    void refresh();
    return onContentChange(() => { void refresh(); });
  }, [refresh]);
  useEffect(() => {
    let disposed = false;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let generation = 0;
    async function check() {
      const checkId = ++generation;
      if (expiry) clearTimeout(expiry);
      const stored = getAdminSession();
      if (!configured || !stored) {
        if (!disposed) setSession({ authenticated: false, isAdmin: false, loading: false, configured });
        return;
      }
      setSession((value) => ({ ...value, loading: true }));
      try {
        const value = await apiJson<{ authenticated: boolean; isAdmin: boolean }>("/api/session");
        if (disposed || generation !== checkId) return;
        setSession({ authenticated: !!value.authenticated, isAdmin: !!value.isAdmin, loading: false, configured });
        if (value.isAdmin) expiry = setTimeout(() => clearAdminSession(), Math.max(0, stored.expiresAt - Date.now()));
        else clearAdminSession();
      } catch {
        if (!disposed && generation === checkId) setSession({ authenticated: false, isAdmin: false, loading: false, configured });
      }
    }
    void check();
    const unsubscribe = onAuthChange(() => { void check(); });
    return () => { disposed = true; generation++; unsubscribe(); if (expiry) clearTimeout(expiry); };
  }, [configured]);
  return <PublicContext.Provider value={{ ...data, loading, error, online, configured, formReady, refresh }}><SessionContext.Provider value={session}>{children}</SessionContext.Provider></PublicContext.Provider>;
}

export function usePublicState() {
  const context = useContext(PublicContext);
  if (!context) throw new Error("Missing site state provider");
  return context;
}
export const useSessionState = () => useContext(SessionContext);

/** A local editor preview: it never loads or saves site data and never creates an admin session. */
export function SettingsPreviewProvider({ settings, articles, children }: { settings: Settings; articles: Article[]; children: ReactNode }) {
  const state: PublicState = { settings: normalizeSettings(settings), articles: articles.filter((article) => article.status === "published"), loading: false, error: "", online: true, configured: true, formReady: true, refresh: async () => {} };
  return <PublicContext.Provider value={state}><SessionContext.Provider value={{ authenticated: false, isAdmin: false, loading: false, configured: true }}>{children}</SessionContext.Provider></PublicContext.Provider>;
}
