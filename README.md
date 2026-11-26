# CSU 机器人实验室网站

中南大学数学与统计学院机器人实验室的展示网站。前端使用 GitHub Pages，报名、内容管理和素材接口由独立的 Cloudflare Workers 后端提供，文章与报名数据保存在 D1，上传文件保存在 R2。

仓库：<https://github.com/halfblood12312300-cell/csu-robotics-lab>

GitHub Pages 配置成功后使用的地址：`https://halfblood12312300-cell.github.io/csu-robotics-lab/`。该地址是否已经上线，以仓库 **Actions → Deploy GitHub Pages** 的成功结果为准；提交源码本身不代表已经完成发布。

## 网站内容

- 仅顶部“加入我们”进入招新报名。
- 四个研究方向进入独立展示页：专用智能体、语言模型微调、机器人功能模块、计算机视觉。
- 实验平台、项目动态、文章和影像分别展示相关内容。
- 后台保留文章草稿与发布、素材分段上传、网站设置、报名筛选与 CSV 导出等功能。
- 管理员使用独立后端验证的访问密钥登录，不再依赖原平台的身份请求头。

前端采用 `#/...` 路由。例如研究方向地址为 `.../csu-robotics-lab/#/research/agent`。文章详情由后端数据决定，因此后台新发布文章后，不需要为每个文章 ID 重新生成 HTML。

## 先发布展示页面

1. 打开本仓库 **Settings → Pages**，将 **Build and deployment → Source** 设为 **GitHub Actions**。
2. 在 **Actions → Build and deploy CSU Robotics Lab** 中运行工作流，或向 `main` 提交代码。
3. 工作流完成类型检查、后端边界测试和前端构建后发布 `dist/`，成功结果中会给出正式网址。

不配置后端也可以浏览内置实验室介绍和研究展示；此时报名和后台登录会明确显示尚未启用，不会伪造提交成功。

## 接入报名和管理功能

按 [部署说明](docs/deployment.md) 创建自己的 Cloudflare 后端，随后在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables** 添加：

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
