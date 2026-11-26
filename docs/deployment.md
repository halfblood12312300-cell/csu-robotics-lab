# 部署说明

本文中的命令均在仓库根目录执行。GitHub Pages 发布前端和 `public/media/` 内的公开图片、短视频；Cloudflare Workers 执行 API，使用独立 D1 数据库。默认生产配置不绑定 R2。所有账号、资源 ID 和最终访问地址以服务实际返回的结果为准。

**希望只使用自己的普通浏览器操作：** 参见 [Cloudflare 控制台部署](cloudflare-browser.md)。该流程使用同一个 GitHub 仓库和 Cloudflare Workers Builds，不要求对话内浏览器具备登录状态。以下保留本机命令行部署流程。

本项目已完成 GitHub Pages 与独立 Worker 接入，账号持有人已确认完成管理员 Secret 设置。现有项目无需重新创建；下文保留首次部署及后续维护步骤。最新代码的构建结果和实际核验范围见 [上线确认](migration-status.md)，日常内容编辑见 [后台内容维护](site-editor.md)。

## 一、启用 GitHub Pages

1. 打开 [仓库 Pages 设置](https://github.com/halfblood12312300-cell/csu-robotics-lab/settings/pages)。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
3. 打开 [Actions](https://github.com/halfblood12312300-cell/csu-robotics-lab/actions)，选择 **Build and deploy CSU Robotics Lab → Run workflow → main**。
4. 等待 `Check and build` 和 `Deploy GitHub Pages` 都成功，打开部署结果里的网址。

工作流遵循 [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)：只向部署任务授予 `pages: write` 与 `id-token: write`；拉取请求只做检查和构建，不部署。Pages 发布来源必须在仓库设置中启用，详见 [GitHub 官方配置步骤](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 二、准备 Cloudflare 后端

在自己的开发机安装 Node.js 24，下载仓库并安装依赖：

```bash
git clone https://github.com/halfblood12312300-cell/csu-robotics-lab.git
cd csu-robotics-lab
npm ci
npx wrangler login
```

`wrangler login` 由账号持有人在浏览器完成 Cloudflare 授权。不需要把 Cloudflare 登录密码或 API Token 发送到聊天、网页表单或提交到 GitHub。

先复制不含 R2 的生产配置，再检查数据库：

```bash
cp backend/wrangler.example.jsonc backend/wrangler.jsonc
npx wrangler d1 list --json
```

如果列表已有 `csu-robotics-lab`，复用它的 `uuid`；仅在不存在时执行 `npx wrangler d1 create csu-robotics-lab`。将真实 UUID 填入 `backend/wrangler.jsonc` 的 `database_id`，保留绑定名 `DB`。配置中的 `REPLACE_WITH_D1_DATABASE_ID` 必须替换，不能使用本地测试的虚拟 UUID 部署生产。默认模式不用创建存储桶。

生产允许的前端来源为：

```text
FRONTEND_ORIGIN=https://halfblood12312300-cell.github.io
```

Origin 只包含协议与主机，不包含 `/csu-robotics-lab/` 路径。API 在服务端验证管理员身份；CORS 配置不代替认证。

先应用迁移、部署后端，再生成管理员访问密钥：

```bash
npx wrangler d1 migrations apply DB --remote --config backend/wrangler.jsonc
npx wrangler deploy --config backend/wrangler.jsonc
node backend/scripts/setup-secrets.mjs --config backend/wrangler.jsonc
```

初始化脚本生成 32 字节密码学随机值作为管理员访问密钥，默认仅把它的 SHA-256 摘要 `ADMIN_KEY_HASH` 通过标准输入交给 Wrangler。只有配置中存在 `BUCKET` 的 R2 绑定时，脚本才另外生成并设置 `MEDIA_SIGNING_SECRET`。成功后，原始访问密钥仅在执行者的终端显示一次，请保存到自己的密码管理器；登录后台时粘贴该密钥。原始密钥和后端 Secret 都不进入 GitHub 或前端构建。未初始化管理员 Secret 时后台登录保持关闭；重新运行脚本会轮换管理员密钥并使旧登录会话失效。

保存 `wrangler deploy` 实际输出的 HTTPS 地址。不要把文档中的示例主机名当作已部署地址。D1 迁移命令的行为参见 [Cloudflare D1 命令](https://developers.cloudflare.com/workers/wrangler/commands/d1/)；Secret 存储参见 [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)。

GitHub Pages 与后端是两项独立服务。当前选择不使用 R2，避免把素材存储订阅作为部署前提；Workers、D1 和 GitHub Pages 仍各有资源额度。部署后检查实际账号计划和运行结果，不预设付费升级，也不承诺无限流量或容量。

## 三、连接前端与后端

当前仓库通过 `public/runtime-config.json` 接入用户截图确认的正式 Worker 地址：

```json
{
  "apiBaseUrl": "https://csu-robotics-api.half-blood12312300.workers.dev"
}
```

配置提交并通过 Pages 发布后生效。该地址的 `/api/data` 已在浏览器实际返回网站设置和 3 篇公开文章，报名开关为关闭；这项读取验证不代表 `ADMIN_KEY_HASH` 已配置，也不代替管理员登录和写入验证。

如需改用构建变量，将 `public/runtime-config.json` 改为 `{}`，再到仓库 **Settings → Secrets and variables → Actions → Variables** 设置 `VITE_API_BASE_URL` 为实际后端 HTTPS 根地址，并重新运行 Pages 工作流。运行时文件不存在、无法读取或不包含字符串类型的 `apiBaseUrl` 时，也会回退到该变量；运行时 `apiBaseUrl` 字符串优先于构建变量，`{"apiBaseUrl":""}` 表示明确停用后端。

地址末尾不添加 `/api`、管理员访问密钥或访问令牌。前端会按需追加 `/api/data`、`/api/login` 等路径。运行时文件与 `VITE_` 变量都是公开配置，只能放公开地址。

接入后依次检查：

1. 主页、四个研究方向、文章及设备图片正常显示。
2. 顶部“加入我们”进入报名页面，其他展示模块不跳报名。
3. 管理员能登录、保存草稿、选择仓库素材、发布和撤回文章。
4. 仓库图片能显示、短视频能播放；确认维护者知道仓库素材本身公开，不受文章草稿权限保护。
5. 确认后台设置后再开启报名；用明确标记的测试报名检查保存、筛选和导出。

## 四、本地开发

本地数据库与线上数据库分离。以下命令使用 `backend/wrangler.local.jsonc` 和 `--local`，不会把本地测试数据发往生产。

```bash
node backend/scripts/setup-secrets.mjs --local --config backend/wrangler.local.jsonc
npx wrangler d1 migrations apply DB --local --config backend/wrangler.local.jsonc
npx wrangler dev --config backend/wrangler.local.jsonc --port 8787
```

本地开发前，临时将 `public/runtime-config.json` 改为 `{}`，让下面的本地环境变量生效；否则其中的生产地址会覆盖本地地址。这项临时修改不要提交，结束本地开发后恢复上述正式地址。另一个终端设置本地前端 API 地址：

```bash
VITE_API_BASE_URL=http://localhost:8787 npm run dev -- --host localhost --port 5173
```

使用终端输出的 `http://localhost:5173/...` 地址访问；本地允许来源以配置中的 `FRONTEND_ORIGIN` 为准。若改用其他主机名或端口，需对应调整本地配置。`backend/.dev.vars` 仅用于本地 Secret，已排除在 Git 提交之外。

当前本地配置也不绑定 R2，与默认生产模式一致。自动化测试中的模拟存储桶另行覆盖可选 R2 模式，不需要开通真实 R2 服务。

## 五、更新、诊断与回退

前端或仓库素材更新提交到 `main` 后，由 Pages 工作流发布；连接 Workers Builds 后，后端按其构建设置自动部署，使用本机部署的项目则重新执行 Worker 部署。只有新增数据库迁移时才应用新的迁移，已部署的 SQL 迁移不得改写。数据库与资源配置项使用 [Wrangler 官方配置](https://developers.cloudflare.com/workers/wrangler/configuration/)定义。

| 现象 | 先检查 |
| --- | --- |
| `Configure Pages` 或部署失败 | 仓库 Pages 来源是否为 GitHub Actions；Actions 日志中的具体错误 |
| 首页能看但报名未启用 | 是否设置了实际后端地址并重新构建；后台是否打开报名开关 |
| API 请求失败或被跨域拒绝 | 后端 URL、HTTPS、`FRONTEND_ORIGIN` 与浏览器实际 Origin 是否一致 |
| 管理员无法登录 | Secret 是否初始化、访问密钥是否完整、Worker 日志和实际请求额度 |
| 仓库新素材未出现 | 文件是否位于 `public/media/`、格式是否支持、该次 Pages 发布是否成功、后台是否已刷新 |
| 网站后台没有直接上传按钮 | 默认使用仓库素材，按 [仓库素材维护](repository-media.md) 在 GitHub 上传 |
| 最新构建仍要求启用 R2 | 是否实际构建了旧提交，或部署命令仍指向含 `r2_buckets` 的旧配置 |
| 刷新文章或研究页面异常 | 是否保留 `#/...` 路由及 `/csu-robotics-lab/` 构建基础路径 |

回退前端可以恢复已知可用的源码提交并重新运行 Pages。后端代码回退不等于数据库回退；先核对迁移兼容性与数据备份。旧站数据切换步骤见 [migration-status.md](migration-status.md)。

## 六、将来可选启用 R2

只有需要在网站后台直接上传较大文件、并让未发布素材保持私有时，才需要这个可选模式。先由账号持有人在 Cloudflare 控制台完成 R2 开通，再为实际部署配置添加名为 `BUCKET` 的 R2 绑定，并设置运行时 Secret `MEDIA_SIGNING_SECRET`。如使用本机初始化脚本，带 `BUCKET` 绑定重新运行会同时轮换管理员访问密钥，请按脚本提示保存新值。

R2 开通、额度和计费参见 [Cloudflare R2 入门](https://developers.cloudflare.com/r2/get-started/)。不要为解决旧提交中的 `10042` 报错而被动开通：默认无 R2 版本应先检查是否部署了最新配置。即使将来启用 R2，仓库里的素材仍然是公开的，不会自动迁移或获得私有权限。
