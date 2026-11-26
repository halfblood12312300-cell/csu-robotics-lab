import test from "node:test";
import assert from "node:assert/strict";
import worker from "../index.ts";
import { createPreviewUrl, issueSession } from "../auth.ts";
import { defaultSettings } from "../../app/content.ts";
import { fixture, apiOrigin, req } from "./helpers.ts";

test("content retains registration and moderation behavior while public data excludes drafts", async () => {
  const f = await fixture();
  try {
    const admin = await issueSession(f.env);
    const saved = await worker.fetch(req("admin/settings", { token: admin.token, body: { ...defaultSettings, registrationOpen: true } }), f.env);
    assert.equal(saved.status, 200);
    const application = { name: "测试同学", college: "数学与统计学院", grade: "本科二年级", contact: "TEST@example.com", directions: ["agent"], experience: "用于验证报名接口的完整测试内容。", availability: "每周3–6小时", portfolio: "", consent: true, website: "" };
    const submitted = await worker.fetch(req("apply", { body: application }), f.env);
    assert.equal(submitted.status, 201);
    const submission: any = await submitted.json();
    assert.equal((await worker.fetch(req("apply", { body: application }), f.env)).status, 409);
    assert.equal((await worker.fetch(req("admin/application", { token: admin.token, body: { id: submission.id, status: "已联系", note: "内部备注" } }), f.env)).status, 200);
    const draft = { id: "private-draft", title: "未发布实验记录", category: "实验记录", summary: "仅管理员查看", body: "尚未发布", cover: "", media: [], status: "draft", date: "" };
    assert.equal((await worker.fetch(req("admin/article", { token: admin.token, body: draft }), f.env)).status, 200);
    const publicData: any = await (await worker.fetch(req("data"), f.env)).json();
    assert.ok(!publicData.articles.some((a: any) => a.id === draft.id));
    assert.equal("applications" in publicData, false);
    const adminData: any = await (await worker.fetch(req("admin", { token: admin.token }), f.env)).json();
    assert.ok(adminData.articles.some((a: any) => a.id === draft.id));
    assert.equal(adminData.applications[0].contact, "test@example.com");
    assert.equal(adminData.applications[0].note, "内部备注");
  } finally { f.database.close(); }
});

test("multipart upload ownership, private previews, publication and withdrawal stay enforced", async () => {
  const f = await fixture();
  try {
    const owner = await issueSession(f.env), another = await issueSession(f.env);
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
    const started = await worker.fetch(req("admin/media/start", { token: owner.token, body: { name: "实验图片.png", mime: "image/png", size: png.length } }), f.env);
    assert.equal(started.status, 200);
    const start: any = await started.json();
    const chunkPath = "admin/media/chunk?id=" + start.id + "&part=1";
    assert.equal((await worker.fetch(req(chunkPath, { token: another.token, raw: png }), f.env)).status, 404);
    assert.equal((await worker.fetch(req("admin/media/complete", { token: another.token, body: { id: start.id } }), f.env)).status, 404);
    assert.equal((await worker.fetch(req(chunkPath, { token: owner.token, raw: png }), f.env)).status, 200);
    const completed = await worker.fetch(req("admin/media/complete", { token: owner.token, body: { id: start.id } }), f.env);
    assert.equal(completed.status, 200);
    const asset: any = await completed.json();
    assert.equal(asset.url, "/api/media/" + start.id);
    assert.ok(asset.preview_url.startsWith(asset.url + "?preview_expires="));
    assert.equal(asset.preview_url.includes(owner.token), false);
    assert.equal((await worker.fetch(req("media/" + start.id), f.env)).status, 404);
    const preview = await worker.fetch(new Request(apiOrigin + asset.preview_url), f.env);
    assert.equal(preview.status, 200);
    assert.equal((await preview.arrayBuffer()).byteLength, png.length);
    const article = { id: "showcase", title: "图片展示", category: "实验记录", summary: "测试", body: `![实验图片](${apiOrigin + asset.preview_url})`, cover: apiOrigin + asset.preview_url, media: [{ type: "image", url: asset.preview_url, caption: "实验图片" }], status: "published", date: "" };
    assert.equal((await worker.fetch(req("admin/article", { token: owner.token, body: article }), f.env)).status, 200);
    const stored: any = f.database.sqlite.prepare("SELECT cover,body,media FROM articles WHERE id='showcase'").get();
    assert.equal(stored.cover, asset.url);
    assert.equal(JSON.parse(stored.media)[0].url, asset.url);
    assert.equal(stored.body, `![实验图片](${asset.url})`);
    assert.equal((await worker.fetch(req("media/" + start.id), f.env)).status, 200);
    const range = await worker.fetch(req("media/" + start.id, { headers: { Range: "bytes=0-3" } }), f.env);
    assert.equal(range.status, 206);
    assert.equal(range.headers.get("content-range"), "bytes 0-3/12");
    assert.equal((await worker.fetch(req("admin/media/update", { token: owner.token, body: { id: start.id, name: "实验图片.png", caption: "归档", archived: true } }), f.env)).status, 200);
    assert.equal((await worker.fetch(req("media/" + start.id), f.env)).status, 200, "archiving preserves published references");
    assert.equal((await worker.fetch(req("admin/article", { token: owner.token, body: { ...article, status: "draft" } }), f.env)).status, 200);
    assert.equal((await worker.fetch(req("media/" + start.id), f.env)).status, 404, "withdrawn media is private again");
    const refresh: any = await (await worker.fetch(req("admin/media/preview", { token: owner.token, body: { id: start.id } }), f.env)).json();
    assert.ok(refresh.preview_url);
    const expired = await createPreviewUrl(f.env, start.id, Date.now() - 11 * 60 * 1000);
    assert.equal((await worker.fetch(new Request(apiOrigin + expired.preview_url), f.env)).status, 404);
  } finally { f.database.close(); }
});

test("invalid upload magic and oversized JSON are rejected without creating public media", async () => {
  const f = await fixture();
  try {
    const session = await issueSession(f.env);
    const start: any = await (await worker.fetch(req("admin/media/start", { token: session.token, body: { name: "wrong.png", mime: "image/png", size: 4 } }), f.env)).json();
    const badChunk = await worker.fetch(req(`admin/media/chunk?id=${start.id}&part=1`, { token: session.token, raw: new Uint8Array([1, 2, 3, 4]) }), f.env);
    assert.equal(badChunk.status, 400);
    assert.equal((await worker.fetch(req("admin/media/complete", { token: session.token, body: { id: start.id } }), f.env)).status, 400);
    assert.equal((await worker.fetch(req("admin/settings", { token: session.token, body: { intro: "x".repeat(256001) } }), f.env)).status, 413);
    assert.equal((await worker.fetch(req("admin/media/cancel", { token: session.token, body: { id: start.id } }), f.env)).status, 200);
    assert.equal(f.bucket.objects.size, 0);
  } finally { f.database.close(); }
});
