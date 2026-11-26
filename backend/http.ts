import { ApiError, type Env } from "./types.ts";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
  } });
}

export function frontendOrigin(env: Env): string {
  try {
    const origin = new URL(env.FRONTEND_ORIGIN);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
    if (origin.origin !== env.FRONTEND_ORIGIN || (origin.protocol !== "https:" && !(local && origin.protocol === "http:"))) {
      throw new Error("Origin must be exact");
    }
    return origin.origin;
  } catch { throw new ApiError("后端前端域名配置无效", 503); }
}

export function checkOrigin(request: Request, env: Env): void {
  const expected = frontendOrigin(env);
  const origin = request.headers.get("origin");
  if (origin && origin !== expected) throw new ApiError("请求来源无效", 403);
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && origin !== expected) {
    throw new ApiError("请求来源无效", 403);
  }
}

export function preflight(request: Request, env: Env): Response {
  if (request.headers.get("origin") !== frontendOrigin(env)) throw new ApiError("请求来源无效", 403);
  const method = request.headers.get("access-control-request-method") || "";
  const headers = (request.headers.get("access-control-request-headers") || "")
    .split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (!["GET", "POST", "HEAD"].includes(method) || headers.some((v) => !["authorization", "content-type", "range"].includes(v))) {
    throw new ApiError("跨域请求不受支持", 403);
  }
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Range",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
  } });
}

export function withCors(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers);
  headers.set("Vary", [headers.get("Vary"), "Origin"].filter(Boolean).join(", "));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  try {
    if (request.headers.get("origin") === frontendOrigin(env)) {
      headers.set("Access-Control-Allow-Origin", env.FRONTEND_ORIGIN);
      headers.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, ETag");
    }
  } catch { /* Configuration errors must not turn into an unhandled error. */ }
  return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
}

export async function readJson(request: Request, maxBytes = 100_000): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError("请求格式无效", 415);
  }
  if (Number(request.headers.get("content-length") || 0) > maxBytes) throw new ApiError("内容过长", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("请求内容无效");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ApiError("内容过长", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new ApiError("请求内容无效"); }
}
