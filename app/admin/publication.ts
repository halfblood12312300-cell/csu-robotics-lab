export const publicationRuns = "https://github.com/halfblood12312300-cell/csu-robotics-lab/actions";
export function publicationMessage(state: unknown): string {
  if (state === "queued") return "内容已保存，已请求 GitHub 发布；公开网站将在部署成功后更新。";
  if (state === "not_needed") return "草稿已保存，无需发布公开网站。";
  const details: Record<string, string> = {
    invalid_token: "GitHub HTTP 401：令牌无效、已过期或复制不完整",
    forbidden: "GitHub HTTP 403：权限不足或请求被拒绝",
    not_found: "GitHub HTTP 404：令牌无法访问仓库或工作流不存在",
    invalid_request: "GitHub HTTP 422：工作流触发参数未被接受",
    rate_limited: "GitHub 请求频率受限",
    network_error: "Cloudflare 到 GitHub API 的连接失败",
    timeout: "Cloudflare 到 GitHub API 请求超时",
  };
  if (typeof state === "string" && (Object.hasOwn(details, state) || /^github_http_\d{3}$/.test(state))) {
    return "内容已保存，但自动发布失败（" + (details[state] || state.replace("github_http_", "GitHub HTTP ")) + "）。可前往 GitHub Actions 手动运行。";
  }
  if (state === "failed") return "内容已保存，但自动发布请求失败。请重试发布或前往 GitHub Actions 手动运行。";
  return "内容已保存；尚未配置自动发布授权。请前往 GitHub Actions 手动运行发布。";
}
