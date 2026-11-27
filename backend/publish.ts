import type { Env } from "./types.ts";
export type PublishState = "queued" | "not_configured" | "failed" | "invalid_token" | "forbidden" | "not_found" | "invalid_request" | "rate_limited" | "network_error" | "timeout" | `github_http_${number}`;
const dispatchUrl = "https://api.github.com/repos/halfblood12312300-cell/csu-robotics-lab/actions/workflows/pages.yml/dispatches";
/** The database mutation has already succeeded. A dispatch failure must not falsely report a failed save. */
export async function requestPublication(env: Env, send: typeof fetch = fetch): Promise<PublishState> {
  const token = env.GITHUB_PUBLISH_TOKEN?.trim();
  if (!token) return "not_configured";
  try {
    const response = await send(dispatchUrl, {
      method: "POST", redirect: "error",
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "csu-robotics-lab-publisher",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) return "queued";
    if (response.status === 401) return "invalid_token";
    if (response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0")) return "rate_limited";
    if (response.status === 403) return "forbidden";
    if (response.status === 404) return "not_found";
    if (response.status === 422) return "invalid_request";
    return `github_http_${response.status}`;
  } catch (error) {
    // Return only an allowlisted classification; never expose upstream response bodies, headers or token.
    return error instanceof Error && ["TimeoutError","AbortError"].includes(error.name) ? "timeout" : "network_error";
  }
}
