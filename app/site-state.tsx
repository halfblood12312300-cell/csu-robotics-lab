import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiBaseUrl, apiJson, clearAdminSession, getAdminSession, isApiConfigured, onAuthChange, onContentChange } from "./api-client";
import { initialArticles, normalizeSettings, type Article, type Settings } from "./content";

type PublicState = { settings: Settings; articles: Article[]; loading: boolean; error: string; online: boolean; configured: boolean; formReady: boolean; refresh: () => Promise<void> };
type SessionState = { authenticated: boolean; isAdmin: boolean; loading: boolean; configured: boolean };
const PublicContext = createContext<PublicState | null>(null);
const SessionContext = createContext<SessionState>({ authenticated: false, isAdmin: false, loading: false, configured: false });

type PublicContent = { settings: Settings; articles: Article[] };
type PublicResponse = PublicContent & { capabilities?: { formEditor?: boolean } };
function cacheKey() { return "csu-lab-public-content-v1:" + apiBaseUrl(); }
function publicContent(value: PublicResponse): PublicContent {
  if (!value?.settings || !Array.isArray(value.articles)) throw new Error("内容暂时不可用");
  return { settings: normalizeSettings(value.settings), articles: value.articles.filter((article) => article.status === "published") };
}
function readPublicCache(): PublicContent | null {
  try {
    const raw = localStorage.getItem(cacheKey());
    return raw ? publicContent(JSON.parse(raw)) : null;
  } catch { return null; }
}
function storePublicCache(value: PublicContent) {
  // Only the public /api/data response is cached, never admin data, credentials or applications.
  try { localStorage.setItem(cacheKey(), JSON.stringify(value)); } catch {}
}

export function SiteStateProvider({ children }: { children: ReactNode }) {
  const configured = isApiConfigured();
  const cached = useRef<PublicContent | null>(null);
  const [data, setData] = useState<PublicContent>(() => {
    cached.current = configured ? readPublicCache() : null;
    return cached.current || { settings: normalizeSettings(), articles: configured ? [] : initialArticles };
  });
  const readGeneration = useRef(0);
  const activeRead = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [session, setSession] = useState<SessionState>({ authenticated: false, isAdmin: false, loading: configured && !!getAdminSession(), configured });
  const refresh = useCallback(async () => {
    if (!configured) return;
    const generation = ++readGeneration.current;
    activeRead.current?.abort();
    const controller = new AbortController();
    activeRead.current = controller;
    try {
      // Retry only the public GET, never a mutation. Time out stalled reads.
      for (let attempt = 0; attempt < 2; attempt++) {
        if (controller.signal.aborted) return;
        const attemptController = new AbortController();
        const cancel = () => attemptController.abort();
        controller.signal.addEventListener("abort", cancel, { once: true });
        const timeout = setTimeout(cancel, 15000);
        try {
          const value = await apiJson<PublicResponse>("/api/data", undefined, { signal: attemptController.signal });
          const next = publicContent(value);
          if (generation !== readGeneration.current || controller.signal.aborted) return;
          cached.current = next;
          setData(next);
          storePublicCache(next);
          setOnline(true);
          setFormReady(value.capabilities?.formEditor === true);
          setError("");
          return;
        } catch (failure) {
          if (controller.signal.aborted) return;
          if (attempt === 1) throw failure;
        } finally {
          clearTimeout(timeout);
          controller.signal.removeEventListener("abort", cancel);
        }
      }
    } catch {
      if (generation !== readGeneration.current || controller.signal.aborted) return;
      // A temporary failure must not replace a successful published revision with built-in content.
      if (!cached.current) setData({ settings: normalizeSettings({ registrationOpen: false }), articles: initialArticles });
      setOnline(false);
      setFormReady(false);
      setError(cached.current ? "暂时无法获取最新内容，当前显示上一次成功读取的版本。请重新加载。" : "暂时无法获取最新内容，当前显示实验室介绍。请重新加载。");
    } finally {
      if (generation === readGeneration.current) {
        activeRead.current = null;
        setLoading(false);
      }
    }
  }, [configured]);
  useEffect(() => {
    void refresh();
    const unsubscribe = onContentChange(() => { void refresh(); });
    // Focus/visibility often fire together; don't duplicate an active request.
    const resume = () => {
      if (document.visibilityState === "visible" && !activeRead.current) void refresh();
    };
    // Storage events only notify tabs on this device. Other devices need
    // their own refresh, including when the visitor leaves the page open.
    const interval = window.setInterval(resume, 60000);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
      readGeneration.current++;
      activeRead.current?.abort();
      activeRead.current = null;
    };
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
