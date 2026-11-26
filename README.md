# CSU 机器人实验室网站

中南大学数学与统计学院机器人实验室的展示网站。展示前端已发布到 GitHub Pages，图片和短视频放在本仓库的 `public/media/` 中，随前端一起发布。独立后端使用 Cloudflare Workers 与 D1 保存文章、网站设置和报名数据；默认部署不启用 R2。

仓库：<https://github.com/halfblood12312300-cell/csu-robotics-lab>

**当前线上展示地址：<https://halfblood12312300-cell.github.io/csu-robotics-lab/>**

不依赖 R2 的提交 `91945827c61575649acf87ed4a855501ec5b2cf4` 已通过 GitHub Pages 发布（[Actions 运行 45791152634](https://github.com/halfblood12312300-cell/csu-robotics-lab/actions/runs/45791152634)），同一提交的 Cloudflare Workers Builds 也已成功。用户截图确认正式 Worker 地址为 <https://csu-robotics-api.half-blood12312300.workers.dev>，其 [`/api/data` 公开读取接口](https://csu-robotics-api.half-blood12312300.workers.dev/api/data)已在浏览器实际返回网站设置和 3 篇公开文章，报名开关为关闭。前端接入配置使用这个地址；本次接入发布、`ADMIN_KEY_HASH` 配置以及管理员登录和写入仍待验证。历史报名、生产文章和上传素材尚未迁移。

## 网站内容

- 仅顶部“加入我们”进入招新报名。
- 四个研究方向进入独立展示页：专用智能体、语言模型微调、机器人功能模块、计算机视觉。
- 实验平台、项目动态、文章和影像分别展示相关内容。
- 后台保留文章草稿与发布、网站设置、报名筛选与 CSV 导出，并可选择随前端发布的仓库素材。
- 图片和短视频通过 GitHub 仓库上传；网站后台提供素材选择和预览，不代持 GitHub 写入令牌。
- 管理员使用独立后端验证的访问密钥登录，不再依赖原平台的身份请求头。

前端采用 `#/...` 路由。例如研究方向地址为 `.../csu-robotics-lab/#/research/agent`。接通后端后，文章详情可读取后端数据，后台新发布文章不需要为每个文章 ID 重新生成 HTML。

## 后续更新展示页面

本仓库 **Settings → Pages → Build and deployment → Source** 已设为 **GitHub Actions**。

1. 向 `main` 提交更新；也可以在 **Actions → Build and deploy CSU Robotics Lab** 中手动运行工作流。
2. 工作流完成类型检查、后端边界测试和前端构建后发布 `dist/`。
3. 确认 **Deploy GitHub Pages** 成功，再打开正式网址检查更新内容。

不配置后端也可以浏览内置实验室介绍和研究展示；此时报名和后台登录会明确显示尚未启用，不会伪造提交成功。

## 接入报名和管理功能

如果自己的普通浏览器已经能登录 Cloudflare，可按 [浏览器部署说明](docs/cloudflare-browser.md) 连接本仓库，由 Cloudflare Workers Builds 创建或复用数据库、执行迁移并发布后端。仓库已提供后端专用的根目录 `wrangler.jsonc` 和 `npm run backend:deploy:cloudflare` 命令。默认只使用 Workers 与 D1，不需要为了这个网站开通 R2；创建页已列出 `D1 Storage (edit)` 时，可直接使用自动生成的构建令牌。管理员登录在默认模式下只需配置运行时 Secret `ADMIN_KEY_HASH`。

当前仓库通过 `public/runtime-config.json` 接入已确认的正式地址：

```json
{
  "apiBaseUrl": "https://csu-robotics-api.half-blood12312300.workers.dev"
}
```

这项配置随 Pages 发布后生效。公开读取接口已经验证，接下来需确认前端接入以及后台登录和写入。地址不追加 `/api`，也不附带任何密钥或 Token。

也可以按 [部署说明](docs/deployment.md) 使用本机 Wrangler，或改用 GitHub 仓库变量 `VITE_API_BASE_URL`。改用构建变量时需将运行时配置改为 `{}`；运行时 `apiBaseUrl` 字符串优先于该变量。

完整步骤、可选运行时配置、本地开发和故障定位见 [docs/deployment.md](docs/deployment.md)。部署边界和旧站数据迁移状态见 [docs/migration-status.md](docs/migration-status.md)。

## 上传图片和短视频

打开仓库的 [public/media](https://github.com/halfblood12312300-cell/csu-robotics-lab/tree/main/public/media)，选择 **Add file → Upload files**，上传素材并提交到 `main`。等 GitHub Pages 发布成功后刷新网站后台，新文件会出现在仓库素材列表中，可选作文章图片、视频、封面或首页素材。详细步骤与大小建议见 [仓库素材维护](docs/repository-media.md)。

仓库素材属于公开文件，即使尚未选入已发布文章也可通过文件地址访问。报名信息、联系人列表、密码和 Token 不应放进本仓库或 `public/`。长视频建议使用视频平台上的公开链接，仓库只保留封面和简短预告。

## 本地开发与验证

使用 Node.js 24：

```bash
npm ci
npm run dev
```

```bash
npm run typecheck
npm test
npm run build
```

前端构建产物在 `dist/`。单独启动前端时可以检查展示页面；需要测试登录、文章管理或报名时，按部署说明同时启动本地 Worker 和本地数据库。

## 代码入口

| 路径 | 用途 |
| --- | --- |
| `app/` | 展示页面、表单和管理界面 |
| `app/content.ts` | 默认介绍、初始文章与基础设置 |
| `app/research/content.ts` | 四个研究方向的固定展示内容 |
| `public/media/` | 随前端发布并自动收录的公开图片和短视频 |
| `backend/` | 独立 Worker API、认证、迁移和部署配置 |
| `.github/workflows/pages.yml` | 检查、构建与 Pages 发布流程 |
| `docs/` | 部署操作与迁移边界说明 |

初始 A2-W 和 H2 图片来自[宇树 A2-W 产品资料](https://www.unitree.com/cn/mobile/A2-W/)及[宇树 H2 产品资料](https://www.unitree.com/cn/mobile/H2/)，页面已标明不是实验室实拍。原站的生产数据库、历史报名和上传素材不包含在源码中，也不会随 GitHub 提交自动迁移。
