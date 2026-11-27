# 公开网站发布（静态优先）

普通访客从 GitHub Pages 同源读取 public-content.json；问卷星报名使用已发布的外部链接。管理员工作台仍连接 Workers/D1，可以在必要时使用 VPN。

## 日常维护
1. 在后台编辑并保存设置或文章；保存只确认数据库写入。
2. 在网站设置底部点击“立即同步公开网站”，直接打开 GitHub 发布工作流： https://github.com/halfblood12312300-cell/csu-robotics-lab/actions/workflows/pages.yml
3. 点击 Run workflow → main → Run workflow。
4. 检查 Check and build、Deploy GitHub Pages 均成功，再查看公开网站页脚的同步时间。

手动发布不再依赖 Cloudflare 的 GitHub Token。原定时任务仍可作为补充，但 GitHub 可能延迟或漏跑。可以撤销仅用于旧自动发布功能的 GITHUB_PUBLISH_TOKEN，并从 Cloudflare 删除对应 Secret；务必保留 ADMIN_KEY_HASH 和数据库绑定。

发布工作流只读取公开设置和已发布文章，不同步报名记录、草稿或密钥。静态副本不能撤回已下载内容。关闭外部报名时请同时在问卷星停止收集。GitHub Pages 国内访问及缓存速度因网络而异。
