import type { Application, ApplicationAnswerSnapshot } from "./shared";

const legacyDirections = [
  { value: "agent", label: "专用智能体开发" }, { value: "model", label: "开源语言模型微调" },
  { value: "system", label: "机器人功能模块" }, { value: "vision", label: "计算机视觉" },
];

/** Old submissions retain their original field meanings after the form changes. */
export function applicationAnswers(record: Application): ApplicationAnswerSnapshot[] {
  if (record.answers?.length) return record.answers;
  return [
    { id: "name", label: "姓名", type: "text", value: record.name, options: [] },
    { id: "college", label: "学院与专业", type: "text", value: record.college, options: [] },
    { id: "grade", label: "年级", type: "text", value: record.grade, options: [] },
    { id: "contact", label: "联系方式", type: "text", value: record.contact, options: [] },
    { id: "directions", label: "感兴趣的研究方向", type: "checkboxes", value: record.directions, options: legacyDirections },
    { id: "experience", label: "简单介绍一下自己", type: "textarea", value: record.experience, options: [] },
    { id: "availability", label: "每周可投入时间", type: "text", value: record.availability, options: [] },
    { id: "portfolio", label: "作品或个人主页", type: "url", value: record.portfolio, options: [] },
  ];
}

export function answerText(answer: ApplicationAnswerSnapshot): string {
  if (typeof answer.value === "boolean") return answer.value ? "已确认" : "未勾选";
  const text = (value: string) => answer.options.find((option) => option.value === value)?.label ?? value;
  return Array.isArray(answer.value) ? answer.value.map(text).join("；") : text(answer.value);
}

export function applicationCsvRows(records: Application[]): unknown[][] {
  const columns = new Map<string, { id: string; label: string; type: string }>();
  const key = (answer: ApplicationAnswerSnapshot) => JSON.stringify([answer.id, answer.label, answer.type]);
  const values = records.map((record) => {
    const result = new Map<string, string>();
    for (const answer of applicationAnswers(record)) {
      columns.set(key(answer), { id: answer.id, label: answer.label, type: answer.type });
      result.set(key(answer), answerText(answer));
    }
    return result;
  });
  const ordered = [...columns.entries()];
  const labels = new Map<string, number>();
  for (const [, column] of ordered) labels.set(column.label, (labels.get(column.label) ?? 0) + 1);
  return [
    [...ordered.map(([, column]) => labels.get(column.label)! > 1 ? `${column.label}（${column.id}/${column.type}）` : column.label), "处理状态", "管理员备注", "报名时间", "表单版本"],
    ...records.map((record, index) => [...ordered.map(([id]) => values[index].get(id) ?? ""), record.status, record.note, record.created_at, record.formVersion ?? "legacy"]),
  ];
}

/** Keep exported headings and answers as text when opened by spreadsheet apps. */
export function csvCell(value: unknown): string {
  let text = Array.isArray(value) ? value.map(String).join("；") : String(value ?? "");
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function encodeRegistrationCsv(rows: readonly (readonly unknown[])[]): string {
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
