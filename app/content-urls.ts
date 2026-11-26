import { z } from "zod";
import { normalizeRepositoryMediaPath } from "./repository-media-path.ts";

export function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export const mediaUrlSchema = z.string().max(2000).refine((value) => {
  return !value || !!normalizeRepositoryMediaPath(value) || /^\/api\/media\/[a-zA-Z0-9_.-]+$/.test(value) || isPublicHttpUrl(value);
}, "请填写有效的图片或视频地址");

export const linkUrlSchema = z.string().max(2000).refine((value) => {
  if (!value) return true;
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value) || /^#[^#]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}, "链接须为站内路径、http(s)、mailto 或 tel 地址");

/** Store stable media paths, never expiring preview signatures. */
export function canonicalMediaUrl(value: unknown, origin: string): unknown {
  if (typeof value !== "string") return value;
  const repositoryPath = normalizeRepositoryMediaPath(value);
  if (repositoryPath) return repositoryPath;
  if (value.startsWith("/media/")) return value;
  try {
    const url = new URL(value, origin);
    if (url.origin === origin && /^\/api\/media\/[a-zA-Z0-9_.-]+$/.test(url.pathname)) return url.pathname;
  } catch { /* Schema validation reports invalid input. */ }
  return value;
}
