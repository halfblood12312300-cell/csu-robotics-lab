import { useState } from "react";
import { Plus } from "lucide-react";
import { fieldTypeLabels, newFormField, type FieldType, type FormField } from "../../site-config";
import { ItemControls, ItemDetails, NumberField, SelectField, SettingPanel, TextField, TextFields, ToggleField, moveItem } from "./settings-controls";
import { LinkEditor, createId, type SettingsEditorProps } from "./settings-editors";

export function RegistrationPageEditor({ value: s, onChange: setS }: SettingsEditorProps) {
  const r = s.registration;
  const update = (registration: typeof r) => setS((prev) => ({ ...prev, registration }));
  return <>
    <SettingPanel title="报名通道 · 腾讯问卷" description="腾讯问卷的题目、开放时间和报名名单在腾讯问卷管理；本站只展示公开填写入口。">
      <SelectField label="报名方式" value={r.mode} onChange={mode => update({ ...r, mode })} options={[{ value: "internal", label: "本站原生报名（需要后端连接）" }, { value: "external", label: "腾讯问卷（国内访问）" }]} />
      <TextField label="腾讯问卷公开填写链接" value={r.externalUrl} type="url" maxLength={2000} placeholder="https://wj.qq.com/s2/..." onChange={externalUrl => update({ ...r, externalUrl })} />
      <TextField label="问卷按钮文字" value={r.externalButton} maxLength={250} onChange={externalButton => update({ ...r, externalButton })} />
      <TextField label="问卷填写提示" value={r.externalNote} multiline maxLength={4000} onChange={externalNote => update({ ...r, externalNote })} />
      <p className="editor-note">保存后，无法访问实时接口的访客将在 GitHub Pages 下次同步后看到更新。关闭报名时也需要到腾讯问卷停止收集，已分享的外部链接不受本站开关控制。</p>
    </SettingPanel>
    <SettingPanel title="报名开放与联系信息" description="保存后会立即影响新报名。关闭报名会保留介绍和已收到的报名记录。">
      <ToggleField label="开放在线报名" value={s.registrationOpen} onChange={(registrationOpen) => setS((prev) => ({ ...prev, registrationOpen }))} help={s.registrationOpen ? "保存后接收新报名。" : "保存后停止接收新报名。"} />
      <div className="editor-grid"><TextField label="报名截止日期" value={s.deadline} type="date" help="留空表示不设截止日期；截止至所选日期北京时间 23:59。" onChange={(deadline) => setS((prev) => ({ ...prev, deadline }))} /><TextField label="咨询联系方式" value={s.contact} maxLength={200} onChange={(contact) => setS((prev) => ({ ...prev, contact }))} /></div>
      <TextField label="实验室地点" value={s.location} maxLength={250} onChange={(location) => setS((prev) => ({ ...prev, location }))} />
    </SettingPanel>
    <SettingPanel title="报名页面介绍">
      <SelectField label="报名页面布局" value={r.layout} onChange={(layout) => update({ ...r, layout })} options={[{ value: "split", label: "介绍与表单左右排列" }, { value: "centered", label: "居中上下排列" }]} />
      <TextFields value={r} onChange={update} fields={[
        { key: "eyebrow", label: "页面标题上方的小字", maxLength: 250 }, { key: "title", label: "报名页面大标题", multiline: true, maxLength: 250 },
        { key: "intro", label: "页面引言", multiline: true, maxLength: 4000 }, { key: "infoTitle", label: "招新介绍标题", maxLength: 250 },
        { key: "infoBody", label: "招新介绍正文", multiline: true, maxLength: 4000, help: "空行用于分段。" },
        { key: "directionsTitle", label: "可参与方向的标题", maxLength: 250 }, { key: "directionsNote", label: "研究方向下方补充说明", multiline: true, maxLength: 4000 },
      ]} />
    </SettingPanel>
    <SettingPanel title="表单标题与提示">
      <TextFields value={r} onChange={update} fields={[
        { key: "formEyebrow", label: "表单标题上方的小字", maxLength: 250 }, { key: "formTitle", label: "表单标题", maxLength: 250 },
        { key: "formDescription", label: "开放报名时的填写说明", multiline: true, maxLength: 4000 }, { key: "closedMessage", label: "报名关闭时的提示", multiline: true, maxLength: 4000 },
      ]} />
      <div className="editor-grid"><TextFields value={r} onChange={update} fields={[{ key: "submitLabel", label: "提交按钮文字", maxLength: 100 }, { key: "closedButtonLabel", label: "关闭时的按钮文字", maxLength: 100 }]} /></div>
      <TextFields value={r} onChange={update} fields={[{ key: "consentText", label: "提交前确认说明", multiline: true, maxLength: 2000 }, { key: "privacyNote", label: "表单底部隐私说明", multiline: true, maxLength: 4000 }]} />
    </SettingPanel>
    <SettingPanel title="报名成功页面">
      <TextFields value={r} onChange={update} fields={[{ key: "successTitle", label: "成功提示标题", maxLength: 250 }, { key: "successMessage", label: "成功提示内容", multiline: true, maxLength: 4000 }]} />
      <LinkEditor value={r.successLink} onChange={(successLink) => update({ ...r, successLink })} />
    </SettingPanel>
  </>;
}

const choiceTypes: FieldType[] = ["select", "radio", "checkboxes"];
const textTypes: FieldType[] = ["text", "textarea", "email", "tel", "url"];
const allTypes = (Object.entries(fieldTypeLabels) as [FieldType, string][]).map(([value, label]) => ({ value, label }));

export function RegistrationFieldsEditor({ value: s, onChange: setS }: SettingsEditorProps) {
  const [newType, setNewType] = useState<FieldType>("text");
  const [opened, setOpened] = useState("");
  const fields = s.registration.fields;
  const update = (next: FormField[]) => setS((prev) => ({ ...prev, registration: { ...prev.registration, fields: next } }));
  const updateOne = (id: string, next: FormField) => update(fields.map((field) => field.id === id ? next : field));
  function add() {
    const field = newFormField(createId("question"), "新问题", newType);
    if (choiceTypes.includes(newType)) field.options = [{ value: createId("option"), label: "选项 1" }];
    update([...fields, field]); setOpened(field.id);
  }
  return <SettingPanel title="报名表字段" description="修改问题文字、提示、类型和选项，调整顺序、必填与显示状态。新提交使用保存后的表单；已收到的报名记录保留原问题与答案。">
    <p className="editor-note">姓名和联系方式用于识别报名记录与后续联系，保留显示且必填；它们的标题、提示、说明与排列仍可修改。其他问题可以自由新增、隐藏或删除。</p>
    <div className="editor-grid"><SelectField label="新增问题类型" value={newType} options={allTypes} onChange={setNewType} /><div className="cms-actions"><button type="button" className="button small outline" disabled={fields.length >= 40} onClick={add}><Plus size={15} />添加问题</button><span className="muted">{fields.length} / 40 项</span></div></div>
    {fields.map((field, index) => {
      const core = field.id === "name" || field.id === "contact";
      const allowedTypes = field.id === "name" ? allTypes.filter((type) => type.value === "text") : field.id === "contact" ? allTypes.filter((type) => ["text", "email", "tel"].includes(type.value)) : allTypes;
      const change = (next: FormField) => updateOne(field.id, next);
      return <ItemDetails key={field.id} title={field.label} open={opened === field.id} subtitle={`${fieldTypeLabels[field.type]} · ${field.enabled ? (field.required ? "必填" : "选填") : "已隐藏"}${core ? " · 基础字段" : ""}`} actions={<ItemControls label={field.label || "问题"} index={index} count={fields.length} removable={!core} onMove={(offset) => update(moveItem(fields, index, offset))} onRemove={() => update(fields.filter((value) => value.id !== field.id))} />}>
        <div className="editor-grid"><ToggleField label="显示这个问题" value={field.enabled} disabled={core} onChange={(enabled) => change({ ...field, enabled })} /><ToggleField label="设为必填" value={field.required} disabled={core} onChange={(required) => change({ ...field, required })} /></div>
        <TextField label="问题标题" value={field.label} maxLength={120} onChange={(label) => change({ ...field, label })} />
        <div className="editor-grid"><SelectField label="填写类型" value={field.type} options={allowedTypes} onChange={(type) => change({ ...field, type, minLength: core ? field.minLength : 0, maxLength: core ? field.maxLength : (type === "textarea" ? 2000 : type === "url" ? 2000 : 200), optionsSource: choiceTypes.includes(type) ? field.optionsSource : "custom", options: choiceTypes.includes(type) && !field.options.length ? [{ value: createId("option"), label: "选项 1" }] : field.options })} />
          <SelectField label="桌面端占用宽度" value={field.width} options={[{ value: "full", label: "整行" }, { value: "half", label: "半行" }]} onChange={(width) => change({ ...field, width })} /></div>
        <TextFields value={field} onChange={change} fields={[{ key: "placeholder", label: "输入框提示文字", maxLength: 500 }, { key: "help", label: "问题补充说明", multiline: true, maxLength: 1000 }]} />
        {textTypes.includes(field.type) && <div className="editor-grid"><NumberField label="最少填写字数" value={field.minLength} min={0} max={core ? (field.id === "name" ? 40 : 100) : 4000} help="选填问题在留空时不受最少字数限制。" onChange={(minLength) => change({ ...field, minLength })} /><NumberField label="最多填写字数" value={field.maxLength} min={1} max={core ? (field.id === "name" ? 40 : 100) : 4000} onChange={(maxLength) => change({ ...field, maxLength })} /></div>}
        {choiceTypes.includes(field.type) && <>
          <SelectField label="选项来源" value={field.optionsSource} options={[{ value: "custom", label: "自定义选项" }, { value: "research", label: "使用当前启用的研究方向" }]} onChange={(optionsSource) => change({ ...field, optionsSource })} />
          {field.optionsSource === "research" ? <div className="editor-note">选项会随“研究方向”中的名称、顺序与显示状态更新。当前可选：{s.home.research.directions.filter((item) => item.enabled).map((item) => item.title).join("、") || "暂无启用方向"}。</div> : <>
            {field.options.map((option, optionIndex) => <div className="editor-option" key={option.value}><TextField label={`选项 ${optionIndex + 1}`} value={option.label} maxLength={120} onChange={(label) => change({ ...field, options: field.options.map((item, n) => n === optionIndex ? { ...item, label } : item) })} /><ItemControls label={option.label || "选项"} index={optionIndex} count={field.options.length} onMove={(offset) => change({ ...field, options: moveItem(field.options, optionIndex, offset) })} onRemove={() => change({ ...field, options: field.options.filter((_, n) => n !== optionIndex) })} /></div>)}
            <button type="button" className="button small outline editor-list-add" disabled={field.options.length >= 60} onClick={() => change({ ...field, options: [...field.options, { value: createId("option"), label: `选项 ${field.options.length + 1}` }] })}><Plus size={15} />添加选项</button>
          </>}
        </>}
      </ItemDetails>;
    })}
    <div className="cms-actions"><button type="button" className="button small outline editor-list-add" disabled={fields.length >= 40} onClick={add}><Plus size={15} />再添加一个{fieldTypeLabels[newType]}问题</button></div>
  </SettingPanel>;
}
