import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { base64url, sha256 } from "../auth.ts";
import type { Env } from "../types.ts";

export const origin = "https://halfblood12312300-cell.github.io";
export const apiOrigin = "https://test-worker.example";

export class TestDatabase {
  sqlite = new DatabaseSync(":memory:");
  constructor() {
    for (const name of ["0000_strange_ma_gnuci.sql", "0001_messy_chat.sql", "0002_admin_sessions.sql"]) {
      this.sqlite.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
    }
  }
  prepare(sql: string) {
    const db = this;
    const make = (values: any[]) => ({
      bind(...params: any[]) { return make(params); },
      async first(column?: string) { const row: any = db.sqlite.prepare(sql).get(...values); return column ? row?.[column] ?? null : row ?? null; },
      async all() { return { results: db.sqlite.prepare(sql).all(...values), success: true, meta: {} }; },
      async run() { const result = db.sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
    });
    return make([]);
  }
  async batch(statements: ReturnType<TestDatabase["prepare"]>[]) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
  close() { this.sqlite.close(); }
}

export class TestBucket {
  objects = new Map<string, { bytes: Uint8Array; mime: string }>();
  uploads = new Map<string, { id: string; mime: string; parts: Map<number, Uint8Array> }>();
  writes = 0;
  async createMultipartUpload(id: string, options: any) {
    this.writes++;
    const uploadId = crypto.randomUUID();
    this.uploads.set(uploadId, { id, mime: options.httpMetadata.contentType, parts: new Map() });
    return { uploadId };
  }
  resumeMultipartUpload(id: string, uploadId: string) {
    const upload = this.uploads.get(uploadId);
    if (!upload || upload.id !== id) throw new Error("Missing multipart upload");
    return {
      uploadPart: async (number: number, bytes: Uint8Array) => { this.writes++; upload.parts.set(number, bytes); return { partNumber: number, etag: `part-${number}` }; },
      complete: async (parts: { partNumber: number }[]) => {
        this.writes++;
        const arrays = parts.map((part) => upload.parts.get(part.partNumber)!);
        const bytes = new Uint8Array(arrays.reduce((n, chunk) => n + chunk.byteLength, 0));
        let offset = 0;
        for (const chunk of arrays) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        this.objects.set(id, { bytes, mime: upload.mime });
        this.uploads.delete(uploadId);
        return { size: bytes.byteLength };
      },
      abort: async () => { this.writes++; this.uploads.delete(uploadId); },
    };
  }
  async head(id: string) { const object = this.objects.get(id); return object ? { size: object.bytes.byteLength } : null; }
  async get(id: string, options?: { range?: Headers }) {
    const object = this.objects.get(id);
    if (!object) return null;
    let body = object.bytes;
    let range: { offset: number; length: number } | undefined;
    const match = options?.range?.get("range")?.match(/^bytes=(\d+)-(\d+)$/);
    if (match) {
      const offset = Number(match[1]), end = Math.min(Number(match[2]), body.length - 1);
      body = body.slice(offset, end + 1); range = { offset, length: body.length };
    }
    return { body, range, size: object.bytes.byteLength, httpEtag: '"test-etag"', writeHttpMetadata(headers: Headers) { headers.set("Content-Type", object.mime); } };
  }
}

export async function fixture() {
  const accessKey = "csu_admin_" + base64url(crypto.getRandomValues(new Uint8Array(32)));
  const database = new TestDatabase(), bucket = new TestBucket();
  const env: Env = {
    DB: database as unknown as D1Database, BUCKET: bucket as unknown as R2Bucket,
    FRONTEND_ORIGIN: origin, FRONTEND_BASE_PATH: "/csu-robotics-lab",
    ADMIN_KEY_HASH: await sha256(accessKey), MEDIA_SIGNING_SECRET: base64url(crypto.getRandomValues(new Uint8Array(32))),
  };
  return { env, accessKey, database, bucket };
}

export function req(path: string, options: { method?: string; token?: string; body?: unknown; raw?: Uint8Array; origin?: string | null; headers?: Record<string, string> } = {}) {
  const headers = new Headers(options.headers);
  if (options.origin !== null) headers.set("Origin", options.origin || origin);
  if (options.token) headers.set("Authorization", "Bearer " + options.token);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.raw) headers.set("Content-Type", "application/octet-stream");
  return new Request(apiOrigin + "/api/" + path, {
    method: options.method || (options.body !== undefined || options.raw ? "POST" : "GET"), headers,
    body: options.raw || (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
}
