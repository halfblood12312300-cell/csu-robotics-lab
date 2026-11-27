import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TestDatabase } from "./helpers.ts";
import { defaultSettings, normalizeSettings, isExternalQuestionnaireUrl } from "../../app/site-config.ts";
import { settingsSchema } from "../../app/settings-schema.ts";

const migration = readFileSync(new URL("../migrations/0004_wjx_and_performance.sql", import.meta.url), "utf8");
const link = "https://www.wjx.top/vm/rbkF28c.aspx#";
test("Wenjuanxing public link accepted, arbitrary and lookalike hosts rejected", () => {
  assert.equal(isExternalQuestionnaireUrl(link), true);
  assert.equal(isExternalQuestionnaireUrl("https://www.wjx.cn/vm/test.aspx"), true);
  for (const bad of ["http://www.wjx.top/vm/test.aspx", "https://www.wjx.top.example.com/vm/test.aspx", "https://www.wjx.top@evil.example/vm/test.aspx", "https://www.wjx.top/manage", "javascript:alert(1)"]) assert.equal(isExternalQuestionnaireUrl(bad), false);
});
test("one-time migration preserves existing customized content and registration opening state", () => {
  const database = new TestDatabase();
  try {
    const prior = structuredClone(defaultSettings);
    prior.revision=7; prior.registrationOpen=false; prior.intro="自定义简介";
    prior.home.projects.items=prior.home.projects.items.filter(item=>item.id!=="robot-performance");
    prior.home.projects.items[0].title="自定义项目名称"; prior.home.projects.columns=2;
    database.sqlite.prepare("INSERT INTO settings (id,value) VALUES (?,?)").run("site",JSON.stringify(prior));
    database.sqlite.exec(migration);
    const row=database.sqlite.prepare("SELECT value FROM settings WHERE id='site'").get() as {value:string};
    const result=normalizeSettings(JSON.parse(row.value));
    assert.equal(result.registration.mode,"external");
    assert.equal(result.registration.externalUrl,link);
    assert.equal(result.registrationOpen,false);
    assert.equal(result.intro,"自定义简介");
    assert.equal(result.revision,8);
    assert.equal(result.home.projects.items[0].title,"自定义项目名称");
    assert.equal(result.home.projects.items.filter(item=>item.id==="robot-performance").length,1);
    assert.ok(settingsSchema.safeParse(result).success);
  } finally { database.close(); }
});
test("migration initializes external link when no saved settings exist",()=>{
  const database=new TestDatabase();
  try {
    database.sqlite.exec(migration);
    const row=database.sqlite.prepare("SELECT value FROM settings WHERE id='site'").get() as {value:string};
    const result=normalizeSettings(JSON.parse(row.value));
    assert.equal(result.registration.externalUrl,link);
    assert.equal(result.registrationOpen,false);
    assert.equal(result.home.projects.items.length,3);
    assert.ok(settingsSchema.safeParse(result).success);
  } finally { database.close(); }
});
