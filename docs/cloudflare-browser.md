# 在自己的浏览器中部署 Cloudflare 后端

这个流程继续使用现有仓库 `halfblood12312300-cell/csu-robotics-lab`。前端和公开图片、短视频由 GitHub Pages 发布，Cloudflare Workers 与 D1 负责报名、文章和网站设置。默认不启用 R2，无需在电脑安装 Node.js。

当前准备好的代码尚未代表后端已上线。第一次设置需要账号持有人在 Cloudflare 完成仓库授权、构建权限和管理员 Secret 录入。用户此前的日志已经确认三项 D1 迁移成功，但 Worker 在 R2 未开通处失败；本次改动移除默认 R2 依赖，后续必须查看最新提交对应的构建结果。

## 1. 连接现有 GitHub 仓库

在已经登录的 Cloudflare 控制台进入 **Workers & Pages → Create application → GitHub**，选择 `halfblood12312300-cell/csu-robotics-lab`。首次会要求安装或授权 Cloudflare 的 GitHub 应用，只选这个仓库即可。

填写以下设置：

| 设置 | 值 |
| --- | --- |
| Worker 名称 | `csu-robotics-api` |
| 仓库 | `halfblood12312300-cell/csu-robotics-lab` |
| 生产分支 | `main` |
| 根目录 / Root directory | 仓库根目录，通常显示 `/`；不要填 `backend` |
| Build command | 留空；Wrangler 在部署时打包后端 |
| Deploy command | `npm run backend:deploy:cloudflare` |
| Enable Preview builds | 关闭，首次只部署生产分支 |
| Preview command | 关闭预览构建后无需修改此项 |
| API token name | `csu-robotics-builds`，这是令牌名称，不是密钥值 |
| 构建 Variable name / Value | 留空；本步骤无需额外构建变量 |

根目录的 `wrangler.jsonc` 明确指向 `backend/index.ts`，因此不需要选择 Vite 前端部署模板，也不需要填写 `dist` 输出目录。仓库的 `.node-version` 已指定 Node.js 24，无需另填版本变量。Cloudflare 项目名必须与配置中的 `csu-robotics-api` 一致。首次只部署 `main`；若界面提供其他分支预览部署，暂不启用，以免预览命令访问生产数据库。

依据：[Workers Builds 入门](https://developers.cloudflare.com/workers/ci-cd/builds/)、[构建配置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)与[构建环境版本](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)。

## 2. 确认构建令牌已包含 D1 编辑权限

Cloudflare 可以自动为 Workers Builds 创建构建令牌。以创建页面实际展示的权限清单为准：**如果已经列出 `D1 Storage (edit)`，该令牌已包含本项目所需的 D1 编辑权限，直接使用即可，无需另建令牌或重复添加权限。** 当前项目创建界面已显示这一项。

本项目需要创建数据库并执行迁移，构建令牌必须能够编辑目标账号的 D1、部署 Worker。默认模式不调用 R2。`API token name` 可以填写 `csu-robotics-builds`，供以后识别用途；这里无需粘贴任何已有 Token 的密钥值。

只有当界面实际未包含 D1 编辑权限，或构建日志明确报告 D1 权限不足时，才到 **My Profile → API Tokens** 检查这个 Worker 使用的令牌，为同一个账号补充相应权限。使用自定义令牌时应限制到本项目所在账号。修改权限后，在 Worker 构建历史中选择 **Retry build**；脚本会在读取数据库权限失败时停止，不会继续部署。

令牌保留在 Cloudflare 内。不要将密钥值放进仓库、前端变量、聊天或截图。官方说明：[Builds API token](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#api-token)、[D1 创建接口权限](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/create/)。文档列出的默认权限可能与实际创建页不同，不应仅因文档没有列出 D1 就认定当前令牌缺少权限。

## 3. 部署不依赖 R2 的最新版本

根目录 `wrangler.jsonc` 默认只声明 D1 绑定。图片和短视频通过 GitHub 仓库更新，随 Pages 发布；具体操作见 [仓库素材维护](repository-media.md)。这一路径不创建 R2 存储桶，也不需要进入 R2 订阅或付款设置。

首次创建项目时点击 **Deploy／Save and Deploy**。已经连接仓库的项目通常会在新的 `main` 提交到达后自动构建：先查看 **Deployments** 中最新构建的提交号，确认它对应本次去除 R2 依赖的版本。不要反复重试仍使用旧提交的失败构建；如果没有自动触发，请使用控制台提供的最新提交构建操作。部署命令依次执行：

1. 查询名为 `csu-robotics-lab` 的 D1 数据库；找到就复用，只有不存在时才创建。
2. 读取真实数据库 ID，生成仅在本次构建使用的配置；无需手动抄 ID。
3. 按顺序应用 `backend/migrations/` 中尚未执行的迁移。
4. 部署只绑定 D1 的 `csu-robotics-api`。

失败会停止，不会删除现有数据库、清空数据或改用其他存储。再次执行会沿用同名资源；不要改名来绕过错误。数据库迁移只能前向追加，旧站数据不会自动复制过来。

脚本先查询或创建 D1，再取得真实 ID，生成临时配置后执行迁移。临时配置不含管理员 Secret，结束时清理，也已排除在 Git 提交外。它不删除已有数据库或记录，也不复制旧站数据。

## 4. 在自己的浏览器生成并保存后台密钥

Worker 部署成功后，打开前端发布的 [后台密钥设置工具](https://halfblood12312300-cell.github.io/csu-robotics-lab/setup/admin-key.html)。如果前端仍在部署，等 GitHub Actions 的 Pages 任务成功后再打开。

页面不会自动生成密钥。点击“生成一组密钥”后，使用浏览器的密码学随机数与 SHA-256 在当前页面内生成配置值，不向网络发送、不写入浏览器持久存储。**默认不使用 R2，只需把 `ADMIN_KEY_HASH` 配置到 Worker**：

| 工具显示的值 | 保存位置 |
| --- | --- |
| 管理员访问密钥 | 自己的密码管理器；登录网站后台时使用 |
| `ADMIN_KEY_HASH` | Cloudflare Worker → Settings → Variables & Secrets，类型选择 **Secret** |
| `MEDIA_SIGNING_SECRET` | 默认跳过；仅将来启用 R2 私有素材预览时，才作为运行时 **Secret** 保存 |

这里填写的是 Worker **运行时**的 Variables & Secrets，不是 Builds 的构建变量。保存并部署 Cloudflare 提示的 Secret 更改。原始管理员访问密钥不放进 Cloudflare 的普通变量、GitHub 或前端配置。

密钥只留在这张页面中，刷新或关闭后不会恢复，先保存到自己的密码管理器再清空。再次点击生成不会自动改变线上密钥；把新的 `ADMIN_KEY_HASH` 保存并部署到 Worker 后，管理员访问密钥才会轮换，旧登录会话会失效。部署代码本身不生成、读取或轮换这些 Secret。

也可继续使用已有本机脚本 `backend/scripts/setup-secrets.mjs`；它与浏览器工具使用相同密钥格式和摘要规则，但必须由管理员在自己的终端执行，不能放入公开 CI。

## 5. 把实际后端地址接入前端

复制 Cloudflare 部署结果中实际显示的 HTTPS Worker 根地址，格式通常为 `https://csu-robotics-api.<账号子域>.workers.dev`。这里的 `<账号子域>` 是占位说明，不能原样填写。

可以把这个**公开后端地址**交给网站维护者，由维护者更新仓库的 `public/runtime-config.json`，提交后 Pages 会自动重新发布。也可按 [deployment.md](deployment.md) 设置 GitHub 仓库变量 `VITE_API_BASE_URL`。

地址末尾不添加 `/api`，不附带密钥。接入后先验证读取数据、后台登录、文章保存、仓库素材选择与播放，再由管理员检查招新内容和截止时间并开启报名。默认报名保持关闭，不会因为部署后端而自动开始收集报名。

## 后续更新

完成连接后，提交 `main` 会分别触发 GitHub Pages 前端发布和 Cloudflare 后端构建。每次后端构建查询并复用同名数据库，只执行未应用的迁移，再部署代码，不重置密钥。

如果构建失败，把**错误文字或隐藏令牌与密钥后的截图**提供给维护者即可。常见需要检查的是构建是否使用最新提交、D1 编辑权限、Worker 名称与配置是否一致、Node 版本是否符合要求。当前默认模式若仍报 `Please enable R2`，先核对构建提交号与使用的配置文件，不要因此开通付费服务或删除数据库。

将来确实需要从网站后台直接上传并保护未发布素材时，才考虑另行开通 R2、添加 `BUCKET` 绑定和 `MEDIA_SIGNING_SECRET`；这不是当前临时网站的部署前提。
