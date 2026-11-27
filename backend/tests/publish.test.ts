import test from "node:test";
import assert from "node:assert/strict";
import { requestPublication } from "../publish.ts";
import type { Env } from "../types.ts";

test("missing publication secret performs no network request", async () => {
  const noCall = (() => { throw Error("unexpected network"); }) as typeof fetch;
  assert.equal(await requestPublication({} as Env, noCall), "not_configured");
});
test("publication dispatch uses fixed repository and secret, failure does not throw", async () => {
  const env = { GITHUB_PUBLISH_TOKEN: "test-only" } as Env;
  const mock = (async (url, init) => {
    assert.equal(url, "https://api.github.com/repos/halfblood12312300-cell/csu-robotics-lab/actions/workflows/pages.yml/dispatches");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-only");
    assert.deepEqual(JSON.parse(String(init?.body)), { ref: "main" });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  assert.equal(await requestPublication(env, mock), "queued");
  assert.equal(await requestPublication(env, (async () => new Response(null, {status:403})) as typeof fetch), "forbidden");
  assert.equal(await requestPublication(env, (async () => {throw Error("offline");}) as typeof fetch), "failed");
});

test("diagnostics classify status without exposing private upstream body", async () => {
  const env = { GITHUB_PUBLISH_TOKEN: "test-only" } as Env;
  for (const [status, expected] of [[401,"invalid_token"],[404,"not_found"],[422,"invalid_request"],[429,"rate_limited"],[503,"github_http_503"]] as const) {
    assert.equal(await requestPublication(env, (async () => new Response("private detail", {status})) as typeof fetch), expected);
  }
  assert.equal(await requestPublication(env, (async () => {throw new DOMException("private detail","TimeoutError");}) as typeof fetch), "timeout");
});
