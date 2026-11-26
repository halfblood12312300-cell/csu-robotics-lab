import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import type { Asset } from "../app/content";
import { normalizeRepositoryMediaPath } from "../app/repository-media-path.ts";

const formats: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  ".mp4": "video/mp4", ".webm": "video/webm",
};

/** Only metadata enters the bundle; Vite copies the actual files from public/. */
export function collectRepositoryMedia(directory: string): Asset[] {
  const assets: Asset[] = [];
  if (!existsSync(directory)) return assets;
  function visit(segments: string[]) {
    const current = join(directory, ...segments);
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const parts = [...segments, entry.name];
      if (entry.isDirectory()) { visit(parts); continue; }
      if (!entry.isFile()) continue; // Never follow symbolic links outside public/media.
      const mime = formats[extname(entry.name).toLowerCase()];
      if (!mime) continue;
      const filename = join(directory, ...parts);
      const handle = openSync(filename, "r");
      const header = Buffer.alloc(200);
      try {
        const length = readSync(handle, header, 0, header.length, 0);
        if (header.subarray(0, length).toString("utf8").startsWith("version https://git-lfs.github.com/spec/v1")) {
          throw new Error(`GitHub Pages 素材必须是实际文件，不能使用 Git LFS 指针：public/media/${parts.join("/")}`);
        }
      } finally { closeSync(handle); }
      const url = normalizeRepositoryMediaPath("/media/" + parts.map(encodeURIComponent).join("/"));
      if (!url || url.length > 2000) {
        throw new Error(`素材文件名不能用于网站，请重命名：public/media/${parts.join("/")}`);
      }
      assets.push({
        id: "repository:" + parts.join("/"),
        name: parts.join("/"), mime, size: statSync(filename).size,
        caption: "", archived: false, created_at: "", url,
        type: mime.startsWith("video/") ? "video" : "image", source: "repository",
      });
    }
  }
  visit([]);
  return assets.sort((a, b) => a.url < b.url ? -1 : a.url > b.url ? 1 : 0);
}
