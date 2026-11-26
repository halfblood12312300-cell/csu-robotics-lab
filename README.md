# CSU 机器人实验室网站

中南大学数学与统计学院机器人实验室的展示网站。展示前端已发布到 GitHub Pages。独立后端源码使用 Cloudflare Workers 提供报名、内容管理和素材接口，使用 D1 保存文章与报名数据、R2 保存上传文件。

仓库：<https://github.com/halfblood12312300-cell/csu-robotics-lab>

**当前线上展示地址：<https://halfblood12312300-cell.github.io/csu-robotics-lab/>**

GitHub Pages 已部署成功，并已实际打开验证。当前 Cloudflare 后端尚未授权、创建生产资源或部署，线上网站使用内置展示内容；在线报名和后台登录显示“暂未启用”，相关操作已禁用。历史报名、生产文章和上传素材尚未迁移。

## 网站内容

- 仅顶部“加入我们”进入招新报名。
- 四个研究方向进入独立展示页：专用智能体、语言模型微调、机器人功能模块、计算机视觉。
- 实验平台、项目动态、文章和影像分别展示相关内容。
- 后台保留文章草稿与发布、素材分段上传、网站设置、报名筛选与 CSV 导出等功能。
- 管理员使用独立后端验证的访问密钥登录，不再依赖原平台的身份请求头。

前端采用 `#/...` 路由。例如研究方向地址为 `.../csu-robotics-lab/#/research/agent`。接通后端后，文章详情可读取后端数据，后台新发布文章不需要为每个文章 ID 重新生成 HTML。

## 后续更新展示页面

本仓库 **Settings → Pages → Build and deployment → Source** 已设为 **GitHub Actions**。

1. 向 `main` 提交更新；也可以在 **Actions → Build and deploy CSU Robotics Lab** 中手动运行工作流。
2. 工作流完成类型检查、后端边界测试和前端构建后发布 `dist/`。
3. 确认 **Deploy GitHub Pages** 成功，再打开正式网址检查更新内容。

不配置后端也可以浏览内置实验室介绍和研究展示；此时报名和后台登录会明确显示尚未启用，不会伪造提交成功。

## 接入报名和管理功能

如果自己的普通浏览器已经能登录 Cloudflare，可按 [浏览器部署说明](docs/cloudflare-browser.md) 连接本仓库，由 Cloudflare Workers Builds 创建或复用数据库、执行迁移并发布后端。无需在对话内浏览器登录，也无需把 Cloudflare API Token 发给维护者。仓库已提供后端专用的根目录 `wrangler.jsonc` 和 `npm run backend:deploy:cloudflare` 命令；运行前需完成仓库授权、确认构建令牌已包含 D1 编辑权限，并开通 R2。若创建页面已列出 `D1 Storage (edit)`，可直接使用自动生成的令牌，无需重复添加权限。

也可以按 [部署说明](docs/deployment.md) 使用本机 Wrangler 创建自己的 Cloudflare 后端。获得实际后端地址后，在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables** 添加：

```text
VITE_API_BASE_URL = Cloudflare 实际返回的后端 HTTPS 根地址
```

填写后端根地址，不要追加 `/api`。这是公开配置，只能填写地址；管理员访问密钥、会话、Cloudflare API Token 都不能写入该变量。修改变量后重新运行 Pages 工作流。

完整步骤、可选运行时配置、本地开发和故障定位见 [docs/deployment.md](docs/deployment.md)。部署边界和旧站数据迁移状态见 [docs/migration-status.md](docs/migration-status.md)。

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

前端构建产物在 `dist/`。单独启动前端时可以检查展示页面；需要测试登录、上传或报名时，按部署说明同时启动本地 Worker 和本地数据库。

## 代码入口

| 路径 | 用途 |
| --- | --- |
| `app/` | 展示页面、表单和管理界面 |
| `app/content.ts` | 默认介绍、初始文章与基础设置 |
| `app/research/content.ts` | 四个研究方向的固定展示内容 |
| `public/media/` | 随前端发布的初始设备图片 |
| `backend/` | 独立 Worker API、认证、迁移和部署配置 |
| `.github/workflows/pages.yml` | 检查、构建与 Pages 发布流程 |
| `docs/` | 部署操作与迁移边界说明 |

初始 A2-W 和 H2 图片来自[宇树 A2-W 产品资料](https://www.unitree.com/cn/mobile/A2-W/)及[宇树 H2 产品资料](https://www.unitree.com/cn/mobile/H2/)，页面已标明不是实验室实拍。原站的生产数据库、历史报名和上传素材不包含在源码中，也不会随 GitHub 提交自动迁移。
