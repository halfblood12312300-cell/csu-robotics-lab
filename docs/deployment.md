# 部署说明

本文中的命令均在仓库根目录执行。GitHub Pages 发布前端；Cloudflare Workers 执行 API，使用独立 D1 数据库与 R2 存储桶。所有账号、资源 ID 和最终访问地址以服务实际返回的结果为准。

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

先复制生产配置，再创建资源：

```bash
cp backend/wrangler.example.jsonc backend/wrangler.jsonc
npx wrangler d1 create csu-robotics-lab
npx wrangler r2 bucket create csu-robotics-media
```

将 D1 命令返回的 `database_id` 填入 `backend/wrangler.jsonc` 对应项。若存储桶实际名称不同，同步修改 `r2_buckets` 中的 `bucket_name`。保留绑定名 `DB` 和 `BUCKET`。配置中的 `REPLACE_WITH_D1_DATABASE_ID` 是明确占位符，必须替换；不能使用本地测试的虚拟 UUID 部署生产。

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

初始化脚本生成 32 字节密码学随机值作为管理员访问密钥，只把它的 SHA-256 摘要 `ADMIN_KEY_HASH` 和随机 `MEDIA_SIGNING_SECRET` 通过标准输入交给 Wrangler。成功后，原始访问密钥仅在执行者的终端显示一次，请保存到自己的密码管理器；登录后台时粘贴该密钥。原始密钥和两个后端 Secret 都不进入 GitHub 或前端构建。未初始化 Secret 时后台登录保持关闭；重新运行脚本会轮换密钥并使旧登录会话失效。

保存 `wrangler deploy` 实际输出的 HTTPS 地址。不要把文档中的示例主机名当作已部署地址。D1 迁移命令的行为参见 [Cloudflare D1 命令](https://developers.cloudflare.com/workers/wrangler/commands/d1/)；创建存储桶参见 [R2 命令](https://developers.cloudflare.com/workers/wrangler/commands/r2/)；Secret 存储参见 [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)。

GitHub Pages 与后端是两项独立服务。后端的资源额度、R2 启用条件与 Workers CPU 限制取决于实际 Cloudflare 账号；部署后应检查登录和上传是否正常。本文不预设付费计划，也不承诺所有流量或存储都无费用。

## 三、连接前端与后端

在仓库 **Settings → Secrets and variables → Actions → Variables** 新增仓库变量 `VITE_API_BASE_URL`，值为上一步实际部署的后端 HTTPS 根地址，然后重新运行 Pages 工作流。

示例格式如下，其中尖括号内容必须换成真实值：

```text
VITE_API_BASE_URL=https://<实际的 Worker 主机名>
```

不要在末尾添加 `/api`、管理员访问密钥或访问令牌。前端会按需追加 `/api/data`、`/api/login` 等路径。`VITE_` 变量会被编译进公开网页，只能放公开配置。

另一种方式是修改仓库已有的 `public/runtime-config.json`：

```json
{
  "apiBaseUrl": "https://<实际的 Worker 主机名>"
}
```

仓库默认的运行时文件内容为 `{}`，会使用构建变量 `VITE_API_BASE_URL`。文件不存在、无法读取或不包含字符串类型的 `apiBaseUrl` 时，同样使用构建变量。运行时文件中的 `apiBaseUrl` 字符串优先于构建变量；只有 `{"apiBaseUrl":""}` 才表示明确停用后端。使用仓库变量配置时，保留默认的 `{}` 即可。

接入后依次检查：

1. 主页、四个研究方向、文章及设备图片正常显示。
2. 顶部“加入我们”进入报名页面，其他展示模块不跳报名。
3. 管理员能登录、保存草稿、预览上传文件、发布和撤回文章。
4. 未发布素材没有公开引用时，普通访客无法直接读取。
5. 确认后台设置后再开启报名；用明确标记的测试报名检查保存、筛选和导出。

## 四、本地开发

本地数据库与线上数据库分离。以下命令使用 `backend/wrangler.local.jsonc` 和 `--local`，不会把本地测试数据发往生产。

```bash
node backend/scripts/setup-secrets.mjs --local --config backend/wrangler.local.jsonc
npx wrangler d1 migrations apply DB --local --config backend/wrangler.local.jsonc
npx wrangler dev --config backend/wrangler.local.jsonc --port 8787
```

另一个终端设置本地前端 API 地址：

```bash
VITE_API_BASE_URL=http://localhost:8787 npm run dev -- --host localhost --port 5173
```

使用终端输出的 `http://localhost:5173/...` 地址访问；本地允许来源以配置中的 `FRONTEND_ORIGIN` 为准。若改用其他主机名或端口，需对应调整本地配置。`backend/.dev.vars` 仅用于本地 Secret，已排除在 Git 提交之外。

## 五、更新、诊断与回退

前端更新提交到 `main` 后，由 Pages 工作流发布；后端代码更新需要重新执行 Worker 部署。只有新增数据库迁移时才应用新的迁移，已部署的 SQL 迁移不得改写。数据库与资源配置项使用 [Wrangler 官方配置](https://developers.cloudflare.com/workers/wrangler/configuration/)定义。

| 现象 | 先检查 |
| --- | --- |
| `Configure Pages` 或部署失败 | 仓库 Pages 来源是否为 GitHub Actions；Actions 日志中的具体错误 |
| 首页能看但报名未启用 | 是否设置了实际后端地址并重新构建；后台是否打开报名开关 |
| API 请求失败或被跨域拒绝 | 后端 URL、HTTPS、`FRONTEND_ORIGIN` 与浏览器实际 Origin 是否一致 |
| 管理员无法登录 | Secret 是否初始化、访问密钥是否完整、Worker 日志和实际请求额度 |
| 上传失败 | R2 绑定、文件类型/大小、分段请求及 Worker 日志 |
| 刷新文章或研究页面异常 | 是否保留 `#/...` 路由及 `/csu-robotics-lab/` 构建基础路径 |

回退前端可以恢复已知可用的源码提交并重新运行 Pages。后端代码回退不等于数据库回退；先核对迁移兼容性与数据备份。旧站数据切换步骤见 [migration-status.md](migration-status.md)。
