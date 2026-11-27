export const publicationRuns = "https://github.com/halfblood12312300-cell/csu-robotics-lab/actions";
export function publicationMessage(state: unknown): string {
  if (state === "queued") return "内容已保存，已请求 GitHub 发布；公开网站将在部署成功后更新。";
  if (state === "not_needed") return "草稿已保存，无需发布公开网站。";
  if (state === "failed") return "内容已保存，但自动发布请求失败。请重试发布或前往 GitHub Actions 手动运行。";
  return "内容已保存；尚未配置自动发布授权。请前往 GitHub Actions 手动运行发布。";
}
