import { test } from "node:test";
import assert from "node:assert/strict";
import { initialArticles, defaultSettings } from "../../app/content.ts";
import { createPublicSnapshot, readPublicSnapshot, canUseSnapshot } from "../../app/public-snapshot.ts";

test("public snapshot allows only public settings and article fields", () => {
  const value = createPublicSnapshot({
    settings: defaultSettings,
    articles: initialArticles.map(article => ({ ...article, privateNote: "never copy" })),
    applications: [{ name: "private" }],
    token: "never copy",
  }, 1000);
  assert.deepEqual(Object.keys(value).sort(), ["articles", "capturedAt", "format", "settings"]);
  assert.ok(!JSON.stringify(value).includes("never copy"));
  assert.deepEqual(readPublicSnapshot(value), value);
});
test("snapshot rejects drafts and unrecognized settings rather than publishing them", () => {
  assert.throws(() => createPublicSnapshot({ settings: defaultSettings, articles: [{ ...initialArticles[0], status: "draft" }] }, 1000));
  assert.throws(() => createPublicSnapshot({ settings: { ...defaultSettings, token: "private" }, articles: initialArticles }, 1000));
});
test("an older snapshot cannot overwrite newer confirmed data", () => {
  const a = createPublicSnapshot({ settings: defaultSettings, articles: initialArticles }, 1000);
  const b = { ...a, capturedAt: 2000 };
  assert.equal(canUseSnapshot(a, b), false);
  assert.equal(canUseSnapshot(b, a), true);
  assert.equal(canUseSnapshot(b, { ...a, settings: { ...a.settings, revision: a.settings.revision + 1 } }), false);
});
