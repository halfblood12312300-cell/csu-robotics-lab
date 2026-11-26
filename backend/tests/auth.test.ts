import test from "node:test";
import assert from "node:assert/strict";
import { authenticate, base64url, createPreviewUrl, issueSession, PREVIEW_TTL_MS, revokeSession, SESSION_TTL_MS, sha256, verifyAccessKey, verifyPreviewUrl } from "../auth.ts";
import worker from "../index.ts";
import { fixture, apiOrigin, origin, req } from "./helpers.ts";

test("generated access keys validate; chosen passwords and altered keys cannot authenticate", async () => {
  const f = await fixture();
  try {
    assert.equal(await verifyAccessKey(f.accessKey, f.env.ADMIN_KEY_HASH), true);
    assert.equal(await verifyAccessKey("a-human-chosen-password", f.env.ADMIN_KEY_HASH), false);
    const other = "csu_admin_" + base64url(crypto.getRandomValues(new Uint8Array(32)));
    assert.equal(await verifyAccessKey(other, f.env.ADMIN_KEY_HASH), false);
    await assert.rejects(() => verifyAccessKey(f.accessKey, undefined), { status: 503 });
  } finally { f.database.close(); }
});

test("sessions store digests, expire after 8 hours, rotate with the admin key and revoke on logout", async () => {
  const f = await fixture();
  try {
    const now = Date.now(), session = await issueSession(f.env, now);
    assert.equal(session.expiresAt, now + SESSION_TTL_MS);
    const row: any = f.database.sqlite.prepare("SELECT * FROM admin_sessions").get();
    assert.equal(row.token_hash, await sha256(session.token));
    assert.notEqual(row.token_hash, session.token);
    const request = req("admin", { token: session.token });
    assert.ok(await authenticate(request, f.env, now));
    assert.equal(await authenticate(request, f.env, session.expiresAt), null);
    assert.equal(await authenticate(req("admin", { token: base64url(crypto.getRandomValues(new Uint8Array(32))) }), f.env), null);
    assert.equal(await authenticate(req("admin", { headers: { "oai-authenticated-user-id": "admin", "oai-authenticated-user-email": "admin@example.com", Cookie: "token=" + session.token } }), f.env), null);
    assert.equal(await authenticate(request, { ...f.env, ADMIN_KEY_HASH: await sha256("rotated-random-key") }), null);
    await revokeSession(request, f.env);
    assert.equal(await authenticate(request, f.env), null);
  } finally { f.database.close(); }
});

test("preview signatures are scoped to one media ID, expire, reject tampering and contain no session token", async () => {
  const f = await fixture();
  try {
    const now = Date.now(), signed = await createPreviewUrl(f.env, "one.jpg", now);
    const url = new URL(signed.preview_url, apiOrigin);
    assert.equal(await verifyPreviewUrl(f.env, url, "one.jpg", now), true);
    assert.equal(await verifyPreviewUrl(f.env, url, "other.jpg", now), false);
    assert.equal(await verifyPreviewUrl(f.env, url, "one.jpg", now + PREVIEW_TTL_MS), false);
    url.searchParams.set("preview_expires", String(now + PREVIEW_TTL_MS - 1));
    assert.equal(await verifyPreviewUrl(f.env, url, "one.jpg", now), false);
    assert.deepEqual([...url.searchParams.keys()].sort(), ["preview_expires", "preview_signature"]);
  } finally { f.database.close(); }
});

test("CORS permits only the configured frontend and mutations require its Origin", async () => {
  const f = await fixture();
  try {
    for (const rejectedOrigin of ["https://evil.example", "null", origin + ".evil.example"]) {
      const response = await worker.fetch(req("data", { origin: rejectedOrigin }), f.env);
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
    }
    const missing = await worker.fetch(req("login", { body: { password: f.accessKey }, origin: null }), f.env);
    assert.equal(missing.status, 403);
    const preflight = await worker.fetch(req("admin/media/chunk", { method: "OPTIONS", headers: {
      "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type",
    } }), f.env);
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);
    assert.equal(preflight.headers.get("Access-Control-Allow-Credentials"), null);
    const invalidHeader = await worker.fetch(req("admin", { method: "OPTIONS", headers: {
      "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-pretend-admin",
    } }), f.env);
    assert.equal(invalidHeader.status, 403);
  } finally { f.database.close(); }
});

test("login/session/logout contract works and brute-force attempts are rate limited", async () => {
  const f = await fixture();
  try {
    const login = await worker.fetch(req("login", { body: { password: f.accessKey } }), f.env);
    assert.equal(login.status, 200);
    const session: any = await login.json();
    assert.match(session.token, /^[A-Za-z0-9_-]{43}$/);
    const read = await worker.fetch(req("session", { token: session.token }), f.env);
    assert.deepEqual(await read.json(), { authenticated: true, isAdmin: true, expiresAt: session.expiresAt });
    assert.equal((await worker.fetch(req("logout", { token: session.token, body: {} }), f.env)).status, 200);
    assert.deepEqual(await (await worker.fetch(req("session", { token: session.token }), f.env)).json(), { authenticated: false, isAdmin: false });
    for (let i = 0; i < 4; i++) assert.equal((await worker.fetch(req("login", { body: { password: "wrong" } }), f.env)).status, 401);
    assert.equal((await worker.fetch(req("login", { body: { password: f.accessKey } }), f.env)).status, 429);
  } finally { f.database.close(); }
});

test("every privileged endpoint, including raw upload chunks, rejects anonymous and forged identity headers", async () => {
  const f = await fixture();
  try {
    const headers = { "oai-authenticated-user-id": "admin", "oai-authenticated-user-email": "admin@example.com" };
    assert.equal((await worker.fetch(req("admin", { headers }), f.env)).status, 401);
    for (const path of ["admin/settings", "admin/article", "admin/application", "admin/media/start", "admin/media/complete", "admin/media/cancel", "admin/media/update", "admin/media/preview", "admin/unknown"]) {
      const response = await worker.fetch(req(path, { headers, body: {} }), f.env);
      assert.equal(response.status, 401, path);
    }
    assert.equal((await worker.fetch(req("admin/media/chunk?id=x&part=1", { headers, raw: new Uint8Array([1, 2]) }), f.env)).status, 401);
    assert.equal(f.bucket.writes, 0);
    for (const table of ["articles", "applications", "settings", "media_uploads", "media_assets"]) {
      assert.equal((f.database.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as any).n, 0);
    }
  } finally { f.database.close(); }
});
