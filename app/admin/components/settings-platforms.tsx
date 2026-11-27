import { Plus } from "lucide-react";
import type { PlatformItem } from "../../site-config";
import { ItemControls, ItemDetails, MediaField, SelectField, SettingPanel, TextField, TextFields, ToggleField, moveItem } from "./settings-controls";
import { HeadingEditor, LinkEditor, createId, type SettingsEditorProps } from "./settings-editors";

export function PlatformSettingsEditor({ value: s, onChange: setS, pick }: SettingsEditorProps) {
  const platforms = s.home.projects;
  const updateItems = (items: PlatformItem[]) => setS((prev) => ({ ...prev, home: { ...prev.home, platforms: { ...prev.home.projects, items } } }));
  return <>
    <SettingPanel title="拟开展项目模块">
      <HeadingEditor value={platforms.heading} onChange={(heading) => setS((prev) => ({ ...prev, home: { ...prev.home, platforms: { ...prev.home.projects, heading } } }))} />
      <SelectField label="桌面端每行项目卡片数" value={String(platforms.columns)} onChange={(columns) => setS((prev) => ({ ...prev, home: { ...prev.home, platforms: { ...prev.home.projects, columns: Number(columns) as 1 | 2 | 3 } } }))} options={[{ value: "1", label: "1 列" }, { value: "2", label: "2 列" }, { value: "3", label: "3 列" }]} />
    </SettingPanel>
    <SettingPanel title="拟开展项目卡片" description="可新增项目、编辑简介、添加图片、排序和隐藏；项目处于规划阶段，后续按实际进展修改。">
      {platforms.items.map((item, index) => {
        const update = (next: PlatformItem) => updateItems(platforms.items.map((value) => value.id === item.id ? next : value));
        return <ItemDetails key={item.id} title={item.title} subtitle={item.enabled ? `${item.count}${item.unit} · ${item.kind}` : "已隐藏"} actions={<ItemControls label={item.title || "平台卡片"} index={index} count={platforms.items.length} onMove={(offset) => updateItems(moveItem(platforms.items, index, offset))} onRemove={() => updateItems(platforms.items.filter((value) => value.id !== item.id))} />}>
          <ToggleField label="显示这个项目" value={item.enabled} onChange={(enabled) => update({ ...item, enabled })} />
          <div className="editor-grid"><TextFields value={item} onChange={update} fields={[{ key: "kind", label: "项目分类 / 状态", maxLength: 250 }, { key: "title", label: "项目名称", maxLength: 250 }, { key: "subtitle", label: "副标题", maxLength: 250 }, { key: "count", label: "数量", maxLength: 60 }, { key: "unit", label: "数量单位", maxLength: 60 }]} /></div>
          <TextField label="项目简介" value={item.description} multiline maxLength={4000} onChange={(description) => update({ ...item, description })} />
          <MediaField label="项目展示图片" value={item.image} onChange={(image) => update({ ...item, image })} onPick={() => pick("image", (image) => setS((prev) => ({ ...prev, home: { ...prev.home, platforms: { ...prev.home.projects, items: prev.home.projects.items.map((value) => value.id === item.id ? { ...value, image } : value) } } })))} />
          <TextField label="图片内容说明" value={item.imageAlt} maxLength={250} onChange={(imageAlt) => update({ ...item, imageAlt })} />
          <h3>项目详情链接</h3><LinkEditor value={item.link} onChange={(link) => update({ ...item, link })} />
        </ItemDetails>;
      })}
      {!platforms.items.length && <div className="editor-empty">尚未添加项目。</div>}
      <button type="button" className="button small outline editor-list-add" disabled={platforms.items.length >= 16} onClick={() => updateItems([...platforms.items, { id: createId("platform"), enabled: true, kind: "拟开展项目", title: "新项目", subtitle: "", count: "", unit: "", description: "", image: "", imageAlt: "", link: { label: "了解更多", href: "", enabled: false } }])}><Plus size={15} />添加项目</button>
    </SettingPanel>
    <SettingPanel title="项目说明与图片来源">
      <TextField label="项目下方说明" value={platforms.note} multiline maxLength={4000} onChange={(note) => setS((prev) => ({ ...prev, home: { ...prev.home, platforms: { ...prev.home.projects, note } } }))} />
      {platforms.sources.map((source, index) => <ItemDetails key={index} title={source.label} subtitle={source.enabled ? source.href : "已隐藏"} actions={<ItemControls label={source.label || "来源"} index={index} count={platforms.sources.length} onMove={(offset) => setS((prev) => ({ ...prev, home: { ...prev.home, platforms: { ...prev.home.projects, sources: moveItem(prev.home.projects.sources, index, offset) } } }))} onRemove={() => setS((prev) => ({ ...prev, home: { ...prev.home, platforms: { ...prev.home.projects, sources: prev.home.projects.sources.filter((_, n) => n !== index) } } }))} />}><LinkEditor value={source} onChange={(next) => setS((prev) => ({ ...prev, home: { ...prev.home, platforms: { ...prev.home.projects, sources: prev.home.projects.sources.map((value, n) => n === index ? next : value) } } }))} /></ItemDetails>)}
      <button type="button" className="button small outline editor-list-add" disabled={platforms.sources.length >= 16} onClick={() => setS((prev) => ({ ...prev, home: { ...prev.home, platforms: { ...prev.home.projects, sources: [...prev.home.projects.sources, { label: "图片来源", href: "", enabled: true }] } } }))}><Plus size={15} />添加来源链接</button>
    </SettingPanel>
  </>;
}
