import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { csvCell, encodeRegistrationCsv, applicationCsvRows, applicationAnswers, answerText } from "../../app/admin/registration-export.ts";
import worker from "../index.ts";
import { issueSession } from "../auth.ts";
import { defaultSettings, newFormField, type Settings } from "../../app/site-config.ts";
import { fixture, req, apiOrigin } from "./helpers.ts";

async function readSettings(env: any): Promise<Settings> {
  return (await (await worker.fetch(req("data"), env)).json() as any).settings;
}

async function updateSettings(env: any, token: string, patch: any) {
  const current = await readSettings(env);
  const response = await worker.fetch(req("admin/settings", { token, body: { revision: current.revision, ...patch } }), env);
  assert.equal(response.status, 200, await response.clone().text());
  return (await response.json() as any).settings as Settings;
}

test("form snapshot migration preserves previous submissions and contact uniqueness", () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(readFileSync(new URL("../migrations/0000_strange_ma_gnuci.sql", import.meta.url), "utf8"));
    const old = ["old-record", "旧报名", "数学学院", "本科二年级", "old@example.com", '["agent"]', "历史介绍", "每周3–6小时", "", "待查看", "原备注", "2026-11-26T00:00:00.000Z"];
    database.prepare("INSERT INTO applications VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(...old);
    database.exec(readFileSync(new URL("../migrations/0003_application_form.sql", import.meta.url), "utf8"));
    const row = database.prepare("SELECT * FROM applications WHERE id='old-record'").get() as any;
    assert.equal(row.name, "旧报名");
    assert.equal(row.note, "原备注");
    assert.equal(row.directions, '["agent"]');
    assert.equal(row.answers_json, "[]");
    assert.equal(row.form_snapshot, "{}");
    assert.equal(row.form_version, "legacy");
    assert.throws(() => database.prepare("INSERT INTO applications (id,name,college,grade,contact,directions,experience,availability,portfolio,status,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run("another-record", ...old.slice(1)), /UNIQUE/);
  } finally { database.close(); }
});

test("CSV export keeps custom labels and answers inert, including whitespace-prefixed formulas", () => {
  for (const value of ["=HYPERLINK(\"https://example.com\")", "  =1+1", "\ufeff+1", "\tformula", "\rformula", "@SUM(1)", "-10", "+2"]) {
    assert.ok(csvCell(value).startsWith('"\''), value);
  }
  assert.equal(csvCell('实验 "A"'), '"实验 ""A"""');
  assert.equal(csvCell(["甲", "乙"]), '"甲；乙"');
  assert.equal(encodeRegistrationCsv([["题目", "答案"], ["\n=危险标题", "安全内容"]]), '\ufeff"题目","答案"\r\n"\'\n=危险标题","安全内容"');
});

test("legacy settings gain defaults, partial saves preserve nested content, and stale editor writes are rejected", async () => {
  const f = await fixture();
  try {
    f.database.sqlite.prepare("INSERT INTO settings (id,value) VALUES (?,?)").run("site", JSON.stringify({ intro: "原有实验室介绍", location: "原有房间" }));
    const { token } = await issueSession(f.env);
    const original = await readSettings(f.env);
    assert.equal(original.intro, "原有实验室介绍");
    assert.equal(original.revision, 0);
    assert.equal(original.registration.version, 1);
    assert.equal(original.home.research.directions.length, 4);
    const saved = await updateSettings(f.env, token, { site: { name: "可维护的实验室" }, home: { hero: { title: "新首页标题" } } });
    assert.equal(saved.revision, 1);
    assert.equal(saved.registration.version, 1);
    assert.equal(saved.site.name, "可维护的实验室");
    assert.equal(saved.home.hero.title, "新首页标题");
    assert.equal(saved.home.hero.primary.href, defaultSettings.home.hero.primary.href);
    assert.equal(saved.location, "原有房间");
    const legacySave = await worker.fetch(req("admin/settings", { token, body: { intro: "旧客户端更新简介" } }), f.env);
    assert.equal(legacySave.status, 200);
    assert.equal((await readSettings(f.env)).site.name, "可维护的实验室");
    assert.equal((await readSettings(f.env)).revision, 2);
    assert.equal((await worker.fetch(req("admin/settings", { token, body: { revision: 1, site: { name: "过期编辑" } } }), f.env)).status, 409);
    assert.equal((await worker.fetch(req("admin/settings", { token, body: { site: { name: "没有版本" } } }), f.env)).status, 409);
    assert.equal((await readSettings(f.env)).site.name, "可维护的实验室");
    const anonymous = req("admin/settings", { raw: new Uint8Array([1, 2, 3]) });
    assert.equal((await worker.fetch(anonymous, f.env)).status, 401);
    assert.equal(anonymous.bodyUsed, false);
  } finally { f.database.close(); }
});

test("settings revisions compare atomically when two editor saves race", async () => {
  const f = await fixture();
  try {
    const { token } = await issueSession(f.env);
    for (let round = 0; round < 2; round++) {
      const current = await readSettings(f.env);
      const responses = await Promise.all(["一号编辑", "二号编辑"].map((name) =>
        worker.fetch(req("admin/settings", { token, body: { revision: current.revision, site: { name } } }), f.env),
      ));
      assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
      assert.equal((await readSettings(f.env)).revision, current.revision + 1);
    }
  } finally { f.database.close(); }
});

test("settings reject invalid links, duplicate identifiers and unusable core form fields without writing", async () => {
  const f = await fixture();
  try {
    const { token } = await issueSession(f.env);
    const patches = [
      { site: { navLinks: [{ id: "bad", label: "跳转", href: "javascript:alert(1)", enabled: true }] } },
      { home: { hero: { primary: { href: "//evil.example" } } } },
      { site: { logo: "https://user:password@example.com/image.jpg" } },
      { site: { logo: "/media/%2e%2e/private.png" } },
      { home: { platforms: { items: [{ ...defaultSettings.home.platforms.items[0], image: "data:image/svg+xml,<svg/>" }] } } },
      { home: { modules: defaultSettings.home.modules.map((module) => ({ ...module, id: "hero" })) } },
      { registration: { fields: defaultSettings.registration.fields.filter((field) => field.id !== "contact") } },
      { registration: { fields: defaultSettings.registration.fields.map((field) => field.id === "name" ? { ...field, enabled: false } : field) } },
      { registration: { fields: defaultSettings.registration.fields.map((field) => field.id === "contact" ? { ...field, type: "checkbox" } : field) } },
      { registration: { fields: [...defaultSettings.registration.fields, defaultSettings.registration.fields[0]] } },
      { registration: { fields: [...defaultSettings.registration.fields, { ...newFormField("choice", "空选项", "select"), required: true }] } },
      { theme: { accentColor: "red; background:url(javascript:alert(1))" } },
      { extraUnsupportedSetting: "no" },
    ];
    for (const patch of patches) {
      const response = await worker.fetch(req("admin/settings", { token, body: { revision: 0, ...patch } }), f.env);
      assert.equal(response.status, 400, JSON.stringify(patch));
    }
    assert.equal((f.database.sqlite.prepare("SELECT COUNT(*) AS n FROM settings").get() as any).n, 0);
  } finally { f.database.close(); }
});

test("form versions follow question and research-option changes, but not unrelated home edits", async () => {
  const f = await fixture();
  try {
    const { token } = await issueSession(f.env);
    let saved = await updateSettings(f.env, token, { registrationOpen: true });
    assert.equal(saved.registration.version, 1);
    saved = await updateSettings(f.env, token, { home: { hero: { title: "新的首页标题" } } });
    assert.equal(saved.registration.version, 1);
    saved = await updateSettings(f.env, token, { registration: { fields: saved.registration.fields.map((field) => field.id === "college" ? { ...field, label: "学院、专业与班级" } : field) } });
    assert.equal(saved.registration.version, 2);
    saved = await updateSettings(f.env, token, { home: { research: { directions: saved.home.research.directions.map((direction) => direction.id === "agent" ? { ...direction, title: "机器人智能体" } : direction) } } });
    assert.equal(saved.registration.version, 3);
    saved = await updateSettings(f.env, token, { home: { research: { directions: saved.home.research.directions.map((direction) => direction.id === "agent" ? { ...direction, detail: { ...direction.detail, introduction: "展示介绍变化" } } : direction) } } });
    assert.equal(saved.registration.version, 3);
    saved = await updateSettings(f.env, token, { registration: { version: 999 } });
    assert.equal(saved.registration.version, 3, "client cannot choose the form version");
    const outdated = await worker.fetch(req("apply", { body: { answers: {}, formVersion: 1, consent: true, website: "" } }), f.env);
    assert.equal(outdated.status, 409);
    const legacy = await worker.fetch(req("apply", { body: { name: "旧页面", contact: "old@example.com", consent: true, website: "" } }), f.env);
    assert.equal(legacy.status, 409);
    assert.equal((f.database.sqlite.prepare("SELECT COUNT(*) AS n FROM applications").get() as any).n, 0);
  } finally { f.database.close(); }
});

test("custom form answers and their original labels, choices and consent survive later form edits", async () => {
  const f = await fixture();
  const { BUCKET: _bucket, MEDIA_SIGNING_SECRET: _signing, ...env } = f.env;
  try {
    const { token } = await issueSession(env);
    const fields = [
      defaultSettings.registration.fields.find((field) => field.id === "name")!,
      { ...defaultSettings.registration.fields.find((field) => field.id === "contact")!, type: "email" as const },
      { ...newFormField("project", "项目经历", "textarea"), required: true, minLength: 10 },
      { ...newFormField("level", "熟悉方向", "select"), required: true, options: [{ value: "robot", label: "机器人系统" }, { value: "vision", label: "计算机视觉" }] },
      { ...newFormField("skills", "技术能力", "checkboxes"), required: true, options: [{ value: "cpp", label: "C++" }, { value: "python", label: "Python" }] },
      newFormField("hours", "可参与时长", "number"),
      { ...newFormField("availableDate", "可参加日期", "date"), required: true },
      newFormField("websiteLink", "作品地址", "url"),
      { ...newFormField("confirm", "愿意遵守实验规范", "checkbox"), required: true },
      { ...newFormField("hidden", "已隐藏的问题"), enabled: false },
    ];
    let settings = await updateSettings(env, token, { registrationOpen: true, registration: { formTitle: "项目招募", consentText: "仅用于本次项目报名联系。", fields } });
    const values = { name: "测试同学", contact: "Student@example.com", project: "参与过十次机器人实验并记录实验结果。", level: "robot", skills: ["cpp", "python"], hours: "0", availableDate: "2028-02-29", websiteLink: "https://example.com/portfolio", confirm: true };
    const submitted = await worker.fetch(req("apply", { body: { answers: values, formVersion: settings.registration.version, consent: true, website: "" } }), env);
    assert.equal(submitted.status, 201, await submitted.clone().text());
    let admin = await (await worker.fetch(req("admin", { token }), env)).json() as any;
    const before = admin.applications[0];
    assert.equal(before.contact, "student@example.com");
    assert.equal(before.formSnapshot.title, "项目招募");
    assert.equal(before.formSnapshot.consentText, "仅用于本次项目报名联系。");
    assert.equal(before.answers.find((answer: any) => answer.id === "project").label, "项目经历");
    assert.equal(answerText(before.answers.find((answer: any) => answer.id === "level")), "机器人系统");
    assert.equal(before.answers.some((answer: any) => answer.id === "hidden"), false);
    assert.equal((await (await worker.fetch(req("data"), env)).json() as any).applications, undefined);
    settings = await updateSettings(env, token, { registration: { fields: fields.filter((field) => field.id !== "level").map((field) => field.id === "project" ? { ...field, label: "项目摘要" } : field) } });
    admin = await (await worker.fetch(req("admin", { token }), env)).json() as any;
    assert.deepEqual(admin.applications[0], before, "editing the form never relabels a historical submission");
    const { level: _removed, ...newValues } = values;
    const next = await worker.fetch(req("apply", { body: { answers: { ...newValues, contact: "second@example.com" }, formVersion: settings.registration.version, consent: true, website: "" } }), env);
    assert.equal(next.status, 201);
    const all = (await (await worker.fetch(req("admin", { token }), env)).json() as any).applications;
    const csvRows = applicationCsvRows(all);
    assert.ok(csvRows[0].includes("项目经历"));
    assert.ok(csvRows[0].includes("项目摘要"));
    assert.ok(encodeRegistrationCsv(csvRows).includes("机器人系统"));
    assert.equal((await worker.fetch(req("apply", { body: { answers: { ...newValues, contact: "SECOND@example.com" }, formVersion: settings.registration.version, consent: true, website: "" } }), env)).status, 409, "contact remains case-insensitively unique");
    assert.equal(f.bucket.writes, 0);
  } finally { f.database.close(); }
});

test("dynamic form validation rejects invalid field types, choices, formats, hidden values and missing consent", async () => {
  const f = await fixture();
  try {
    const { token } = await issueSession(f.env);
    const settings = await updateSettings(f.env, token, { registrationOpen: true, registration: { fields: [
      defaultSettings.registration.fields.find((field) => field.id === "name")!,
      { ...defaultSettings.registration.fields.find((field) => field.id === "contact")!, type: "email" },
      { ...newFormField("choice", "选择方向", "checkboxes"), required: true, options: [{ value: "one", label: "方向一" }] },
      newFormField("date", "日期", "date"), newFormField("number", "数量", "number"), newFormField("url", "网址", "url"),
      { ...newFormField("agree", "规范", "checkbox"), required: true },
      { ...newFormField("hidden", "不收集", "text"), enabled: false },
    ] } });
    const valid = { name: "测试同学", contact: "test@example.com", choice: ["one"], date: "2026-11-26", number: "2", url: "https://example.com", agree: true };
    const patches = [
      { name: "" }, { contact: "not-an-email" }, { choice: ["unknown"] }, { choice: ["one", "one"] },
      { choice: "one" }, { date: "2026-02-30" }, { number: "Infinity" }, { url: "javascript:alert(1)" },
      { agree: false }, { agree: "true" },
    ];
    let counter = 1;
    for (const patch of patches) {
      const response = await worker.fetch(req("apply", { body: { answers: { ...valid, ...patch }, formVersion: settings.registration.version, consent: true, website: "" }, headers: { "cf-connecting-ip": `192.0.2.${counter++}` } }), f.env);
      assert.equal(response.status, 400, JSON.stringify(patch));
    }
    for (const answers of [{ ...valid, hidden: "secret" }, { ...valid, invented: "value" }]) {
      assert.equal((await worker.fetch(req("apply", { body: { answers, formVersion: settings.registration.version, consent: true, website: "" } }), f.env)).status, 409);
    }
    assert.equal((await worker.fetch(req("apply", { body: { answers: valid, formVersion: settings.registration.version, consent: false, website: "" } }), f.env)).status, 400);
    assert.equal((f.database.sqlite.prepare("SELECT COUNT(*) AS n FROM applications").get() as any).n, 0);
  } finally { f.database.close(); }
});

test("enabled home media becomes public only while its visible section references it", async () => {
  const f = await fixture();
  try {
    const { token } = await issueSession(f.env);
    f.bucket.objects.set("platform.jpg", { bytes: new Uint8Array([255, 216, 255, 217]), mime: "image/jpeg" });
    let settings = await updateSettings(f.env, token, { home: { platforms: { items: [{ ...defaultSettings.home.platforms.items[0], image: apiOrigin + "/api/media/platform.jpg?preview_expires=123&preview_signature=temporary" }] } } });
    assert.equal(settings.home.platforms.items[0].image, "/api/media/platform.jpg");
    assert.equal((await worker.fetch(req("media/platform.jpg"), f.env)).status, 200);
    settings = await updateSettings(f.env, token, { home: { modules: settings.home.modules.map((module) => module.id === "platforms" ? { ...module, enabled: false } : module) } });
    assert.equal((await worker.fetch(req("media/platform.jpg"), f.env)).status, 404);
    await updateSettings(f.env, token, { site: { logo: "/api/media/platform.jpg" } });
    assert.equal((await worker.fetch(req("media/platform.jpg"), f.env)).status, 200);
    await updateSettings(f.env, token, { site: { logo: "" } });
    assert.equal((await worker.fetch(req("media/platform.jpg"), f.env)).status, 404);
  } finally { f.database.close(); }
});

test("legacy application rows remain readable and exportable alongside custom forms", () => {
  const record: any = { id: "legacy", name: "老同学", college: "旧学院", grade: "旧年级", contact: "old@example.com", directions: ["agent"], experience: "旧介绍", availability: "旧时间", portfolio: "", status: "待查看", note: "", created_at: "2026-11-25", answers: [], formVersion: "legacy" };
  assert.equal(answerText(applicationAnswers(record).find((answer) => answer.id === "directions")!), "专用智能体开发");
  const rows = applicationCsvRows([record]);
  assert.ok(rows[0].includes("学院与专业"));
  assert.ok(rows[1].includes("旧学院"));
  assert.ok(rows[1].includes("专用智能体开发"));
});
