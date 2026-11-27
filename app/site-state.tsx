import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiBaseUrl, publicAssetUrl, apiJson, clearAdminSession, getAdminSession, isApiConfigured, onAuthChange, onContentChange } from "./api-client";
import { initialArticles, normalizeSettings, type Article, type Settings } from "./content";

import { createPublicSnapshot, readPublicSnapshot, canUseSnapshot, type PublicSnapshot } from "./public-snapshot.ts";

type PublicState = { settings: Settings; articles: Article[]; loading: boolean; error: string; online: boolean; configured: boolean; formReady: boolean; syncedAt?: number; refresh: () => Promise<void> };
type SessionState = { authenticated: boolean; isAdmin: boolean; loading: boolean; configured: boolean };
const PublicContext = createContext<PublicState | null>(null);
const SessionContext = createContext<SessionState>({ authenticated: false, isAdmin: false, loading: false, configured: false });

type PublicContent = { settings: Settings; articles: Article[] };
type PublicResponse = PublicContent & { capabilities?: { formEditor?: boolean } };
function cacheKey() { return "csu-lab-static-content-v3:" + import.meta.env.BASE_URL; }
function readPublicCache(): PublicSnapshot | null {
  try {
    const raw = localStorage.getItem(cacheKey());
    return raw ? readPublicSnapshot(JSON.parse(raw)) : null;
  } catch { return null; }
}
function storePublicCache(value: PublicSnapshot) {
  // Only validated public fields are cached, never admin data or applications.
  try { localStorage.setItem(cacheKey(), JSON.stringify(value)); } catch {}
}
function isNativeJoin() {
  return window.location.hash.split("?")[0] === "#/join";
}

export function SiteStateProvider({ children }: { children: ReactNode }) {
  const configured = isApiConfigured();
  const cached = useRef<PublicSnapshot | null>(null);
  const [data, setData] = useState<PublicContent>(() => {
    cached.current = readPublicCache();
    return cached.current ? { settings: cached.current.settings, articles: cached.current.articles } : { settings: normalizeSettings(), articles: configured ? [] : initialArticles };
  });
  const readGeneration = useRef(0);
  const activeRead = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(!cached.current && (configured || import.meta.env.PROD));
  const [syncedAt, setSyncedAt] = useState<number | undefined>(cached.current?.capturedAt);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [session, setSession] = useState<SessionState>({ authenticated: false, isAdmin: false, loading: configured && !!getAdminSession(), configured });
  const refresh = useCallback(async () => {
    const generation = ++readGeneration.current;
    activeRead.current?.abort();
    const controller = new AbortController();
    activeRead.current = controller;
    const current = () => generation === readGeneration.current && !controller.signal.aborted;
    const publishStatic = (value: PublicSnapshot) => {
      setData({ settings: value.settings, articles: value.articles });
      setSyncedAt(value.capturedAt);
      setOnline(false);
      setFormReady(false);
      setError("");
      setLoading(false);
    };
    async function bounded<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
      const request = new AbortController();
      const cancel = () => request.abort();
      if (controller.signal.aborted) cancel();
      controller.signal.addEventListener("abort", cancel, { once: true });
      const timeout = setTimeout(cancel, ms);
      try { return await fn(request.signal); }
      finally { clearTimeout(timeout); controller.signal.removeEventListener("abort", cancel); }
    }
    try {
      // Production visitors use only the same-origin, published Pages snapshot.
      // A time-bucket query helps bypass stale CDN responses without cache-busting every request.
      if (import.meta.env.PROD) {
        try {
          const value = await bounded(async signal => {
            const url = publicAssetUrl("public-content.json") + "?v=" + Math.floor(Date.now() / 60000);
            const response = await fetch(url, { cache: "no-store", signal });
            if (!response.ok) throw new Error("静态内容暂不可用");
            return readPublicSnapshot(await response.json());
          }, 15000);
          if (!current()) return;
          if (canUseSnapshot(value, cached.current)) {
            cached.current = value;
            storePublicCache(value);
          }
        } catch { /* Keep the last valid static snapshot. */ }
      }
      if (!current()) return;
      if (cached.current) publishStatic(cached.current);
      else if (import.meta.env.PROD) {
        setData({ settings: normalizeSettings({ registrationOpen: false }), articles: initialArticles });
        setError("暂时无法读取已发布内容，请稍后重新加载。");
        setSyncedAt(undefined);
        setOnline(false); setFormReady(false);
      }
      // The admin workbench reads its own authenticated data. Keep live public
      // reads for its header/preview, local development, and native registration only.
      // External questionnaire visitors never contact the Worker.
      const needsLive = configured && (!import.meta.env.PROD || !!getAdminSession() ||
        (isNativeJoin() && (!cached.current || cached.current.settings.registration.mode === "internal")));
      if (!needsLive) return;
      for (let attempt = 0; attempt < 2 && current(); attempt++) {
        try {
          const capturedAt = Date.now();
          const value = await bounded(signal => apiJson<PublicResponse>("/api/data", undefined, { signal }), 15000);
          const next = createPublicSnapshot(value, capturedAt);
          if (!current()) return;
          if (cached.current && next.settings.revision < cached.current.settings.revision) throw new Error("Older revision");
          setData({ settings: next.settings, articles: next.articles });
          setOnline(true);
          setFormReady(value.capabilities?.formEditor === true);
          setError("");
          // Never write live data to the static cache or label it as published.
          return;
        } catch { /* Retain the last static view. */ }
      }
      if (!current()) return;
      if (!cached.current) {
        setData({ settings: normalizeSettings({ registrationOpen: false }), articles: initialArticles });
        setError("暂时无法连接在线服务，请稍后重新加载。");
      }
      setOnline(false); setFormReady(false);
    } finally {
      if (current()) {
        activeRead.current = null;
        setLoading(false);
      }
    }
  }, [configured]);
  useEffect(() => {
    void refresh();
    const unsubscribe = onContentChange(() => { void refresh(); });
    const unsubscribeAuth = onAuthChange(() => { void refresh(); });
    const routeChange = () => { void refresh(); };
    window.addEventListener("hashchange", routeChange);
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
      unsubscribeAuth();
      window.removeEventListener("hashchange", routeChange);
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
  return <PublicContext.Provider value={{ ...data, loading, error, online, configured, formReady, syncedAt, refresh }}><SessionContext.Provider value={session}>{children}</SessionContext.Provider></PublicContext.Provider>;
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
