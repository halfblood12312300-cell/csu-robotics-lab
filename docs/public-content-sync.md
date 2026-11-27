# 公开网站发布（静态优先）

公开访客从 GitHub Pages 同源读取 public-content.json；问卷星报名只依赖已发布的问卷链接，不请求 Cloudflare。管理员工作台仍连接 Workers/D1。原生报名模式必须连接实时服务。后台保存数据库成功与 GitHub Pages 部署成功是不同状态。

每次 main 提交、手动运行、定时任务会读取公开 /api/data、校验并发布静态副本。GitHub 定时任务可能延迟或漏跑，因此新增保存后主动请求发布；原定时任务只作补充。

## 一次性启用保存后发布
1. 在 GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens 创建令牌，Repository access 只选择 csu-robotics-lab，Repository permissions 仅 Actions: Read and write（Metadata read 自动附带），设置合理有效期。
2. Cloudflare csu-robotics-api → Settings → Runtime variables and secrets → Production → Add variable，Key 为 GITHUB_PUBLISH_TOKEN，Value 为令牌原文，勾选 Secret，Add variable and deploy。不要把令牌发到聊天或提交仓库。
3. 后台保存设置或发布/撤回文章会请求 GitHub Actions。也可在网站设置点击“立即同步公开网站”。看到请求已受理不等于部署成功，请检查 Actions。令牌缺失、过期或 API 请求失败时，数据库保存仍有效，可手动在 GitHub Actions → Build and deploy CSU Robotics Lab → Run workflow (main) 发布。

仅已发布文章和公开设置进入副本，不同步报名记录、草稿和令牌。静态副本无法撤回已下载内容。页脚显示实际公开副本的北京时间。外部问卷关闭时请同时在问卷星停止收集。GitHub Pages 可达性和更新速度仍受访问网络和 CDN 影响，不保证所有国内网络。
