import { z } from "zod";
import { defaultSettings, fieldOptions, isTencentQuestionnaireUrl, type Settings } from "./site-config.ts";
import { linkUrlSchema, mediaUrlSchema } from "./content-urls.ts";

const short = z.string().max(250, "单行文字最多250字");
const paragraph = z.string().max(4000, "内容最多4000字");
const label = z.string().trim().min(1, "请填写名称").max(120, "名称最多120字");
const identifier = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/, "标识只能使用字母、数字、连字符和下划线")
  .refine((value) => !["__proto__", "constructor", "prototype"].includes(value), "标识不可使用保留名称");
const articleId = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/, "文章标识无效");
const object = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict("设置含有无法识别的字段，请刷新页面后重试");
const contentLink = object({ label: short, href: linkUrlSchema, enabled: z.boolean() });
const navigation = contentLink.extend({ id: identifier });
const heading = object({ number: short, eyebrow: short, title: short, description: paragraph });
const topic = object({ title: short, description: paragraph, detail: short });
const step = object({ title: short, description: paragraph });
const researchDetail = object({
  introduction: paragraph, question: short, input: short, output: short, connects: short,
  topics: z.array(topic).max(12), steps: z.array(step).max(12),
  example: object({ title: short, description: paragraph, observations: z.array(z.string().max(1000)).max(12) }),
  evaluation: z.array(step).max(12), articleIds: z.array(articleId).max(40), keywords: z.array(z.string().max(60)).max(30),
});
const researchDirection = object({
  id: identifier, enabled: z.boolean(), number: short, title: label, en: short,
  desc: paragraph, tags: z.array(z.string().max(60)).max(20), detail: researchDetail,
});
const formField = object({
  id: identifier, label, type: z.enum(["text", "textarea", "email", "tel", "url", "number", "date", "select", "radio", "checkboxes", "checkbox"]),
  enabled: z.boolean(), required: z.boolean(), placeholder: z.string().max(500), help: z.string().max(1000),
  width: z.enum(["half", "full"]), minLength: z.number().int().min(0).max(4000), maxLength: z.number().int().min(1).max(4000),
  optionsSource: z.enum(["custom", "research"]), options: z.array(object({ value: label, label })).max(60),
});
const moduleId = z.enum(["hero", "stats", "research", "platforms", "stories", "gallery", "banner"]);
const columns = (values: number[]) => z.number().int().refine((value) => values.includes(value), "列数无效");

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const platformSection = object({
  heading, columns: columns([1, 2, 3]),
  items: z.array(object({ id: identifier, enabled: z.boolean(), kind: short, title: short, subtitle: short, count: short, unit: short,
    description: paragraph, image: mediaUrlSchema, imageAlt: short, link: contentLink })).max(16),
  note: paragraph, sources: z.array(contentLink).max(16),
});
const settingsObject = object({
  revision: z.number().int().nonnegative(), registrationOpen: z.boolean(),
  deadline: z.string().max(16).refine((value) => !value || validDate(value), "截止日期无效"),
  contact: z.string().max(200), heroImage: mediaUrlSchema, heroVideo: mediaUrlSchema, intro: paragraph, location: short,
  site: object({
    title: short, description: z.string().max(1000), name: short, subtitle: short, logo: mediaUrlSchema, logoAlt: short,
    joinLabel: short, showJoin: z.boolean(), adminLabel: short, workbenchLabel: short, showAdminLink: z.boolean(),
    navLinks: z.array(navigation).max(12),
  }),
  theme: object({
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "颜色须为六位十六进制色值"),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "颜色须为六位十六进制色值"),
    contentWidth: z.enum(["compact", "standard", "wide"]), spacing: z.enum(["compact", "comfortable"]),
    cornerStyle: z.enum(["square", "rounded"]), stickyHeader: z.boolean(),
  }),
  home: object({
    modules: z.array(object({ id: moduleId, enabled: z.boolean() })).length(7, "首页模块须保留全部七项，可用显示开关隐藏"),
    hero: object({
      eyebrow: short, title: short, highlight: short, note: short, layout: z.enum(["image-right", "image-left", "centered"]),
      imageAlt: short, imageCredit: short, photoLabel: short, photoLabelEn: short, visualLeft: short, visualRight: short,
      primary: contentLink, secondary: contentLink,
      slides: z.array(object({ id: identifier, enabled: z.boolean(), url: mediaUrlSchema, alt: short, caption: short, credit: short })).max(12).default(defaultSettings.home.hero.slides),
    }),
    stats: object({ items: z.array(object({ id: identifier, enabled: z.boolean(), value: short, unit: short, label: short })).max(12), statement: paragraph }),
    research: object({ heading, columns: columns([2, 3, 4]), directions: z.array(researchDirection).max(16) }),
    platforms: platformSection,
    projects: platformSection.default(defaultSettings.home.projects),
    stories: object({ heading, moreLink: contentLink, limit: z.number().int().min(1).max(24), columns: columns([1, 2, 3, 4]), excludeRecruitment: z.boolean(), featuredIds: z.array(articleId).max(40) }),
    gallery: object({
      heading, source: z.enum(["articles", "manual"]), limit: z.number().int().min(1).max(32), columns: columns([1, 2, 3, 4]),
      items: z.array(object({ id: identifier, enabled: z.boolean(), type: z.enum(["image", "video"]), url: mediaUrlSchema, caption: short, href: linkUrlSchema })).max(32),
    }),
    banner: object({ eyebrow: short, title: short, description: paragraph, button: contentLink, symbol: short, symbolCaption: short }),
  }),
  footer: object({ title: short, tagline: short, contactTitle: short, exploreTitle: short, aboutLink: contentLink,
    links: z.array(navigation).max(16), adminLabel: short, bottomLeft: short, bottomRight: short }),
  articles: object({ eyebrow: short, title: short, description: paragraph, emptyText: short, undatedLabel: short,
    coverLeft: short, coverRight: short, coverCaption: short, categories: z.array(z.string().trim().min(1).max(40)).min(1).max(20) }),
  registration: object({
    mode: z.enum(["internal", "external"]).default("internal"),
    externalUrl: z.string().max(2000).refine(value => !value || isTencentQuestionnaireUrl(value), "请输入腾讯问卷 HTTPS 填写链接").default(""),
    externalButton: short.default(defaultSettings.registration.externalButton), externalNote: paragraph.default(defaultSettings.registration.externalNote),
    version: z.number().int().min(1), eyebrow: short, title: short, intro: paragraph, infoTitle: short, infoBody: paragraph,
    directionsTitle: short, directionsNote: paragraph, formEyebrow: short, formTitle: short, formDescription: paragraph, closedMessage: paragraph,
    submitLabel: short, closedButtonLabel: short, consentText: z.string().trim().min(1, "请填写报名信息使用说明").max(2000), privacyNote: paragraph,
    successTitle: short, successMessage: paragraph, successLink: contentLink, layout: z.enum(["split", "centered"]), fields: z.array(formField).min(2).max(40),
  }),
});

export const settingsPatchSchema = settingsObject.deepPartial();
export const settingsSchema = settingsObject.superRefine((value, context) => {
  const fail = (path: (string | number)[], message: string) => context.addIssue({ code: z.ZodIssueCode.custom, path, message });
  const unique = (items: { id: string }[], path: (string | number)[]) => {
    const ids = new Set<string>();
    for (let index = 0; index < items.length; index++) {
      if (ids.has(items[index].id)) fail([...path, index, "id"], "同一列表的标识不能重复");
      ids.add(items[index].id);
    }
  };
  unique(value.site.navLinks, ["site", "navLinks"]); unique(value.footer.links, ["footer", "links"]);
  unique(value.home.modules, ["home", "modules"]); unique(value.home.stats.items, ["home", "stats", "items"]);
  unique(value.home.research.directions, ["home", "research", "directions"]); unique(value.home.platforms.items, ["home", "platforms", "items"]);
  unique(value.home.projects.items, ["home", "projects", "items"]); unique(value.home.hero.slides, ["home", "hero", "slides"]);
  if (value.registration.mode === "external" && value.registrationOpen && !isTencentQuestionnaireUrl(value.registration.externalUrl)) fail(["registration", "externalUrl"], "开放腾讯问卷报名之前，请填写有效的问卷链接");
  unique(value.home.gallery.items, ["home", "gallery", "items"]); unique(value.registration.fields, ["registration", "fields"]);
  if (new Set(value.articles.categories).size !== value.articles.categories.length) fail(["articles", "categories"], "文章分类不能重复");
  for (const id of ["name", "contact"]) {
    const field = value.registration.fields.find((item) => item.id === id);
    if (!field || !field.required || !field.enabled) fail(["registration", "fields"], "姓名和联系方式为必填核心字段，不能删除或隐藏");
    else if ((id === "name" && field.type !== "text") || (id === "contact" && !["text", "email", "tel"].includes(field.type))) fail(["registration", "fields"], "姓名使用单行文字，联系方式使用文字、邮箱或电话类型");
    if (field && field.maxLength > (id === "name" ? 40 : 100)) fail(["registration", "fields"], id === "name" ? "姓名最多40字" : "联系方式最多100字");
  }
  value.registration.fields.forEach((field, index) => {
    if (field.minLength > field.maxLength) fail(["registration", "fields", index], "最少字数不能超过最多字数");
    const options = fieldOptions(field, value as Settings);
    if (new Set(options.map((option) => option.value)).size !== options.length) fail(["registration", "fields", index, "options"], "同一问题的选项值不能重复");
    if (field.enabled && ["select", "radio", "checkboxes"].includes(field.type) && !options.length) fail(["registration", "fields", index, "options"], `请为“${field.label}”设置至少一个可用选项`);
  });
});


export { validDate };
