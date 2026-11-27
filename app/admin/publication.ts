export const publicationRuns = "https://github.com/halfblood12312300-cell/csu-robotics-lab/actions";
export const publicationWorkflow = "https://github.com/halfblood12312300-cell/csu-robotics-lab/actions/workflows/pages.yml";
export function publicationMessage(state: unknown): string {
  if (state === "not_needed") return "草稿已保存，无需发布公开网站。";
  return "内容已保存至数据库。请点击“立即同步公开网站”，在 GitHub 选择 Run workflow → main → Run workflow，部署成功后公开网站将更新。";
}
