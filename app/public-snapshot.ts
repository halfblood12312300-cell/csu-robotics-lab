import { z } from "zod";
import { settingsSchema } from "./settings-schema.ts";
import { mediaUrlSchema } from "./content-urls.ts";
import type { Article, Settings } from "./content.ts";

const article = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/),
  title: z.string().max(100), category: z.string().max(40),
  summary: z.string().max(250), body: z.string().max(50000),
  cover: mediaUrlSchema, date: z.string().max(20), status: z.literal("published"),
  media: z.array(z.object({ type: z.enum(["image", "video"]), url: mediaUrlSchema, caption: z.string().max(150) })).max(20),
});
const publicResponse = z.object({ settings: settingsSchema, articles: z.array(article) });
const snapshotSchema = publicResponse.extend({
  format: z.literal(1), capturedAt: z.number().int().positive(),
});
export type PublicSnapshot = { format: 1; capturedAt: number; settings: Settings; articles: Article[] };
export function createPublicSnapshot(value: unknown, capturedAt: number): PublicSnapshot {
  // Allowlist all published content fields; reject responses containing unpublished articles.
  return snapshotSchema.parse({ ...publicResponse.parse(value), format: 1, capturedAt }) as PublicSnapshot;
}
export function readPublicSnapshot(value: unknown): PublicSnapshot {
  return snapshotSchema.parse(value) as PublicSnapshot;
}
export function canUseSnapshot(candidate: PublicSnapshot, current: PublicSnapshot | null): boolean {
  return !current || (candidate.capturedAt > current.capturedAt && candidate.settings.revision >= current.settings.revision);
}
