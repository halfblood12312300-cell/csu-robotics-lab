import { ApiError, type AdminSession, type Env } from "./types.ts";

const encoder = new TextEncoder();
export const ACCESS_KEY_PREFIX = "csu_admin_";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const PREVIEW_TTL_MS = 10 * 60 * 1000;

export function base64url(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encoding");
  const raw = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  if (base64url(bytes) !== value) throw new Error("Noncanonical encoding");
  return bytes;
}

export async function sha256(value: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function parseAccessKeyHash(value: string | undefined): Uint8Array {
  try {
    const digest = fromBase64url(value || "");
    if (digest.length !== 32) throw new Error("Invalid key configuration");
    return digest;
  } catch {
    throw new ApiError("管理员登录尚未配置，请先完成后端访问密钥设置。", 503);
  }
}

function signingSecret(env: Env): Uint8Array {
  try {
    const secret = fromBase64url(env.MEDIA_SIGNING_SECRET || "");
    if (secret.byteLength < 32) throw new Error("Invalid secret");
    return secret;
  } catch {
    throw new ApiError("私有素材预览尚未配置，请先完成后端密钥设置。", 503);
  }
}

export function requireAuthConfiguration(env: Env): void {
  parseAccessKeyHash(env.ADMIN_KEY_HASH);
  signingSecret(env);
}

/** Only the 256-bit generated access-key format is accepted, never a chosen password. */
export async function verifyAccessKey(accessKey: string, storedHash: string | undefined): Promise<boolean> {
  const digest = parseAccessKeyHash(storedHash);
  if (!/^csu_admin_[A-Za-z0-9_-]{43}$/.test(accessKey)) return false;
  try { if (fromBase64url(accessKey.slice(ACCESS_KEY_PREFIX.length)).length !== 32) return false; }
  catch { return false; }
  const actual = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(accessKey)));
  // Fixed-length comparison; do not return on the first differing byte.
  let difference = 0;
  for (let i = 0; i < digest.length; i++) difference |= digest[i] ^ actual[i];
  return difference === 0;
}

export async function issueSession(env: Env, now = Date.now()) {
  requireAuthConfiguration(env);
  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expiresAt = now + SESSION_TTL_MS;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(now),
    env.DB.prepare("INSERT INTO admin_sessions (token_hash,key_version,created_at,expires_at) VALUES (?,?,?,?)")
      .bind(tokenHash, await sha256(env.ADMIN_KEY_HASH!), now, expiresAt),
  ]);
  return { token, expiresAt };
}

function bearerToken(request: Request): string | null {
  const match = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/i);
  return match?.[1] || null;
}

export async function authenticate(request: Request, env: Env, now = Date.now()): Promise<AdminSession | null> {
  const token = bearerToken(request);
  if (!token || !env.ADMIN_KEY_HASH) return null;
  // Legacy identity headers and browser cookies are deliberately not consulted.
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT expires_at,key_version FROM admin_sessions WHERE token_hash=?",
  ).bind(tokenHash).first<{ expires_at: number; key_version: string }>();
  if (!row || row.expires_at <= now || row.key_version !== await sha256(env.ADMIN_KEY_HASH)) return null;
  return { tokenHash, expiresAt: row.expires_at };
}

export async function requireAdmin(request: Request, env: Env): Promise<AdminSession> {
  const session = await authenticate(request, env);
  if (!session) throw new ApiError("管理员登录已失效，请重新登录。", 401);
  return session;
}

export async function revokeSession(request: Request, env: Env): Promise<void> {
  const token = bearerToken(request);
  if (token) await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await sha256(token)).run();
}

/** Fixed windows count attempts atomically in D1, including concurrent requests. */
export async function rateLimited(
  request: Request, env: Env, scope: string, max: number, windowMs: number, now = Date.now(),
): Promise<boolean> {
  // Cloudflare supplies this header on deployed requests. Do not trust X-Forwarded-For.
  const ipHash = await sha256(request.headers.get("cf-connecting-ip") || "local-development");
  const expires = (Math.floor(now / windowMs) + 1) * windowMs;
  const id = `${scope}:${ipHash}:${expires}`;
  await env.DB.prepare("DELETE FROM throttle WHERE expires <= ?").bind(now).run();
  const row = await env.DB.prepare(
    "INSERT INTO throttle (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count",
  ).bind(id, expires).first<{ count: number }>();
  return (row?.count || 0) > max;
}

function validMediaId(id: string) { return /^[A-Za-z0-9_.-]{1,100}$/.test(id); }
function previewMessage(id: string, expiresAt: number) {
  return encoder.encode(`csu-media-preview-v1\n${id}\n${expiresAt}`);
}

async function previewKey(env: Env, usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", signingSecret(env) as Uint8Array<ArrayBuffer>, {
    name: "HMAC", hash: "SHA-256",
  }, false, [usage]);
}

export async function createPreviewUrl(env: Env, id: string, now = Date.now()) {
  if (!validMediaId(id)) throw new ApiError("素材编号无效");
  const expiresAt = now + PREVIEW_TTL_MS;
  const signature = base64url(new Uint8Array(await crypto.subtle.sign(
    "HMAC", await previewKey(env, "sign"), previewMessage(id, expiresAt),
  )));
  return {
    preview_url: `/api/media/${id}?preview_expires=${expiresAt}&preview_signature=${signature}`,
    expiresAt,
  };
}

export async function verifyPreviewUrl(env: Env, url: URL, id: string, now = Date.now()): Promise<boolean> {
  const expiresText = url.searchParams.get("preview_expires") || "";
  const signature = url.searchParams.get("preview_signature") || "";
  if (!validMediaId(id) || !/^\d{13}$/.test(expiresText) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
  const expiresAt = Number(expiresText);
  if (expiresAt <= now || expiresAt > now + PREVIEW_TTL_MS) return false;
  try {
    return await crypto.subtle.verify("HMAC", await previewKey(env, "verify"),
      fromBase64url(signature) as Uint8Array<ArrayBuffer>, previewMessage(id, expiresAt));
  } catch { return false; }
}
