import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { createPublicSnapshot } from "../app/public-snapshot.ts";

const configured = JSON.parse(readFileSync("public/runtime-config.json", "utf8"));
const origin = new URL(configured.apiBaseUrl);
if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
  throw new Error("Expected a public HTTPS API origin.");
}
const url = new URL("/api/data", origin);
let snapshot: ReturnType<typeof createPublicSnapshot> | undefined;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const capturedAt = Date.now();
    const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error("Public API HTTP " + response.status);
    const body = await response.text();
    if (body.length > 10_000_000) throw new Error("Public response too large");
    snapshot = createPublicSnapshot(JSON.parse(body), capturedAt);
    break;
  } catch {
    // Never emit the response body or credentials to CI logs.
    console.warn("Public snapshot fetch/validation failed, attempt " + attempt);
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
if (!snapshot) throw new Error("No valid public snapshot; deployment stopped to retain the previous published site.");
writeFileSync("dist/public-content.json.tmp", JSON.stringify(snapshot) + "\n", { encoding: "utf8" });
renameSync("dist/public-content.json.tmp", "dist/public-content.json");
console.log("Published snapshot prepared: revision " + snapshot.settings.revision + ", " + snapshot.articles.length + " public articles.");
