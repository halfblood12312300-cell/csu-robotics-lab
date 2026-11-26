import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { collectRepositoryMedia } from "../../scripts/repository-media.ts";
import { normalizeRepositoryMediaPath } from "../../app/repository-media-path.ts";

test("repository media paths preserve nested Unicode names and reject unsafe paths", () => {
  const value = "/media/实验 记录/robot demo.mp4";
  const canonical = "/media/%E5%AE%9E%E9%AA%8C%20%E8%AE%B0%E5%BD%95/robot%20demo.mp4";
  assert.equal(normalizeRepositoryMediaPath(value), canonical);
  assert.equal(normalizeRepositoryMediaPath(canonical), canonical);
  assert.equal(normalizeRepositoryMediaPath("/media/a2-scene.jpg"), "/media/a2-scene.jpg");
  for (const invalid of [
    "/media/../private.png", "/media/%2e%2e/private.png", "/media/folder/%2Fprivate.png",
    "/media/a%5Cb.png", "/media/a\\b.png", "/media/a%00.png", "/media/a%252fb.png",
    "/media/a.png?token=x", "/media/a.png#fragment", "/media//a.png", "/media/",
    "//example.com/a.png", "https://example.com/a.png", "javascript:alert(1)", "/api/media/a.png",
  ]) assert.equal(normalizeRepositoryMediaPath(invalid), undefined, invalid);
});

test("repository media catalog includes local images and videos without following symlinks", () => {
  const parent = resolve(".worker-check");
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(join(parent, "repository-media-test-"));
  try {
    const media = join(directory, "media");
    mkdirSync(join(media, "实验 图片"), { recursive: true });
    writeFileSync(join(media, "cover.JPG"), new Uint8Array([255, 216, 255, 217]));
    writeFileSync(join(media, "实验 图片", "robot demo.mp4"), new Uint8Array(16));
    writeFileSync(join(media, "README.md"), "Only actual image and video assets enter the catalog.");
    writeFileSync(join(media, ".private.png"), "hidden");
    writeFileSync(join(directory, "outside.png"), "outside");
    symlinkSync(join(directory, "outside.png"), join(media, "linked.png"));
    const assets = collectRepositoryMedia(media);
    assert.equal(assets.length, 2);
    assert.ok(assets.every((asset) => asset.source === "repository" && !asset.archived));
    const video = assets.find((asset) => asset.type === "video")!;
    assert.equal(video.url, "/media/%E5%AE%9E%E9%AA%8C%20%E5%9B%BE%E7%89%87/robot%20demo.mp4");
    assert.equal(video.mime, "video/mp4");
    assert.equal(video.size, 16);
    assert.equal(assets.find((asset) => asset.type === "image")?.mime, "image/jpeg");
    assert.deepEqual(collectRepositoryMedia(media), assets, "catalog output stays deterministic");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
