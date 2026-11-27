import type { ZodIssue } from "zod";
import { homeModuleLabels, type Settings } from "../../site-config";

export type SettingsEditorTab = "site" | "home" | "research" | "platforms" | "showcase" | "registration" | "fields";

const names: Record<string, string> = {
  title: "标题", description: "内容说明", name: "站点名称", subtitle: "副标题", label: "名称", href: "链接地址", enabled: "显示状态",
  number: "编号", eyebrow: "标题上方小字", logo: "标志图片", logoAlt: "标志图片说明", joinLabel: "加入我们按钮文字", showJoin: "加入我们按钮开关",
  adminLabel: "管理入口文字", workbenchLabel: "工作台入口文字", showAdminLink: "管理入口开关", navLinks: "顶部导航", links: "链接列表",
  highlight: "首屏强调文字", note: "补充说明", layout: "排列方式", imageAlt: "图片说明", imageCredit: "图片来源", photoLabel: "图片中文标签",
  photoLabelEn: "图片英文标签", visualLeft: "视觉区左下文字", visualRight: "视觉区右下文字", primary: "主要按钮", secondary: "次要按钮",
  items: "展示项目", statement: "数据区说明", heading: "模块标题", columns: "展示列数", directions: "方向列表", en: "英文名称", desc: "简要介绍",
  tags: "标签", detail: "详情内容", introduction: "详情引言", question: "核心问题", input: "输入", output: "输出", connects: "与其他方向的联系",
  topics: "研究主题", steps: "开展步骤", example: "示例项目", observations: "观察要点", evaluation: "评价标准", articleIds: "关联文章", keywords: "关联关键词",
  kind: "平台类型", count: "数量", unit: "单位", image: "设备图片", link: "展示链接", sources: "资料链接", moreLink: "更多内容按钮",
  limit: "展示数量", excludeRecruitment: "招新文章筛选", featuredIds: "优先展示的文章", source: "影像来源", type: "类型", url: "素材地址", caption: "影像说明",
  button: "按钮", symbol: "装饰符号", symbolCaption: "符号说明", value: "内容", tagline: "页脚说明", contactTitle: "联系信息标题",
  exploreTitle: "探索链接标题", aboutLink: "关于实验室链接", bottomLeft: "页脚左下文字", bottomRight: "页脚右下文字",
  emptyText: "无文章时的提示", undatedLabel: "无日期提示", coverLeft: "默认封面左侧文字", coverRight: "默认封面右侧文字", coverCaption: "默认封面说明", categories: "文章分类",
  accentColor: "强调色", backgroundColor: "背景色", contentWidth: "页面宽度", spacing: "模块间距", cornerStyle: "圆角风格", stickyHeader: "固定顶部导航",
  infoTitle: "招新介绍标题", infoBody: "招新介绍正文", directionsTitle: "可参与方向标题", directionsNote: "研究方向补充说明", formEyebrow: "表单标题上方小字",
  formTitle: "表单标题", formDescription: "填写说明", closedMessage: "报名关闭提示", submitLabel: "提交按钮文字", closedButtonLabel: "关闭时按钮文字",
  consentText: "提交前确认说明", privacyNote: "表单底部隐私说明", successTitle: "报名成功标题", successMessage: "报名成功内容", successLink: "报名成功后链接",
  required: "必填状态", placeholder: "输入框提示文字", help: "问题补充说明", width: "字段占用宽度", minLength: "最少填写字数", maxLength: "最多填写字数",
  options: "选项", optionsSource: "选项来源", fields: "问题列表", intro: "介绍文字", registrationOpen: "报名开放状态", deadline: "报名截止日期",
  contact: "咨询联系方式", location: "实验室地点", heroImage: "首屏图片", heroVideo: "首屏视频", id: "项目标识", revision: "设置版本", version: "表单版本",
};

function group(path: (string | number)[]): { tab: SettingsEditorTab; label: string; skip: number } {
  if (path[0] === "registration") return path[1] === "fields"
    ? { tab: "fields", label: "报名表字段", skip: 2 }
    : { tab: "registration", label: "报名页面", skip: 1 };
  if (path[0] === "home") {
    const modules: Record<string, { tab: SettingsEditorTab; label: string }> = {
      modules: { tab: "home", label: "首页与布局 › 模块顺序" }, hero: { tab: "home", label: "首页与布局 › 首屏" },
      stats: { tab: "home", label: "首页与布局 › 数据与说明" }, banner: { tab: "home", label: "首页与布局 › 底部横幅" },
      research: { tab: "research", label: "研究方向" }, platforms: { tab: "platforms", label: "原设备配置" }, projects: { tab: "platforms", label: "拟开展项目" },
      stories: { tab: "showcase", label: "文章与影像 › 近期动态" }, gallery: { tab: "showcase", label: "文章与影像 › 实验室影像" },
    };
    return { ...(modules[String(path[1])] || { tab: "home", label: "首页与布局" }), skip: 2 };
  }
  if (path[0] === "theme") return { tab: "home", label: "首页与布局 › 主题", skip: 1 };
  if (path[0] === "articles") return { tab: "showcase", label: "文章与影像 › 文章列表", skip: 1 };
  if (path[0] === "footer") return { tab: "site", label: "站点与导航 › 页脚", skip: 1 };
  if (path[0] === "site") return { tab: "site", label: "站点与导航", skip: 1 };
  if (["deadline", "registrationOpen"].includes(String(path[0]))) return { tab: "registration", label: "报名页面", skip: 0 };
  if (["heroImage", "heroVideo", "intro"].includes(String(path[0]))) return { tab: "home", label: "首页与布局 › 首屏", skip: 0 };
  return { tab: "site", label: "站点与导航", skip: 0 };
}

function issueMessage(issue: ZodIssue) {
  // Most schema refinements already explain the error in Chinese. Translate
  // Zod's built-in array/string/number limits too, including nested lists.
  if (/[\u3400-\u9fff]/.test(issue.message)) return issue.message;
  if (issue.code === "too_big") {
    if (issue.type === "array") return `最多保留 ${issue.maximum} 项`;
    if (issue.type === "string") return `最多填写 ${issue.maximum} 字`;
    if (issue.type === "number") return `数值不能超过 ${issue.maximum}`;
  }
  if (issue.code === "too_small") {
    if (issue.type === "array") return `至少保留 ${issue.minimum} 项`;
    if (issue.type === "string") return issue.minimum === 1 ? "请填写内容" : `至少填写 ${issue.minimum} 字`;
    if (issue.type === "number") return `数值不能小于 ${issue.minimum}`;
  }
  if (issue.code === "invalid_type") return issue.expected === "number" ? "请填写有效的整数" : "内容格式不正确，请重新填写";
  if (issue.code === "invalid_enum_value") return "请选择一个可用选项";
  return "内容格式不正确，请检查后重试";
}

/** Point the administrator to a visible editor and a named question/card. */
export function describeSettingsIssue(issue: ZodIssue, settings: Settings) {
  const path = issue.path;
  const section = group(path);
  const parts = [section.label];
  let current: unknown = settings;
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    current = current && typeof current === "object" ? (current as Record<string | number, unknown>)[key] : undefined;
    if (i < section.skip) continue;
    if (typeof key === "number") {
      const item = current && typeof current === "object" ? current as Record<string, unknown> : {};
      const module = path[0] === "home" && path[1] === "modules" ? homeModuleLabels[item.id as keyof typeof homeModuleLabels] : "";
      const title = module || item.title || item.label || item.caption;
      parts.push(title ? `第 ${key + 1} 项「${String(title).slice(0, 40)}」` : `第 ${key + 1} 项`);
    } else parts.push(names[key] || "设置内容");
  }
  return { tab: section.tab, message: `${parts.join(" › ")}：${issueMessage(issue)}。` };
}
