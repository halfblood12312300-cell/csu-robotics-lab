import { fieldOptions, mergeSettings, normalizeSettings, type Settings } from "../app/site-config.ts";
import { settingsPatchSchema, settingsSchema } from "../app/settings-schema.ts";
import { ApiError, type Env } from "./types.ts";
import { canonicalMediaUrl } from "./urls.ts";
export { settingsSchema, settingsPatchSchema, validDate } from "../app/settings-schema.ts";

export async function getSettings(env: Env): Promise<Settings> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE id=?").bind("site").first<{ value: string }>();
  return normalizeSettings(row ? JSON.parse(row.value) : undefined);
}

function normalizeSettingsMedia(body: unknown, origin: string): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const value = structuredClone(body) as any;
  for (const key of ["heroImage", "heroVideo"]) if (key in value) value[key] = canonicalMediaUrl(value[key], origin);
  if (value.site && typeof value.site === "object" && "logo" in value.site) value.site.logo = canonicalMediaUrl(value.site.logo, origin);
  if (Array.isArray(value.home?.platforms?.items)) for (const item of value.home.platforms.items) {
    if (item && typeof item === "object" && "image" in item) item.image = canonicalMediaUrl(item.image, origin);
  }
  if (Array.isArray(value.home?.gallery?.items)) for (const item of value.home.gallery.items) {
    if (item && typeof item === "object" && "url" in item) item.url = canonicalMediaUrl(item.url, origin);
  }
  return value;
}

function formSignature(settings: Settings): string {
  const { version: _version, ...registration } = settings.registration;
  return JSON.stringify([registration, settings.registration.fields.map((field) => [field.id, fieldOptions(field, settings)])]);
}

export async function saveSettings(env: Env, body: unknown, origin: string): Promise<Settings> {
  const patch = settingsPatchSchema.parse(normalizeSettingsMedia(body, origin));
  const row = await env.DB.prepare("SELECT value FROM settings WHERE id=?").bind("site").first<{ value: string }>();
  const current = normalizeSettings(row ? JSON.parse(row.value) : undefined);
  const legacy = ["registrationOpen", "deadline", "contact", "heroImage", "heroVideo", "intro", "location"];
  if ((patch.revision !== undefined && patch.revision !== current.revision) ||
    (patch.revision === undefined && Object.keys(patch).some((key) => !legacy.includes(key)))) {
    throw new ApiError("设置已经更新，请刷新页面后重新编辑保存。", 409);
  }
  const next = settingsSchema.parse(mergeSettings(current, patch)) as Settings;
  next.revision = current.revision + 1;
  next.registration.version = current.registration.version + (formSignature(next) === formSignature(current) ? 0 : 1);
  const result = await env.DB.prepare(
    "INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value WHERE settings.value=?",
  ).bind("site", JSON.stringify(next), row?.value ?? "").run();
  if (!result.meta.changes) throw new ApiError("其他页面刚更新了设置，请刷新后重新保存。", 409);
  return next;
}

export function settingsReferenceMedia(settings: Settings, url: string): boolean {
  if (settings.site.logo === url) return true;
  const enabled = new Set(settings.home.modules.filter((module) => module.enabled).map((module) => module.id));
  if (enabled.has("hero") && (settings.heroImage === url || settings.heroVideo === url)) return true;
  if (enabled.has("platforms") && settings.home.platforms.items.some((item) => item.enabled && item.image === url)) return true;
  return enabled.has("gallery") && settings.home.gallery.source === "manual" && settings.home.gallery.items.some((item) => item.enabled && item.url === url);
}
