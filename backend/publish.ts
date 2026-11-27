import type { Env } from "./types.ts";
export type PublishState = "queued" | "not_configured" | "failed";
const dispatchUrl = "https://api.github.com/repos/halfblood12312300-cell/csu-robotics-lab/actions/workflows/pages.yml/dispatches";
/** The database mutation has already succeeded. A dispatch failure must not falsely report a failed save. */
export async function requestPublication(env: Env, send: typeof fetch = fetch): Promise<PublishState> {
  if (!env.GITHUB_PUBLISH_TOKEN) return "not_configured";
  try {
    const response = await send(dispatchUrl, {
      method: "POST", redirect: "error",
      headers: {
        "Authorization": "Bearer " + env.GITHUB_PUBLISH_TOKEN,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "csu-robotics-lab-publisher",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok ? "queued" : "failed";
  } catch { return "failed"; }
}
