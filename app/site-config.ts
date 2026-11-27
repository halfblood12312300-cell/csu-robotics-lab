import { researchDetails, type ResearchDetail } from "./research/content.ts";

export type ContentLink = { label: string; href: string; enabled: boolean };
export type NavigationLink = ContentLink & { id: string };
export type SectionHeading = { number: string; eyebrow: string; title: string; description: string };
export type HomeModuleId = "hero" | "stats" | "research" | "platforms" | "stories" | "gallery" | "banner";
export type HomeModule = { id: HomeModuleId; enabled: boolean };
export type ResearchDirection = {
  id: string; enabled: boolean; number: string; title: string; en: string;
  desc: string; tags: string[]; detail: ResearchDetail;
};
export type PlatformItem = {
  id: string; enabled: boolean; kind: string; title: string; subtitle: string;
  count: string; unit: string; description: string; image: string; imageAlt: string;
  link: ContentLink;
};
export type HeroSlide = { id: string; enabled: boolean; url: string; alt: string; caption: string; credit: string };
export type StatItem = { id: string; enabled: boolean; value: string; unit: string; label: string };
export type GalleryItem = { id: string; enabled: boolean; type: "image" | "video"; url: string; caption: string; href: string };
export type FieldType = "text" | "textarea" | "email" | "tel" | "url" | "number" | "date" | "select" | "radio" | "checkboxes" | "checkbox";
export type FieldOption = { value: string; label: string };
export type FormField = {
  id: string; label: string; type: FieldType; enabled: boolean; required: boolean;
  placeholder: string; help: string; width: "half" | "full";
  minLength: number; maxLength: number; optionsSource: "custom" | "research"; options: FieldOption[];
};
export type FormAnswer = string | string[] | boolean;
export type RegistrationConfig = {
  version: number; eyebrow: string; title: string; intro: string;
  mode: "internal" | "external"; externalUrl: string; externalButton: string; externalNote: string;
  infoTitle: string; infoBody: string; directionsTitle: string; directionsNote: string;
  formEyebrow: string; formTitle: string; formDescription: string; closedMessage: string;
  submitLabel: string; closedButtonLabel: string; consentText: string; privacyNote: string;
  successTitle: string; successMessage: string; successLink: ContentLink;
  layout: "split" | "centered"; fields: FormField[];
};
export type Settings = {
  /** Incremented by the API, used to reject overwrites from stale editor tabs. */
  revision: number;
  // Keep these established keys so existing stored settings and old clients remain compatible.
  registrationOpen: boolean; deadline: string; contact: string; heroImage: string;
  heroVideo: string; intro: string; location: string;
  site: {
    title: string; description: string; name: string; subtitle: string; logo: string; logoAlt: string;
    joinLabel: string; showJoin: boolean; adminLabel: string; workbenchLabel: string; showAdminLink: boolean;
    navLinks: NavigationLink[];
  };
  theme: {
    accentColor: string; backgroundColor: string; contentWidth: "compact" | "standard" | "wide";
    spacing: "compact" | "comfortable"; cornerStyle: "square" | "rounded"; stickyHeader: boolean;
  };
  home: {
    modules: HomeModule[];
    hero: {
      eyebrow: string; title: string; highlight: string; note: string;
      layout: "image-right" | "image-left" | "centered";
      imageAlt: string; imageCredit: string; photoLabel: string; photoLabelEn: string;
      visualLeft: string; visualRight: string; primary: ContentLink; secondary: ContentLink; slides: HeroSlide[];
    };
    stats: { items: StatItem[]; statement: string };
    research: { heading: SectionHeading; columns: 2 | 3 | 4; directions: ResearchDirection[] };
    platforms: { heading: SectionHeading; columns: 1 | 2 | 3; items: PlatformItem[]; note: string; sources: ContentLink[] };
    projects: { heading: SectionHeading; columns: 1 | 2 | 3; items: PlatformItem[]; note: string; sources: ContentLink[] };
    stories: { heading: SectionHeading; moreLink: ContentLink; limit: number; columns: 1 | 2 | 3 | 4; excludeRecruitment: boolean; featuredIds: string[] };
    gallery: { heading: SectionHeading; source: "articles" | "manual"; limit: number; columns: 1 | 2 | 3 | 4; items: GalleryItem[] };
    banner: { eyebrow: string; title: string; description: string; button: ContentLink; symbol: string; symbolCaption: string };
  };
  footer: {
    title: string; tagline: string; contactTitle: string; exploreTitle: string;
    aboutLink: ContentLink; links: NavigationLink[]; adminLabel: string;
    bottomLeft: string; bottomRight: string;
  };
  articles: {
    eyebrow: string; title: string; description: string; emptyText: string;
    undatedLabel: string; coverLeft: string; coverRight: string; coverCaption: string;
    categories: string[];
  };
  registration: RegistrationConfig;
};

export const homeModuleLabels: Record<HomeModuleId, string> = {
  hero: "首屏介绍", stats: "数据概览", research: "研究方向", platforms: "拟开展项目",
  stories: "项目与动态", gallery: "图片与视频", banner: "底部展示横幅",
};
export const fieldTypeLabels: Record<FieldType, string> = {
  text: "单行文字", textarea: "多行文字", email: "电子邮箱", tel: "电话号码", url: "网址",
  number: "数字", date: "日期", select: "下拉单选", radio: "单选按钮", checkboxes: "多选", checkbox: "确认勾选",
};
export const defaultDirections = [
  { id: "agent", number: "01", title: "专用智能体开发", en: "TASK AGENTS", desc: "理解自然语言指令，分解任务，调用工具，让机器人协调各个模块完成具体工作。", tags: ["任务规划", "工具调用", "执行反馈"] },
  { id: "model", number: "02", title: "开源语言模型微调", en: "LANGUAGE MODELS", desc: "从任务数据出发，开展指令微调、模型评测与部署优化，让模型更懂机器人面对的场景。", tags: ["数据构建", "指令微调", "模型评测"] },
  { id: "system", number: "03", title: "机器人功能模块", en: "ROBOT SYSTEMS", desc: "连接定位导航、路径规划、语音交互与运动接口，把独立功能组成完整的任务流程。", tags: ["自主导航", "系统集成", "实机测试"] },
  { id: "vision", number: "04", title: "计算机视觉", en: "COMPUTER VISION", desc: "研究目标检测、跟踪、场景理解与视觉定位，为自主行动提供对环境的判断。", tags: ["目标识别", "场景理解", "感知融合"] },
];

export function blankResearchDetail(): ResearchDetail {
  return { introduction: "", question: "", input: "", output: "", connects: "", topics: [], steps: [],
    example: { title: "", description: "", observations: [] }, evaluation: [], articleIds: [], keywords: [] };
}
export function newFormField(id: string, label = "新问题", type: FieldType = "text"): FormField {
  return { id, label, type, enabled: true, required: false, placeholder: "", help: "", width: "full",
    minLength: 0, maxLength: type === "textarea" ? 2000 : 200, optionsSource: "custom", options: [] };
}
const optionList = (labels: string[]): FieldOption[] => labels.map((label) => ({ value: label, label }));
const initialFields: FormField[] = [
  { ...newFormField("name", "姓名"), required: true, minLength: 2, maxLength: 40, width: "half", placeholder: "你的姓名" },
  { ...newFormField("grade", "年级", "select"), required: true, maxLength: 40, width: "half", placeholder: "请选择年级", options: optionList(["本科一年级", "本科二年级", "本科三年级", "本科四年级及以上", "硕士研究生", "博士研究生"]) },
  { ...newFormField("college", "学院与专业"), required: true, minLength: 2, maxLength: 100, placeholder: "例如：数学与统计学院 · 信息与计算科学" },
  { ...newFormField("contact", "联系方式"), required: true, minLength: 5, maxLength: 100, placeholder: "常用手机号或邮箱" },
  { ...newFormField("directions", "感兴趣的研究方向", "checkboxes"), required: true, help: "可多选", optionsSource: "research", options: defaultDirections.map((d) => ({ value: d.id, label: d.title })) },
  { ...newFormField("experience", "简单介绍一下自己", "textarea"), required: true, minLength: 10, placeholder: "可以谈谈你的兴趣、学习基础、做过的小项目，或想研究的问题。没有项目经历也可以从学习计划说起。" },
  { ...newFormField("availability", "每周可投入时间", "select"), required: true, maxLength: 100, width: "half", placeholder: "请选择", options: optionList(["每周3小时以内", "每周3–6小时", "每周6–10小时", "每周10小时以上", "可进一步沟通"]) },
  { ...newFormField("portfolio", "作品或个人主页", "url"), width: "half", maxLength: 2000, placeholder: "https://" },
];

export const defaultSettings: Settings = {
  revision: 0, registrationOpen: false, deadline: "", contact: "", heroImage: "/media/a2-scene.jpg", heroVideo: "",
  intro: "依托数学、统计与计算机方法，探索机器人从理解指令到自主执行任务的完整过程。",
  location: "中南大学数学与统计学院数理楼238",
  site: {
    title: "CSU 机器人实验室 · 中南大学数学与统计学院", description: "中南大学数学与统计学院机器人实验室，探索机器人自主执行任务的完整过程。",
    name: "机器人实验室", subtitle: "中南大学 · 数学与统计学院", logo: "", logoAlt: "实验室标志",
    joinLabel: "加入我们", showJoin: true, adminLabel: "管理员登录", workbenchLabel: "管理工作台", showAdminLink: true,
    navLinks: [
      { id: "about", label: "关于实验室", href: "/#about", enabled: true },
      { id: "research", label: "研究方向", href: "/#research", enabled: true },
      { id: "platforms", label: "拟开展项目", href: "/#platforms", enabled: true },
      { id: "articles", label: "项目与动态", href: "/articles", enabled: true },
    ],
  },
  theme: { accentColor: "#244bd8", backgroundColor: "#ffffff", contentWidth: "standard", spacing: "comfortable", cornerStyle: "square", stickyHeader: true },
  home: {
    modules: ["hero", "stats", "research", "platforms", "stories", "gallery", "banner"].map((id) => ({ id: id as HomeModuleId, enabled: true })),
    hero: {
      eyebrow: "CSU ROBOTICS LAB", title: "让机器人\n理解任务，", highlight: "自主行动。", note: "欢迎对机器人感兴趣的同学", layout: "image-right",
      imageAlt: "机器人设备展示", imageCredit: "当前设备展示图来自宇树官网，非实验室实拍",
      photoLabel: "从算法，走向真实世界。", photoLabelEn: "ALGORITHMS MEET THE REAL WORLD", visualLeft: "ROBOTICS × MATHEMATICS", visualRight: "探索 · 实践 · 协作",
      primary: { label: "探索研究方向", href: "/#research", enabled: true }, secondary: { label: "了解拟开展项目", href: "/#platforms", enabled: true },
      slides: [{ id: "hero-h2", enabled: true, url: "/media/h2-scene.jpg", alt: "H2人形机器人官方展示", caption: "探索机器人的更多可能。", credit: "宇树官网展示图，非实验室实拍" }],
    },
    stats: { items: [
      { id: "robots", enabled: true, value: "06", unit: "台", label: "真实机器人平台" },
      { id: "directions", enabled: true, value: "04", unit: "个", label: "主要研究方向" },
      { id: "room", enabled: true, value: "238", unit: "", label: "数理楼 · 实验室" },
    ], statement: "用数学理解问题，\n用实验验证想法。" },
    research: {
      heading: { number: "01", eyebrow: "RESEARCH DIRECTIONS", title: "从你的兴趣出发。", description: "围绕机器人自主执行任务，\n找到你想解决的具体问题。" }, columns: 4,
      directions: defaultDirections.map((direction) => ({ ...direction, enabled: true, detail: structuredClone(researchDetails[direction.id as keyof typeof researchDetails]) })),
    },
    platforms: {
      heading: { number: "02", eyebrow: "EXPERIMENTAL PLATFORMS", title: "在真实平台上，\n验证每一步探索。", description: "两种机器人形态，六台实机。\n为算法开发、功能联调与实验验证提供基础。" }, columns: 2,
      items: [
        { id: "a2", enabled: true, kind: "狗形机器人", title: "A2-W PRO", subtitle: "", count: "03", unit: "台", description: "可围绕移动感知、定位导航与自主任务流程开展探索。", image: "/media/a2-scene.jpg", imageAlt: "A2-W狗形机器人官方展示", link: { label: "了解实验平台", href: "/articles/platforms", enabled: true } },
        { id: "h2", enabled: true, kind: "人形机器人", title: "H2", subtitle: "教育旗舰版", count: "03", unit: "台", description: "可结合设备接口，探索视觉感知、语言交互与系统集成。", image: "/media/h2-scene.jpg", imageAlt: "H2人形机器人官方展示", link: { label: "了解实验平台", href: "/articles/platforms", enabled: true } },
      ],
      note: "设备展示图来源如下；具体研究以实际设备配置及开放接口为基础。",
      sources: [ { label: "宇树A2-W", href: "https://www.unitree.com/cn/mobile/A2-W/", enabled: true }, { label: "宇树H2", href: "https://www.unitree.com/cn/mobile/H2/", enabled: true } ],
    },
    projects: {
      heading: { number: "02", eyebrow: "PLANNED PROJECTS", title: "从想法出发，\n走向真实应用。", description: "围绕实际场景，开展机器人自主任务探索。\n以下为拟开展项目，具体方案将在后续实验中完善。" }, columns: 2,
      items: [
        { id: "museum-guide", enabled: true, kind: "拟开展项目 · 01", title: "机器人院史馆导览", subtitle: "", count: "", unit: "", description: "探索机器人在院史馆中的自主导航、语音讲解与参观互动，尝试将环境感知与任务执行结合。", image: "", imageAlt: "", link: { label: "了解更多", href: "", enabled: false } },
        { id: "robot-delivery", enabled: true, kind: "拟开展项目 · 02", title: "机器狗拿外卖", subtitle: "", count: "", unit: "", description: "围绕校园取餐场景，探索机器狗自主导航、目标识别与任务协作，逐步开展功能验证。", image: "", imageAlt: "", link: { label: "了解更多", href: "", enabled: false } },
      ],
      note: "项目处于规划阶段，具体研究内容与实施方式将根据实际条件调整。", sources: [],
    },
    stories: {
      heading: { number: "03", eyebrow: "IDEAS & UPDATES", title: "记录想法，也记录过程。", description: "" },
      moreLink: { label: "全部文章", href: "/articles", enabled: true }, limit: 3, columns: 3, excludeRecruitment: true, featuredIds: [],
    },
    gallery: { heading: { number: "", eyebrow: "LAB IN MOTION", title: "看见实验的每一步。", description: "" }, source: "articles", limit: 6, columns: 3, items: [] },
    banner: { eyebrow: "EXPLORE OUR RESEARCH", title: "研究，从具体问题开始。", description: "从任务规划到机器人系统，从语言模型到视觉感知。\n阅读研究导读、平台介绍与项目记录，了解实验室的探索方向。", button: { label: "浏览项目与动态", href: "/articles", enabled: true }, symbol: "∑", symbolCaption: "IDEAS → ACTION" },
  },
  footer: {
    title: "中南大学数学与统计学院\n机器人实验室", tagline: "理解任务 · 感知环境 · 自主行动", contactTitle: "联系我们", exploreTitle: "探索更多",
    aboutLink: { label: "了解实验室", href: "/#about", enabled: true },
    links: [ { id: "articles", label: "项目与动态", href: "/articles", enabled: true }, { id: "platforms", label: "拟开展项目", href: "/#platforms", enabled: true } ],
    adminLabel: "管理入口", bottomLeft: "CSU · MATHEMATICS & STATISTICS · ROBOTICS LAB", bottomRight: "让好奇心，在真实世界中得到验证。",
  },
  articles: {
    eyebrow: "IDEAS & UPDATES", title: "项目与动态", description: "研究导读、平台介绍和实验记录，让每一步探索都留下痕迹。", emptyText: "暂时没有匹配的内容。",
    undatedLabel: "实验室介绍", coverLeft: "PERCEIVE", coverRight: "ACT", coverCaption: "从指令到行动",
    categories: ["招新通知", "研究导读", "平台介绍", "实验记录", "实验室动态"],
  },
  registration: {
    mode: "internal", externalUrl: "", externalButton: "前往腾讯问卷报名", externalNote: "请在腾讯问卷中填写并提交报名信息，无需在本站重复填写。",
    version: 1, eyebrow: "JOIN THE LAB", title: "下一次探索，\n期待有你。", intro: "带着兴趣来，围绕一个具体问题，\n学习、尝试、协作，把想法付诸实践。",
    infoTitle: "我们欢迎这样的你", infoBody: "对机器人与人工智能有兴趣，愿意持续投入时间，主动学习并与同伴协作。\n\n数学、统计、编程或机器学习基础都能派上用场，暂无机器人项目经验也欢迎报名。",
    directionsTitle: "可以参与的方向", directionsNote: "相关实践也可为2027年大创项目积累基础。",
    formEyebrow: "APPLICATION", formTitle: "加入实验室", formDescription: "请认真填写以下信息，便于后续交流。", closedMessage: "报名通道尚未开放。你可以先了解填写内容，开放时间请关注实验室通知。",
    submitLabel: "提交报名", closedButtonLabel: "报名暂未开放", consentText: "我确认填写的信息真实，并同意实验室仅为招新评估与联系使用这些信息。", privacyNote: "报名信息仅供实验室管理员查看",
    successTitle: "报名已收到", successMessage: "感谢你对实验室的关注。我们会通过你留下的联系方式与你沟通。", successLink: { label: "继续了解实验室", href: "/articles", enabled: true },
    layout: "split", fields: initialFields,
  },
};

/** Merge only known defaults. Arrays replace as a whole, so hiding/removing items remains intentional. */
function mergeKnown(base: unknown, incoming: unknown): any {
  if (Array.isArray(base)) return Array.isArray(incoming) ? structuredClone(incoming) : structuredClone(base);
  if (base && typeof base === "object") {
    const value = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming as Record<string, unknown> : {};
    return Object.fromEntries(Object.entries(base).map(([key, fallback]) => [key, mergeKnown(fallback, value[key])]));
  }
  return typeof incoming === typeof base && incoming !== null ? incoming : base;
}
export function normalizeSettings(value?: unknown): Settings {
  const result = mergeKnown(defaultSettings, value) as Settings;
  // Keep existing customized navigation labels. Only migrate the exact former defaults.
  const source = value as Partial<Settings> | undefined;
  if (!source?.home?.projects) {
    for (const link of [...result.site.navLinks, ...result.footer.links]) {
      if (link.href === "/#platforms" && link.label === "实验平台") link.label = "拟开展项目";
    }
    if (result.home.hero.secondary.href === "/#platforms" && result.home.hero.secondary.label === "了解实验平台") result.home.hero.secondary.label = "了解拟开展项目";
  }
  return result;
}
/** Accept only Tencent's public HTTPS questionnaire URLs. */
export function isTencentQuestionnaireUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "wj.qq.com" && !url.username && !url.password && !url.port && url.pathname.length > 1;
  } catch { return false; }
}
/** Used for authorized settings patches after schema validation. Never reset omitted nested fields. */
export function mergeSettings(current: Settings, patch: unknown): Settings {
  return mergeKnown(current, patch) as Settings;
}
export function fieldOptions(field: FormField, settings: Settings): FieldOption[] {
  return field.optionsSource === "research"
    ? settings.home.research.directions.filter((direction) => direction.enabled).map((direction) => ({ value: direction.id, label: direction.title }))
    : field.options;
}
