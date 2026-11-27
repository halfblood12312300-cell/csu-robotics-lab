import type { Asset } from "./content";
import { normalizeRepositoryMediaPath } from "./repository-media-path";

const AUTH_EVENT = "csu-lab-auth-change";
const CONTENT_EVENT = "csu-lab-content-change";
const CONTENT_STORAGE_KEY = "csu-lab-content-change-v1";
type StoredSession = { token: string; expiresAt: number };
declare const __CSU_RUNTIME_API_FALLBACK__: string | null;
let apiBase = normalizeBase(__CSU_RUNTIME_API_FALLBACK__ ?? import.meta.env.VITE_API_BASE_URL ?? "");
let memorySession: StoredSession | null = null;
let authGeneration = 0;
const previews = new Map<string, { url: string; expiresAt: number }>();
const pendingPreviews = new Map<string, Promise<string>>();
function clearPrivatePreviews() {
  authGeneration++;
  previews.clear();
  pendingPreviews.clear();
}

function normalizeBase(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return "";
    return url.toString().replace(/\/+$/, "");
  } catch { return ""; }
}

export function publicAssetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}

export async function initializeApiConfig() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(publicAssetUrl("runtime-config.json"), { cache: "no-store", signal: controller.signal });
    if (response.ok) {
      const value = await response.json();
      if (value && typeof value === "object" && "apiBaseUrl" in value && typeof value.apiBaseUrl === "string") apiBase = normalizeBase(value.apiBaseUrl);
    }
  } catch { /* Keep the embedded public API address if the optional runtime override cannot be loaded. */ }
  finally { clearTimeout(timeout); }
}

export function isApiConfigured() { return !!apiBase; }
export function apiBaseUrl() { return apiBase; }
function sessionKey() { return `csu-lab-admin:${apiBase}`; }

export function getAdminSession(): StoredSession | null {
  let stored = memorySession;
  try {
    const value = sessionStorage.getItem(sessionKey());
    if (value) stored = JSON.parse(value);
  } catch { /* Memory still permits a session when storage is unavailable. */ }
  if (!stored || typeof stored.token !== "string" || !Number.isFinite(stored.expiresAt) || stored.expiresAt <= Date.now()) {
    if (stored || memorySession || previews.size || pendingPreviews.size) clearPrivatePreviews();
    memorySession = null;
    try { sessionStorage.removeItem(sessionKey()); } catch {}
    return null;
  }
  return stored;
}

export function clearAdminSession() {
  memorySession = null;
  clearPrivatePreviews();
  try { sessionStorage.removeItem(sessionKey()); } catch {}
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function onAuthChange(listener: () => void) {
  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
}
export function notifyContentChanged() {
  window.dispatchEvent(new Event(CONTENT_EVENT));
  try { localStorage.setItem(CONTENT_STORAGE_KEY, Date.now() + ":" + Math.random()); } catch {}
}
export function onContentChange(listener: () => void) {
  const crossTab = (event: StorageEvent) => {
    if (event.key === CONTENT_STORAGE_KEY) listener();
  };
  window.addEventListener(CONTENT_EVENT, listener);
  window.addEventListener("storage", crossTab);
  return () => {
    window.removeEventListener(CONTENT_EVENT, listener);
    window.removeEventListener("storage", crossTab);
  };
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!apiBase) throw new Error("在线服务暂未启用。");
  if (!/^\/api(?:\/|$)/.test(path) || /[\r\n\\]/.test(path)) throw new Error("请求地址无效。");
  const headers = new Headers(init.headers);
  // Public content must not need an authenticated CORS preflight, even in an admin tab.
  const publicRead = path === "/api/data" && ["GET", "HEAD"].includes((init.method || "GET").toUpperCase());
  const session = publicRead ? null : getAdminSession();
  if (session) headers.set("Authorization", `Bearer ${session.token}`);
  else headers.delete("Authorization");
  let response: Response;
  try { response = await fetch(`${apiBase}${path}`, { ...init, headers, credentials: "omit", cache: "no-store" }); }
  catch (failure) {
    if (failure instanceof Error && failure.name === "AbortError") throw failure;
    throw new Error("暂时无法连接在线服务，请稍后重试。");
  }
  if (response.status === 401 && session) clearAdminSession();
  return response;
}

export async function apiJson<T = any>(path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const requestGeneration = authGeneration;
  const response = await apiFetch(path, body === undefined ? init : {
    ...init, method: "POST", headers: { ...Object.fromEntries(new Headers(init.headers)), "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  let value: any;
  try { value = await response.json(); }
  catch { throw new Error("服务暂时无法连接，请稍后重试。"); }
  if (!response.ok) throw Object.assign(new Error(value.error || "操作失败，请稍后重试。"), { status: response.status });
  if (requestGeneration === authGeneration && getAdminSession()) {
    if (Array.isArray(value.assets)) rememberAssetPreviews(value.assets);
    if (value.url && value.preview_url) rememberAssetPreviews([value]);
  }
  if (body !== undefined && /^\/api\/admin\/(article|settings)$/.test(path)) notifyContentChanged();
  return value as T;
}

export async function loginAdmin(password: string) {
  const value = await apiJson<{ token: string; expiresAt: number }>("/api/login", { password });
  if (!value.token || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) throw new Error("登录未完成，请重试。");
  clearPrivatePreviews();
  memorySession = { token: value.token, expiresAt: value.expiresAt };
  try { sessionStorage.setItem(sessionKey(), JSON.stringify(memorySession)); } catch {}
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export async function logoutAdmin() {
  try { if (getAdminSession()) await apiJson("/api/logout", {}); }
  catch { /* Always remove this browser's session, including while offline. */ }
  finally { clearAdminSession(); }
}

const canonicalMedia = /^\/api\/media\/([a-zA-Z0-9_.-]+)$/;
export function isCanonicalMediaUrl(value: string) { return canonicalMedia.test(value); }

export function mediaUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const repositoryPath = normalizeRepositoryMediaPath(value);
  if (repositoryPath) return publicAssetUrl(repositoryPath);
  if (/^\/api\/media\/[a-zA-Z0-9_.-]+(?:\?[^#]*)?$/.test(value)) {
    if (!apiBase) return undefined;
    const url = new URL(value, "https://media.local");
    if ([...url.searchParams.keys()].some((key) => !["preview_expires", "preview_signature"].includes(key))) return undefined;
    return `${apiBase}${url.pathname}${url.search}`;
  }
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function rememberAssetPreviews(assets: Asset[]) {
  if (!getAdminSession()) return;
  for (const asset of assets) {
    if (!isCanonicalMediaUrl(asset.url) || !asset.preview_url || !mediaUrl(asset.preview_url)) continue;
    try {
      const raw = Number(new URL(asset.preview_url, "https://media.local").searchParams.get("preview_expires"));
      const expiresAt = raw < 1e12 ? raw * 1000 : raw;
      if (expiresAt > Date.now()) previews.set(asset.url, { url: asset.preview_url, expiresAt });
    } catch {}
  }
}

export function cachedPreviewUrl(canonical: string): string | undefined {
  if (!getAdminSession()) return undefined;
  const preview = previews.get(canonical);
  return preview && preview.expiresAt > Date.now() + 15000 ? mediaUrl(preview.url) : undefined;
}

export async function getPreviewUrl(canonical: string): Promise<string> {
  const cached = cachedPreviewUrl(canonical);
  if (cached) return cached;
  const id = canonical.match(canonicalMedia)?.[1];
  if (!id || !getAdminSession()) return mediaUrl(canonical) || "";
  const pending = pendingPreviews.get(canonical);
  if (pending) return pending;
  const requestGeneration = authGeneration;
  const request = apiJson<{ preview_url: string; expiresAt: number }>("/api/admin/media/preview", { id })
    .then((value) => {
      if (requestGeneration !== authGeneration || !getAdminSession()) return "";
      const resolved = mediaUrl(value.preview_url);
      if (!resolved) throw new Error("素材预览暂时不可用。");
      previews.set(canonical, { url: value.preview_url, expiresAt: value.expiresAt });
      return resolved;
    })
    .finally(() => { if (pendingPreviews.get(canonical) === request) pendingPreviews.delete(canonical); });
  pendingPreviews.set(canonical, request);
  return request;
}
