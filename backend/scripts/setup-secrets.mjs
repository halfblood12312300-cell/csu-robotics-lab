#!/usr/bin/env node
/** Run on the administrator's computer. Never run this script in public CI. */
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("node backend/scripts/setup-secrets.mjs [--local] [--config backend/wrangler.jsonc]");
  console.log("Generates a 256-bit administrator access key. Saves only its SHA-256 hash and a separate media signing secret.");
  console.log("The access key is shown once in your terminal after setup succeeds. Save it in your password manager.");
  console.log("Running again rotates the key and invalidates existing administrator sessions.");
  process.exit(0);
}
const local = args.includes("--local");
const configIndex = args.indexOf("--config");
const config = resolve(process.cwd(), configIndex === -1
  ? (local ? "backend/wrangler.local.jsonc" : "backend/wrangler.jsonc")
  : args[configIndex + 1] || "");
const recognized = new Set(["--local", "--config"]);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--config") { if (!args[++i]) throw new Error("--config requires a path"); continue; }
  if (!recognized.has(args[i])) throw new Error(`Unknown argument: ${args[i]}`);
}
if (!existsSync(config)) throw new Error("Copy backend/wrangler.example.jsonc to backend/wrangler.jsonc and configure your D1 database first.");
if (process.env.CI) throw new Error("Run secret setup interactively on your own computer, not in CI.");

const accessKey = "csu_admin_" + randomBytes(32).toString("base64url");
const secrets = {
  ADMIN_KEY_HASH: createHash("sha256").update(accessKey, "utf8").digest("base64url"),
  MEDIA_SIGNING_SECRET: randomBytes(32).toString("base64url"),
};

if (local) {
  const filename = resolve(dirname(config), ".dev.vars");
  let existing = existsSync(filename) ? readFileSync(filename, "utf8") : "";
  existing = existing.split(/\r?\n/).filter((line) => !/^\s*(?:ADMIN_KEY_HASH|ADMIN_PASSWORD_HASH|MEDIA_SIGNING_SECRET)\s*=/.test(line)).join("\n").trim();
  const content = (existing ? existing + "\n" : "") + Object.entries(secrets)
    .map(([name, value]) => `${name}=${JSON.stringify(value)}`).join("\n") + "\n";
  writeFileSync(filename, content, { mode: 0o600 });
  chmodSync(filename, 0o600);
  console.log("Local development hashes and signing secret configured. No remote secrets were changed.");
} else {
  if (readFileSync(config, "utf8").includes("REPLACE_WITH_D1_DATABASE_ID")) {
    throw new Error("Set the actual database_id in your private backend/wrangler.jsonc before configuring production secrets.");
  }
  const wrangler = resolve(repository, "node_modules/wrangler/bin/wrangler.js");
  if (!existsSync(wrangler)) throw new Error("Run npm ci first.");
  for (const [name, value] of Object.entries(secrets)) {
    await new Promise((complete, fail) => {
      // Values travel through stdin, never arguments or temporary files.
      const child = spawn(process.execPath, [wrangler, "secret", "put", name, "--config", config], {
        cwd: repository, stdio: ["pipe", "inherit", "inherit"],
      });
      child.on("error", fail);
      child.on("exit", (code) => code === 0 ? complete() : fail(new Error(`Secret update failed for ${name}. Rerun setup after fixing the deployment/login issue.`)));
      child.stdin.on("error", () => {});
      child.stdin.end(value + "\n");
    });
  }
  console.log("Production administrator access and private-media preview secrets configured.");
}
console.log("\nAdministrator access key (shown only here; store securely):\n" + accessKey);
console.log("\nPaste this key into the website's 管理员访问密钥 field. Do not commit it, send it in a URL, or put it in frontend environment variables.");
