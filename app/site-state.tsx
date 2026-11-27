import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiBaseUrl, publicAssetUrl, apiJson, clearAdminSession, getAdminSession, isApiConfigured, onAuthChange, onContentChange } from "./api-client";
import { initialArticles, normalizeSettings, type Article, type Settings } from "./content";

import { createPublicSnapshot, readPublicSnapshot, canUseSnapshot, type PublicSnapshot } from "./public-snapshot.ts";

type PublicState = { settings: Settings; articles: Article[]; loading: boolean; error: string; online: boolean; configured: boolean; formReady: boolean; refresh: () => Promise<void> };
type SessionState = { authenticated: boolean; isAdmin: boolean; loading: boolean; configured: boolean };
const PublicContext = createContext<PublicState | null>(null);
const SessionContext = createContext<SessionState>({ authenticated: false, isAdmin: false, loading: false, configured: false });

type PublicContent = { settings: Settings; articles: Article[] };
type PublicResponse = PublicContent & { capabilities?: { formEditor?: boolean } };
function cacheKey() { return "csu-lab-public-content-v2:" + apiBaseUrl(); }
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
function snapshotMessage(value: PublicSnapshot | null): string {
  if (!value) return "暂时无法获取最新内容，当前显示实验室介绍。请重新加载。";
  const date = new Date(value.capturedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  return "实时服务暂不可达，当前显示最近同步的公开内容（北京时间 " + date + "）。在线报名需要连接实时服务。";
}

export function SiteStateProvider({ children }: { children: ReactNode }) {
  const configured = isApiConfigured();
  const cached = useRef<PublicSnapshot | null>(null);
  const [data, setData] = useState<PublicContent>(() => {
    cached.current = configured ? readPublicCache() : null;
    return cached.current ? { settings: cached.current.settings, articles: cached.current.articles } : { settings: normalizeSettings(), articles: configured ? [] : initialArticles };
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
    let liveSucceeded = false;
    const current = () => generation === readGeneration.current && !controller.signal.aborted;
    const apply = (value: PublicSnapshot) => {
      cached.current = value;
      setData({ settings: value.settings, articles: value.articles });
      storePublicCache(value);
    };
    // Same-origin Pages snapshot is loaded concurrently, not after the Worker timeout.
    const readStatic = async () => {
      const request = new AbortController();
      const cancel = () => request.abort();
      controller.signal.addEventListener("abort", cancel, { once: true });
      const timeout = setTimeout(cancel, 15000);
      try {
        const response = await fetch(publicAssetUrl("public-content.json"), { cache: "no-store", signal: request.signal });
        if (!response.ok) return;
        const value = readPublicSnapshot(await response.json());
        if (current() && !liveSucceeded && canUseSnapshot(value, cached.current)) {
          apply(value);
          setOnline(false);
          setFormReady(false);
          setError(snapshotMessage(value));
        }
      } catch { /* Live data and the previous valid copy remain available. */ }
      finally { clearTimeout(timeout); controller.signal.removeEventListener("abort", cancel); }
    };
    const readLive = async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (!current()) return;
        const request = new AbortController();
        const cancel = () => request.abort();
        controller.signal.addEventListener("abort", cancel, { once: true });
        const timeout = setTimeout(cancel, 15000);
        try {
          const capturedAt = Date.now();
          const value = await apiJson<PublicResponse>("/api/data", undefined, { signal: request.signal });
          const next = createPublicSnapshot(value, capturedAt);
          if (!current()) return;
          if (cached.current && next.settings.revision < cached.current.settings.revision) throw new Error("Older revision");
          liveSucceeded = true;
          apply(next);
          setOnline(true);
          setFormReady(value.capabilities?.formEditor === true);
          setError("");
          return;
        } catch {
          if (!current()) return;
        } finally {
          clearTimeout(timeout);
          controller.signal.removeEventListener("abort", cancel);
        }
      }
    };
    try {
      await Promise.all([readStatic(), readLive()]);
      if (!current()) return;
      if (!liveSucceeded) {
        if (!cached.current) setData({ settings: normalizeSettings({ registrationOpen: false }), articles: initialArticles });
        setOnline(false);
        setFormReady(false);
        setError(snapshotMessage(cached.current));
      }
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
