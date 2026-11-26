import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../index.ts";
import { defaultSettings } from "../../app/content.ts";
import { normalizeRepositoryMediaPath } from "../../app/repository-media-path.ts";
import { fixture, req } from "./helpers.ts";

test("repository media mode supports admin login, content, settings and applications without R2 or a media signing secret", async () => {
  const f = await fixture();
  const { BUCKET: _bucket, MEDIA_SIGNING_SECRET: _mediaSecret, ...env } = f.env;
  try {
    // A previous upload index must not block login or be silently deleted in repository mode.
    f.database.sqlite.prepare("INSERT INTO media_assets (id,name,mime,size,caption,archived,created_at) VALUES (?,?,?,?,?,?,?)")
      .run("legacy.png", "旧素材", "image/png", 12, "", 0, new Date().toISOString());
    const login = await worker.fetch(req("login", { body: { password: f.accessKey } }), env);
    assert.equal(login.status, 200);
    const session: any = await login.json();
    const admin: any = await (await worker.fetch(req("admin", { token: session.token }), env)).json();
    assert.deepEqual(admin.capabilities, { mediaUpload: false });
    assert.deepEqual(admin.assets, []);

    const image = "/media/实验室/合影 01.jpg";
    const video = "/media/videos/演示 (01).mp4";
    const imagePath = normalizeRepositoryMediaPath(image)!;
    const videoPath = normalizeRepositoryMediaPath(video)!;
    const saved = await worker.fetch(req("admin/settings", { token: session.token, body: {
      ...defaultSettings, registrationOpen: true, heroImage: image, heroVideo: video,
    } }), env);
    assert.equal(saved.status, 200);
    const article = {
      id: "repository-showcase", title: "仓库素材展示", category: "实验记录", summary: "静态图片与视频",
      body: `![实验照片](${image})`, cover: image,
      media: [{ type: "video", url: videoPath, caption: "机器人演示" }], status: "published", date: "",
    };
    assert.equal((await worker.fetch(req("admin/article", { token: session.token, body: article }), env)).status, 200);
    const data: any = await (await worker.fetch(req("data"), env)).json();
    assert.equal(data.settings.heroImage, imagePath);
    assert.equal(data.settings.heroVideo, videoPath);
    const published = data.articles.find((value: any) => value.id === article.id);
    assert.equal(published.cover, imagePath);
    assert.equal(published.body, `![实验照片](${imagePath})`);
    assert.equal(published.media[0].url, videoPath);

    const application = {
      name: "测试同学", college: "数学与统计学院", grade: "本科二年级", contact: "repository-test@example.com",
      directions: ["system"], experience: "用于验证没有R2仍然可以报名的测试内容。", availability: "每周3–6小时",
      portfolio: "", consent: true, website: "",
    };
    assert.equal((await worker.fetch(req("apply", { body: application }), env)).status, 201);
    const after: any = await (await worker.fetch(req("admin", { token: session.token }), env)).json();
    assert.equal(after.applications.length, 1);
    assert.equal(after.applications[0].contact, application.contact);
    assert.deepEqual(after.assets, []);
    assert.equal((f.database.sqlite.prepare("SELECT COUNT(*) AS n FROM media_assets").get() as any).n, 1);
    assert.equal(f.bucket.writes, 0);
  } finally { f.database.close(); }
});

test("disabled R2 endpoints authenticate before rejecting media operations, without consuming upload bodies or exposing old media", async () => {
  const f = await fixture();
  const { BUCKET: _bucket, MEDIA_SIGNING_SECRET: _mediaSecret, ...env } = f.env;
  try {
    const login: any = await (await worker.fetch(req("login", { body: { password: f.accessKey } }), env)).json();
    for (const path of ["start", "chunk?id=old.png&part=1", "complete", "cancel", "update", "preview", "unknown"]) {
      const endpoint = "admin/media/" + path;
      const anonymous = req(endpoint, { raw: new Uint8Array([1, 2]) });
      assert.equal((await worker.fetch(anonymous, env)).status, 401, path);
      assert.equal(anonymous.bodyUsed, false);
      const authenticated = req(endpoint, { token: login.token, raw: new Uint8Array([1, 2]) });
      const response = await worker.fetch(authenticated, env);
      assert.equal(response.status, 503, path);
      assert.match((await response.json() as any).error, /GitHub/);
      assert.equal(authenticated.bodyUsed, false);
      assert.equal((await worker.fetch(req(endpoint, { token: login.token }), env)).status, 503, path);
    }
    for (const method of ["GET", "HEAD"]) {
      assert.equal((await worker.fetch(req("media/old.png", { method }), env)).status, 404);
      assert.equal((await worker.fetch(req("media/old.png", { method, token: login.token }), env)).status, 404);
    }
    assert.equal(f.bucket.writes, 0);
    for (const table of ["media_assets", "media_uploads"]) {
      assert.equal((f.database.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as any).n, 0);
    }
  } finally { f.database.close(); }
});

test("repository media URLs reject traversal and malformed encodings while an enabled R2 backend still requires preview signing", async () => {
  const f = await fixture();
  const { BUCKET: _bucket, MEDIA_SIGNING_SECRET: _mediaSecret, ...env } = f.env;
  try {
    const login: any = await (await worker.fetch(req("login", { body: { password: f.accessKey } }), env)).json();
    for (const invalid of ["/media/../hidden.png", "/media/%2e%2e/hidden.png", "/media/a%2Fb.png", "/media/a%5Cb.png", "/media/bad%.png", "/media/%252e%252e/hidden.png"]) {
      const saved = await worker.fetch(req("admin/settings", { token: login.token, body: { ...defaultSettings, heroImage: invalid } }), env);
      assert.equal(saved.status, 400, invalid);
    }
    const missingSigning = await worker.fetch(req("login", { body: { password: f.accessKey } }), { ...f.env, MEDIA_SIGNING_SECRET: undefined });
    assert.equal(missingSigning.status, 503);
    assert.match((await missingSigning.json() as any).error, /私有素材预览/);
  } finally { f.database.close(); }
});

test("checked-in production and local configurations do not provision R2 by default", () => {
  for (const filename of ["../../wrangler.jsonc", "../wrangler.example.jsonc", "../wrangler.local.jsonc"]) {
    const config = JSON.parse(readFileSync(new URL(filename, import.meta.url), "utf8"));
    assert.equal(config.r2_buckets?.length || 0, 0, filename);
    assert.ok(config.d1_databases.some((binding: any) => binding.binding === "DB"));
  }
});
