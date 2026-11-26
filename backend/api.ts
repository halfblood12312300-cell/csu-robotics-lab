import { z } from "zod";
import { initialArticles, defaultSettings } from "../app/content.ts";
import { normalizeRepositoryMediaPath } from "../app/repository-media-path.ts";
import { ApiError, type Env } from "./types.ts";
import { json, readJson } from "./http.ts";
import {
  authenticate, createPreviewUrl, issueSession, rateLimited, requireAdmin,
  requireAuthConfiguration, revokeSession, verifyAccessKey, verifyPreviewUrl,
} from "./auth.ts";
import { listAssets, mediaAction, requireMediaStorage, uploadChunk } from "./media.ts";

const safeUrl = z.string().max(2000).refine((s) => {
  if (!s || normalizeRepositoryMediaPath(s) || /^\/api\/media\/[a-zA-Z0-9_.-]+$/.test(s)) return true;
  try {
    const u = new URL(s);
    return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password;
  } catch { return false; }
}, "请填写有效链接");

const articleSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/),
  title: z.string().trim().min(2).max(100),
  category: z.enum(["招新通知", "研究导读", "平台介绍", "实验记录", "实验室动态"]),
  summary: z.string().trim().max(250), body: z.string().max(50000), cover: safeUrl,
  media: z.array(z.object({ type: z.enum(["image", "video"]), url: safeUrl, caption: z.string().max(150) })).max(20),
  status: z.enum(["published", "draft", "archived"]), date: z.string().max(20),
});
const settingsSchema = z.object({
  registrationOpen: z.boolean(), deadline: z.string().max(16), contact: z.string().max(100),
  heroImage: safeUrl, heroVideo: safeUrl, intro: z.string().max(250), location: z.string().max(150),
});
const applicationSchema = z.object({
  name: z.string().trim().min(2, "请填写姓名").max(40),
  college: z.string().trim().min(2, "请填写学院与专业").max(100), grade: z.string().trim().min(1).max(40),
  contact: z.string().trim().min(5, "请填写有效联系方式").max(100),
  directions: z.array(z.enum(["agent", "model", "system", "vision"])).min(1, "请选择至少一个兴趣方向").max(4),
  experience: z.string().trim().min(10, "请至少填写10字的自我介绍").max(2000),
  availability: z.string().trim().min(1).max(100), portfolio: safeUrl,
  consent: z.literal(true), website: z.string().max(0),
});

export async function getSettings(env: Env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE id=?").bind("site").first<{ value: string }>();
  return { ...defaultSettings, ...(row ? JSON.parse(row.value) : {}) } as typeof defaultSettings;
}

export async function getArticles(env: Env, all = false) {
  const { results } = await env.DB.prepare("SELECT * FROM articles ORDER BY updated_at DESC").all();
  const ids = new Set(results.map((r: any) => r.id));
  const rows = [
    ...results.map((r: any) => ({ ...r, media: JSON.parse(r.media) })),
    ...initialArticles.filter((a) => !ids.has(a.id)),
  ];
  return all ? rows : rows.filter((a) => a.status === "published");
}

/** Store stable media paths; never persist short-lived preview signatures. */
export function canonicalMediaUrl(value: unknown, origin: string): unknown {
  if (typeof value !== "string") return value;
  const repositoryPath = normalizeRepositoryMediaPath(value);
  if (repositoryPath) return repositoryPath;
  // Do not let URL normalization turn a rejected repository traversal into another endpoint.
  if (value.startsWith("/media/")) return value;
  try {
    const url = new URL(value, origin);
    if (url.origin === origin && /^\/api\/media\/[a-zA-Z0-9_.-]+$/.test(url.pathname)) return url.pathname;
  } catch { /* Schema validation reports invalid user input. */ }
  return value;
}

function normalizeContent(body: unknown, origin: string): any {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const value = { ...(body as Record<string, unknown>) };
  for (const key of ["cover", "heroImage", "heroVideo"]) if (key in value) value[key] = canonicalMediaUrl(value[key], origin);
  if (Array.isArray(value.media)) value.media = value.media.map((item) =>
    item && typeof item === "object" ? { ...item, url: canonicalMediaUrl(item.url, origin) } : item,
  );
  if (typeof value.body === "string") value.body = value.body.replace(/\]\(([^)\n]+)\)/g,
    (_, url: string) => `](${canonicalMediaUrl(url, origin)})`);
  return value;
}

async function publiclyReferenced(env: Env, id: string): Promise<boolean> {
  const url = "/api/media/" + id;
  const [settings, articles] = await Promise.all([getSettings(env), getArticles(env)]);
  return settings.heroImage === url || settings.heroVideo === url || articles.some((a) =>
    a.cover === url || a.media.some((m: any) => m.url === url) || a.body.includes("](" + url + ")"),
  );
}

async function serveMedia(request: Request, env: Env, id: string) {
  if (!env.BUCKET) return json({ error: "素材不存在" }, 404);
  if (!/^[a-zA-Z0-9_.-]{1,100}$/.test(id)) return json({ error: "素材不存在" }, 404);
  const publicAsset = await publiclyReferenced(env, id);
  if (!publicAsset && !await authenticate(request, env) && !await verifyPreviewUrl(env, new URL(request.url), id)) {
    return json({ error: "素材不存在" }, 404);
  }
  const file = await env.BUCKET.get(id, { range: request.headers });
  if (!file) return json({ error: "素材不存在" }, 404);
  const headers = new Headers();
  file.writeHttpMetadata(headers);
  headers.set("ETag", file.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  // A withdrawn publication must not remain readable from a browser cache.
  headers.set("Cache-Control", "private, no-store");
  const range = file.range as { offset?: number; length?: number } | undefined;
  const partial = request.headers.has("range") && range?.offset !== undefined && !!range.length;
  if (partial) {
    headers.set("Content-Range", `bytes ${range!.offset}-${range!.offset! + range!.length! - 1}/${file.size}`);
    headers.set("Content-Length", String(range!.length));
  } else headers.set("Content-Length", String(file.size));
  return new Response(request.method === "HEAD" ? null : file.body, { headers, status: partial ? 206 : 200 });
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return json({ error: "页面不存在" }, 404);
  const key = url.pathname.slice(5);
  if (request.method === "GET" || request.method === "HEAD") {
    if (key === "session") {
      const session = await authenticate(request, env);
      return json({ authenticated: !!session, isAdmin: !!session, ...(session ? { expiresAt: session.expiresAt } : {}) });
    }
    if (key === "data") return json({ settings: await getSettings(env), articles: await getArticles(env) });
    if (key === "admin" || key.startsWith("admin/")) {
      await requireAdmin(request, env);
      if (key.startsWith("admin/media/")) requireMediaStorage(env);
      if (key !== "admin") return json({ error: "页面不存在" }, 404);
      return json({
        capabilities: { mediaUpload: !!env.BUCKET },
        assets: await listAssets(env), settings: await getSettings(env), articles: await getArticles(env, true),
        applications: (await env.DB.prepare("SELECT * FROM applications ORDER BY created_at DESC").all()).results
          .map((r: any) => ({ ...r, directions: JSON.parse(r.directions) })),
      });
    }
    if (/^media\/[^/]+$/.test(key)) return serveMedia(request, env, key.slice(6));
    return json({ error: "页面不存在" }, 404);
  }
  if (request.method !== "POST") return json({ error: "请求方法不受支持" }, 405);

  if (key === "login") {
    if (await rateLimited(request, env, "login", 5, 15 * 60 * 1000)) {
      const response = json({ error: "登录尝试过于频繁，请15分钟后再试。" }, 429);
      response.headers.set("Retry-After", "900");
      return response;
    }
    requireAuthConfiguration(env);
    const body = z.object({ password: z.string().max(256) }).parse(await readJson(request, 2048));
    if (!await verifyAccessKey(body.password, env.ADMIN_KEY_HASH)) return json({ error: "管理员访问密钥无效。" }, 401);
    return json(await issueSession(env));
  }
  if (key === "logout") { await revokeSession(request, env); return json({ ok: true }); }

  // Authorize before parsing request bodies, including all multipart chunk calls.
  const admin = (key === "admin" || key.startsWith("admin/")) ? await requireAdmin(request, env) : null;
  if (key.startsWith("admin/media/")) requireMediaStorage(env);
  if (key === "admin/media/chunk") return json(await uploadChunk(env, request, admin!.tokenHash));
  const body = await readJson(request);
  if (key === "admin/media/preview") {
    const { id } = z.object({ id: z.string().regex(/^[a-zA-Z0-9_.-]{1,100}$/) }).parse(body);
    const exists = await env.DB.prepare("SELECT id FROM media_assets WHERE id=?").bind(id).first();
    if (!exists) throw new ApiError("素材不存在", 404);
    return json(await createPreviewUrl(env, id));
  }
  if (key.startsWith("admin/media/")) {
    const result = await mediaAction(env, key, body, admin!.tokenHash);
    if (result) return json(result);
  }
  if (key === "apply") {
    const settings = await getSettings(env);
    if (!settings.registrationOpen || (settings.deadline && Date.now() > Date.parse(settings.deadline + "T23:59:59+08:00"))) {
      return json({ error: "报名暂未开放或已截止，请关注后续通知" }, 403);
    }
    if (await rateLimited(request, env, "apply", 10, 10 * 60 * 1000)) return json({ error: "提交过于频繁，请10分钟后再试" }, 429);
    const a = applicationSchema.parse(body);
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(
        "INSERT INTO applications (id,name,college,grade,contact,directions,experience,availability,portfolio,status,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(id, a.name, a.college, a.grade, a.contact.toLowerCase(), JSON.stringify(a.directions), a.experience,
        a.availability, a.portfolio, "待查看", "", new Date().toISOString()).run();
    } catch (error) {
      if (String(error).includes("UNIQUE")) return json({ error: "该联系方式已提交报名，请勿重复提交" }, 409);
      throw error;
    }
    return json({ id, message: "报名已收到，请留意后续联系。" }, 201);
  }
  if (key === "admin/settings") {
    const s = settingsSchema.parse(normalizeContent(body, url.origin));
    await env.DB.prepare("INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value")
      .bind("site", JSON.stringify(s)).run();
    return json({ ok: true });
  }
  if (key === "admin/article") {
    const a = articleSchema.parse(normalizeContent(body, url.origin));
    await env.DB.prepare(
      "INSERT INTO articles (id,title,category,summary,body,cover,media,status,date,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,summary=excluded.summary,body=excluded.body,cover=excluded.cover,media=excluded.media,status=excluded.status,date=excluded.date,updated_at=excluded.updated_at",
    ).bind(a.id, a.title, a.category, a.summary, a.body, a.cover, JSON.stringify(a.media), a.status, a.date, new Date().toISOString()).run();
    return json({ ok: true });
  }
  if (key === "admin/application") {
    const a = z.object({ id: z.string().uuid(), status: z.enum(["待查看", "已联系", "待交流", "已录取", "暂不合适"]), note: z.string().max(2000) }).parse(body);
    const result = await env.DB.prepare("UPDATE applications SET status=?,note=? WHERE id=?").bind(a.status, a.note, a.id).run();
    return result.meta.changes ? json({ ok: true }) : json({ error: "记录不存在" }, 404);
  }
  return json({ error: "操作不存在" }, 404);
}
