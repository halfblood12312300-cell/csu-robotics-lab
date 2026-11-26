import { z } from "zod";
import type { Env } from "./types.ts";
import { createPreviewUrl } from "./auth.ts";
export const CHUNK_SIZE = 8 * 1024 * 1024;
const formats: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};
type Runtime = Env;
type Upload = {
  id: string;
  upload_id: string;
  owner: string;
  name: string;
  mime: string;
  size: number;
  parts: string;
  expires: number;
};
export class MediaError extends Error {
  status: number;
  constructor(
    message: string,
    status = 400,
  ) {
    super(message);
    this.status = status;
  }
}
export async function assetView(runtime: Runtime, row: any) {
  return {
    ...row,
    url: "/api/media/" + row.id,
    ...(await createPreviewUrl(runtime, row.id)),
    type: row.mime.startsWith("video/") ? "video" : "image",
    archived: !!row.archived,
  };
}
export async function listAssets(runtime: Runtime) {
  return Promise.all((
    await runtime.DB.prepare(
      "SELECT * FROM media_assets ORDER BY created_at DESC",
    ).all()
  ).results.map((row) => assetView(runtime, row)));
}
function validMagic(type: string, bytes: Uint8Array) {
  const ascii = new TextDecoder().decode(bytes.slice(0, 16));
  return type === "image/jpeg"
    ? bytes[0] === 255 && bytes[1] === 216
    : type === "image/png"
      ? bytes[0] === 137 && ascii.slice(1, 4) === "PNG"
      : type === "image/webp"
        ? ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP"
        : type === "image/gif"
          ? ascii.startsWith("GIF8")
          : type === "video/mp4"
            ? ascii.slice(4, 8) === "ftyp"
            : bytes[0] === 26 &&
              bytes[1] === 69 &&
              bytes[2] === 223 &&
              bytes[3] === 163;
}
async function boundedBytes(request: Request, limit: number) {
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new MediaError("文件分段过大", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new MediaError("文件为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new MediaError("文件分段过大", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.length;
  }
  return all;
}
async function ownedUpload(runtime: Runtime, id: string, owner: string) {
  const row = await runtime.DB.prepare(
    "SELECT * FROM media_uploads WHERE id=? AND owner=?",
  )
    .bind(id, owner)
    .first<Upload>();
  if (!row) throw new MediaError("上传记录不存在，请重新上传", 404);
  if (row.expires < Date.now())
    throw new MediaError("上传已过期，请重新选择文件", 410);
  return row;
}
export async function uploadChunk(runtime: Runtime, request: Request, owner: string) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const part = Number(url.searchParams.get("part"));
  const row = await ownedUpload(
    runtime,
    id,
    owner,
  );
  const parts: R2UploadedPart[] = JSON.parse(row.parts);
  if (
    !Number.isInteger(part) ||
    part < 1 ||
    part > Math.ceil(row.size / CHUNK_SIZE)
  )
    throw new MediaError("分段编号无效");
  if (parts[part - 1]) return { ok: true };
  if (part !== parts.length + 1) throw new MediaError("请按顺序上传文件");
  const expected = Math.min(CHUNK_SIZE, row.size - (part - 1) * CHUNK_SIZE);
  const bytes = await boundedBytes(request, CHUNK_SIZE);
  if (bytes.length !== expected) throw new MediaError("分段不完整，请重试");
  if (part === 1 && !validMagic(row.mime, bytes))
    throw new MediaError("文件内容与格式不符");
  const uploaded = await runtime.BUCKET.resumeMultipartUpload(
    id,
    row.upload_id,
  ).uploadPart(part, bytes);
  parts.push(uploaded);
  await runtime.DB.prepare("UPDATE media_uploads SET parts=? WHERE id=?")
    .bind(JSON.stringify(parts), id)
    .run();
  return { ok: true };
}
export async function mediaAction(
  runtime: Runtime,
  key: string,
  body: unknown,
  owner: string,
) {
  if (key === "admin/media/start") {
    const b = z
      .object({
        name: z.string().min(1).max(250),
        mime: z.enum([
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "video/mp4",
          "video/webm",
        ]),
        size: z
          .number()
          .int()
          .min(1)
          .max(500 * 1024 * 1024),
      })
      .parse(body);
    if (b.mime.startsWith("image/") && b.size > 20 * 1024 * 1024)
      throw new MediaError("图片最大20MB");
    const id = crypto.randomUUID() + "." + formats[b.mime];
    const upload = await runtime.BUCKET.createMultipartUpload(id, {
      httpMetadata: { contentType: b.mime },
    });
    await runtime.DB.prepare(
      "INSERT INTO media_uploads (id,upload_id,owner,name,mime,size,parts,expires) VALUES (?,?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        upload.uploadId,
        owner,
        b.name,
        b.mime,
        b.size,
        "[]",
        Date.now() + 24 * 60 * 60 * 1000,
      )
      .run();
    return { id, chunkSize: CHUNK_SIZE };
  }
  if (key === "admin/media/complete") {
    const { id } = z.object({ id: z.string().max(100) }).parse(body);
    const existing = await runtime.DB.prepare(
      "SELECT * FROM media_assets WHERE id=?",
    )
      .bind(id)
      .first();
    if (existing) return assetView(runtime, existing);
    const row = await ownedUpload(runtime, id, owner);
    const parts: R2UploadedPart[] = JSON.parse(row.parts);
    if (parts.length !== Math.ceil(row.size / CHUNK_SIZE))
      throw new MediaError("文件尚未上传完成");
    const file =
      (await runtime.BUCKET.head(id)) ??
      (await runtime.BUCKET.resumeMultipartUpload(id, row.upload_id).complete(
        parts,
      ));
    if (file.size !== row.size) throw new MediaError("文件大小校验失败");
    const date = new Date().toISOString();
    await runtime.DB.batch([
      runtime.DB.prepare(
        "INSERT INTO media_assets (id,name,mime,size,caption,archived,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(id, row.name, row.mime, row.size, "", 0, date),
      runtime.DB.prepare("DELETE FROM media_uploads WHERE id=?").bind(id),
    ]);
    return assetView(runtime, {
      id,
      name: row.name,
      mime: row.mime,
      size: row.size,
      caption: "",
      archived: 0,
      created_at: date,
    });
  }
  if (key === "admin/media/cancel") {
    const { id } = z.object({ id: z.string().max(100) }).parse(body);
    const row = await ownedUpload(runtime, id, owner);
    await runtime.BUCKET.resumeMultipartUpload(id, row.upload_id).abort();
    await runtime.DB.prepare("DELETE FROM media_uploads WHERE id=?")
      .bind(id)
      .run();
    return { ok: true };
  }
  if (key === "admin/media/update") {
    const b = z
      .object({
        id: z.string().max(100),
        name: z.string().trim().min(1).max(250),
        caption: z.string().max(150),
        archived: z.boolean(),
      })
      .parse(body);
    const result = await runtime.DB.prepare(
      "UPDATE media_assets SET name=?,caption=?,archived=? WHERE id=?",
    )
      .bind(b.name, b.caption, b.archived ? 1 : 0, b.id)
      .run();
    if (!result.meta.changes) throw new MediaError("素材不存在", 404);
    return { ok: true };
  }
  return null;
}
