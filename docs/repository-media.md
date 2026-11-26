# 用 GitHub 仓库更新图片和短视频

当前临时网站使用 GitHub Pages 发布公开素材，不需要 R2。图片、短视频放入 `public/media/`；每次前端构建会自动扫描这个目录及其子目录，把支持的文件收录到后台素材选择器。文章、报名和网站设置仍由 Cloudflare Workers 与 D1 管理。

## 网页上传流程

1. 在自己的浏览器登录 GitHub，打开本仓库的 [public/media 目录](https://github.com/halfblood12312300-cell/csu-robotics-lab/tree/main/public/media)。
2. 选择 **Add file → Upload files**，拖入图片或短视频。
3. 填写简短提交说明，例如“添加实验室介绍图片”，提交到 `main`。如果仓库规则要求先建分支，则按提示创建并合并拉取请求到 `main`。
4. 打开仓库 **Actions**，等这次提交对应的 **Build and deploy CSU Robotics Lab → Deploy GitHub Pages** 成功。
5. 刷新网站后台，在“素材库”或文章、首页设置的素材选择器里选用新文件。仅上传文件不会自动替换首页或已有文章中的图片。

GitHub 的网页上传流程见[官方添加文件说明](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)。

建议使用容易识别且稳定的文件名，例如 `lab-intro.jpg`、`robot-demo.mp4`。支持的图片格式为 JPG/JPEG、PNG、WebP、GIF、AVIF，视频为 MP4、WebM。目录内的说明文档不会当成图片或视频列入素材库。子目录和含空格、中文的文件名由素材目录统一处理；日常维护仍建议用英文、数字、连字符或下划线，避免在名称里使用 `#`、`?`、`%` 或反斜杠。

## 文件地址与页面地址

例如仓库文件 `public/media/lab-intro.jpg` 发布后的地址是：

```text
https://halfblood12312300-cell.github.io/csu-robotics-lab/media/lab-intro.jpg
```

这只是命名示例，不代表仓库里已经有这个文件。选用后台素材时会自动填写正确的素材路径。`github.com/.../blob/main/...` 是 GitHub 的文件查看页面，不是图片或视频的播放地址，不能拿它代替素材 URL。

仓库素材的改名、替换和移除都在 GitHub 中完成。更改路径或删除文件后，原来引用该路径的文章或首页仍需在后台更新；发布前检查这些引用。

## 大小和流量

| 项目 | GitHub 当前限制 |
| --- | --- |
| 通过 GitHub 网页上传 | 单个文件不超过 25 MiB |
| 普通 Git 仓库文件 | 大于 100 MiB 的文件会被拒绝 |
| 已发布的 GitHub Pages 网站 | 不超过 1 GB |
| Pages 月带宽 | 100 GB 软限制 |

前两项来自 [GitHub 大文件说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)，后两项来自 [GitHub Pages 限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)。MiB 与 MB 的单位略有不同；下面的建议刻意留出余量。

**给这个临时网站的建议**：普通照片尽量压到 1 MB 以内，短视频尽量压到 20 MB 以内，优先使用常见 MP4。这是为了方便网页上传和减少加载时间的维护建议，不是平台新增的硬限制。较长视频可以放到常用视频平台，在网站中提供封面和普通跳转链接；本项目不承诺自动支持任意平台的嵌入播放器。

不要把 Git LFS 当作绕过 Pages 限制的办法。GitHub 官方说明 [Git LFS 不能用于 GitHub Pages 站点](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)。

## 素材是公开的

本仓库及其 Pages 素材是公开资源。文件提交并发布后，即使只选入了草稿、尚未放到首页，知道地址的人仍可直接读取。文章的草稿权限不会让仓库中的图片或视频变成私有文件。

只上传允许公开展示的内容；报名名单、联系人表格、后台密钥和 API Token 不放进仓库，也不放入 `public/`。网站后台不会持有 GitHub 写入令牌，上传动作由你在 GitHub 自己的界面完成。

如果以后需要从网站后台直接上传大文件，或需要保护未发布的素材，再考虑启用 R2。这不会影响当前使用仓库素材的默认方案。
