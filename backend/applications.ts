import { z } from "zod";
import { fieldOptions, type FormAnswer, type FormField, type Settings } from "../app/site-config.ts";
import type { Application, ApplicationAnswerSnapshot, ApplicationFormSnapshot } from "../app/admin/shared.tsx";
import { ApiError } from "./types.ts";
import { isPublicHttpUrl } from "./urls.ts";
import { validDate } from "./settings.ts";

const answerValue = z.union([z.string().max(4000), z.array(z.string().max(120)).max(60), z.boolean()]);
const envelope = z.object({
  answers: z.record(answerValue).refine((answers) => Object.keys(answers).length <= 40, "报名字段过多"),
  formVersion: z.number().int().min(1), consent: z.literal(true, { errorMap: () => ({ message: "请确认报名信息使用说明" }) }), website: z.string().max(0),
}).strict("报名表已更新，请刷新页面后填写");
const legacyEnvelope = z.object({
  name: z.string().max(40), college: z.string().max(4000).optional(), grade: z.string().max(4000).optional(),
  contact: z.string().max(100), directions: z.array(z.string().max(120)).max(60).optional(), experience: z.string().max(4000).optional(),
  availability: z.string().max(4000).optional(), portfolio: z.string().max(2000).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "请确认报名信息使用说明" }) }), website: z.string().max(0),
}).strict("报名表已更新，请刷新页面后填写");

function validateAnswer(field: FormField, raw: FormAnswer | undefined, settings: Settings): FormAnswer {
  const fail = (message: string): never => { throw new ApiError(`“${field.label}”${message}`); };
  if (field.type === "checkbox") {
    if (raw !== undefined && typeof raw !== "boolean") return fail("请使用勾选项填写");
    const value = raw ?? false;
    if (field.required && !value) return fail("需要确认勾选");
    return value;
  }
  if (field.type === "checkboxes") {
    if (raw !== undefined && !Array.isArray(raw)) return fail("请使用多选项填写");
    const values = raw ?? [];
    if (field.required && !values.length) return fail("请至少选择一项");
    const options = new Set(fieldOptions(field, settings).map((option) => option.value));
    if (new Set(values).size !== values.length || values.some((value) => !options.has(value))) return fail("包含无效或重复选项，请刷新页面后重新选择");
    return values;
  }
  if (raw !== undefined && typeof raw !== "string") return fail("请填写文字内容");
  const value = (raw ?? "").trim();
  if (!value) {
    if (field.required) return fail("不能为空");
    return "";
  }
  if (value.length < field.minLength) return fail(`至少填写${field.minLength}字`);
  if (value.length > field.maxLength) return fail(`最多填写${field.maxLength}字`);
  if (["select", "radio"].includes(field.type) && !fieldOptions(field, settings).some((option) => option.value === value)) return fail("选项无效，请刷新页面后重新选择");
  if (field.type === "email" && !z.string().email().safeParse(value).success) return fail("请填写有效的电子邮箱");
  if (field.type === "tel" && !/^[+\d(). -]{5,40}$/.test(value)) return fail("请填写有效的电话号码");
  if (field.type === "url" && !isPublicHttpUrl(value)) return fail("请填写以 https:// 或 http:// 开头的网址");
  if (field.type === "number" && (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(Number(value)))) return fail("请填写有效数字");
  if (field.type === "date" && !validDate(value)) return fail("请填写有效日期");
  return value;
}

export function validateApplication(body: unknown, settings: Settings) {
  const modern = !!body && typeof body === "object" && !Array.isArray(body) && Object.prototype.hasOwnProperty.call(body, "answers");
  let rawAnswers: Record<string, FormAnswer | undefined>;
  if (modern) {
    const data = envelope.parse(body);
    if (data.formVersion !== settings.registration.version) throw new ApiError("报名表已更新，请刷新页面后按最新问题重新填写。", 409);
    rawAnswers = data.answers;
  } else {
    if (settings.registration.version !== 1) throw new ApiError("报名表已更新，请刷新页面后按最新问题重新填写。", 409);
    const { consent: _consent, website: _website, ...answers } = legacyEnvelope.parse(body);
    rawAnswers = answers;
  }
  const fields = settings.registration.fields.filter((field) => field.enabled);
  const allowed = new Set(fields.map((field) => field.id));
  if (modern && Object.keys(rawAnswers).some((id) => !allowed.has(id))) throw new ApiError("报名表包含已移除或隐藏的问题，请刷新页面后重新填写。", 409);
  const answers: ApplicationAnswerSnapshot[] = fields.map((field) => ({
    id: field.id, label: field.label, type: field.type, value: validateAnswer(field, rawAnswers[field.id], settings),
    options: ["select", "radio", "checkboxes"].includes(field.type) ? structuredClone(fieldOptions(field, settings)) : [],
  }));
  const formSnapshot: ApplicationFormSnapshot = {
    title: settings.registration.formTitle, version: settings.registration.version, consentText: settings.registration.consentText,
    fields: fields.map((field) => ({ ...structuredClone(field), options: structuredClone(fieldOptions(field, settings)) })),
  };
  const answer = (id: string) => answers.find((item) => item.id === id)?.value;
  const text = (id: string) => {
    const value = answer(id);
    return typeof value === "string" ? value : Array.isArray(value) ? value.join("；") : typeof value === "boolean" ? value ? "是" : "否" : "";
  };
  const directionValues = answer("directions");
  return {
    name: text("name"), contact: text("contact").toLowerCase(), college: text("college"), grade: text("grade"),
    directions: Array.isArray(directionValues) ? directionValues : typeof directionValues === "string" && directionValues ? [directionValues] : [],
    experience: text("experience"), availability: text("availability"), portfolio: text("portfolio"),
    answers, formSnapshot, formVersion: String(settings.registration.version),
  };
}

function parseStoredJson(value: unknown, fallback: any) {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function applicationView(row: any): Application {
  const { answers_json, form_snapshot, form_version, ...record } = row;
  const answers = parseStoredJson(answers_json, []);
  const snapshot = parseStoredJson(form_snapshot, null);
  return {
    ...record, directions: parseStoredJson(row.directions, []), answers: Array.isArray(answers) ? answers : [],
    formVersion: typeof form_version === "string" ? form_version : "legacy",
    formSnapshot: snapshot && Array.isArray(snapshot.fields) ? snapshot : null,
  };
}
