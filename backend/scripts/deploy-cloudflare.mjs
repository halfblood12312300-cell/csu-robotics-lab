#!/usr/bin/env node
/** Deploy from Cloudflare Workers Builds without reading or changing Worker secrets. */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceConfig = resolve(repository, "wrangler.jsonc");
const generatedConfig = resolve(repository, "wrangler.builds.generated.jsonc");
const wrangler = resolve(repository, "node_modules/wrangler/bin/wrangler.js");
const args = process.argv.slice(2);

class CommandFailure extends Error {
  constructor(stage, code) {
    super(`${stage}失败（Wrangler 退出码：${code ?? "未知"}）。后续步骤已停止。`);
    this.stage = stage;
  }
}

function runWrangler(arguments_, stage, capture = false) {
  return new Promise((complete, fail) => {
    const child = spawn(process.execPath, [wrangler, ...arguments_], {
      cwd: repository,
      // Workers Builds provides authentication. Never start an interactive login here.
      env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
      stdio: ["ignore", capture ? "pipe" : "inherit", "inherit"],
    });
    let output = "";
    let tooLarge = false;
    if (capture) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        output += chunk;
        if (output.length > 8 * 1024 * 1024) {
          tooLarge = true;
          child.kill();
        }
      });
    }
    child.on("error", () => fail(new Error(`无法启动本仓库的 Wrangler（${stage}）。请先运行 npm ci。`)));
    child.on("close", (code) => {
      if (tooLarge) fail(new Error("D1 列表输出异常，已停止部署；没有继续创建资源。"));
      else if (code !== 0) fail(new CommandFailure(stage, code));
      else complete(output);
    });
  });
}

async function findDatabase(databaseName) {
  const output = await runWrangler(
    ["d1", "list", "--json", "--config", sourceConfig], "读取 D1 数据库列表", true,
  );
  let databases;
  try { databases = JSON.parse(output); }
  catch { throw new Error("Wrangler 没有返回有效的 D1 JSON 列表。已停止，避免重复创建数据库。"); }
  if (!Array.isArray(databases)) throw new Error("D1 列表格式与预期不符。已停止，避免重复创建数据库。");
  const matching = databases.filter((database) => database && database.name === databaseName);
  if (matching.length > 1) throw new Error("发现多个同名 D1 数据库。请先在控制台核对，脚本不会自行选择。");
  if (matching.length === 0) return null;
  if (typeof matching[0].uuid !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matching[0].uuid)) {
    throw new Error("目标 D1 数据库缺少有效 uuid。已停止，不会创建替代数据库。");
  }
  return matching[0].uuid;
}

async function main() {
  if (args.some((arg) => !["--help", "--plan"].includes(arg))) {
    throw new Error("仅支持 --help 和 --plan；不带参数时执行部署。");
  }
  if (args.includes("--help")) {
    console.log("node backend/scripts/deploy-cloudflare.mjs [--help | --plan]");
    console.log("默认：复用或创建指定 D1 数据库，应用迁移，部署 Worker；R2 由 Wrangler 自动配置。");
    console.log("--plan：仅显示步骤，不访问网络、不写文件、不调用 Wrangler。");
    console.log("本脚本不读取、生成或修改管理员 Secret。请先在 Cloudflare Workers Builds 配置部署授权。");
    return;
  }

  // This checked-in .jsonc intentionally uses strict JSON, so no parser dependency is needed.
  const config = JSON.parse(await readFile(sourceConfig, "utf8"));
  const bindings = config.d1_databases?.filter((binding) => binding.binding === "DB");
  if (!Array.isArray(bindings) || bindings.length !== 1 || bindings[0].database_name !== "csu-robotics-lab") {
    throw new Error("根目录配置必须包含唯一的 DB 绑定，数据库名为 csu-robotics-lab。");
  }
  const databaseName = bindings[0].database_name;
  if (config.name !== "csu-robotics-api" || config.main !== "backend/index.ts" || bindings[0].migrations_dir !== "backend/migrations") {
    throw new Error("Worker 名称、入口或迁移目录不符合本项目配置，请先核对根目录 wrangler.jsonc。");
  }

  if (args.includes("--plan")) {
    console.log(`Worker：${config.name}`);
    console.log(`1. d1 list --json --config wrangler.jsonc，精确查找 ${databaseName}。`);
    console.log(`2. 仅在不存在时：d1 create ${databaseName} --no-update-config --config wrangler.jsonc，然后重新读取列表。`);
    console.log("3. 临时生成 wrangler.builds.generated.jsonc，填入实际 D1 uuid。");
    console.log("4. d1 migrations apply DB --remote --config wrangler.builds.generated.jsonc");
    console.log("5. deploy --config wrangler.builds.generated.jsonc（Wrangler 自动复用或创建指定 R2 存储桶）。");
    console.log("6. 清理临时配置；不读取或修改 Worker Secret。");
    return;
  }

  if (!existsSync(wrangler)) throw new Error("找不到本仓库的 Wrangler。请先运行 npm ci。");
  if (existsSync(generatedConfig)) {
    throw new Error("临时部署配置已存在。请确认没有另一项部署正在运行，再移除 wrangler.builds.generated.jsonc 后重试。");
  }

  let wroteGeneratedConfig = false;
  try {
    let databaseId = await findDatabase(databaseName);
    if (!databaseId) {
      console.log(`未找到 ${databaseName}，创建一次 D1 数据库。`);
      await runWrangler(
        ["d1", "create", databaseName, "--no-update-config", "--config", sourceConfig], "创建 D1 数据库",
      );
      databaseId = await findDatabase(databaseName);
      if (!databaseId) throw new Error("创建命令结束后仍未找到目标数据库。已停止；请在控制台核对后重试。");
    } else console.log(`复用现有 D1 数据库：${databaseName}。`);

    const resolvedConfig = {
      ...config,
      d1_databases: config.d1_databases.map((binding) => binding.binding === "DB"
        ? { ...binding, database_id: databaseId }
        : binding),
    };
    await writeFile(generatedConfig, JSON.stringify(resolvedConfig, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    wroteGeneratedConfig = true;
    await runWrangler(
      ["d1", "migrations", "apply", "DB", "--remote", "--config", generatedConfig], "应用 D1 数据库迁移",
    );
    await runWrangler(["deploy", "--config", generatedConfig], "部署 Worker 与配置 R2");
    console.log("后端部署命令已成功完成，请保存 Wrangler 上方输出的实际 Worker 地址。");
    console.log("管理员 Secret 由控制台单独维护，本脚本没有读取或修改它们。");
  } finally {
    if (wroteGeneratedConfig) await rm(generatedConfig, { force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "后端部署失败，后续步骤已停止。");
  if (error instanceof CommandFailure) {
    console.error("若提示未认证或无权限，请在 Cloudflare Workers Builds 核对部署账号和 D1 编辑权限；本脚本不会尝试其他账号或凭证。");
    if (error.stage === "部署 Worker 与配置 R2") {
      console.error("若错误与 R2 尚未开通有关，请由账号持有人在普通浏览器的 Cloudflare 控制台处理 R2 开通，再重新部署；脚本不会开通计费服务。");
    }
  }
  process.exitCode = 1;
});
