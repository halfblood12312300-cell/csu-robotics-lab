import { Plus } from "lucide-react";
import type { Article } from "../../content";
import { blankResearchDetail, type ResearchDirection } from "../../site-config";
import { ItemControls, ItemDetails, LinesField, SelectField, SettingPanel, TextField, TextFields, ToggleField, moveItem } from "./settings-controls";
import { ArticleSelectionEditor, HeadingEditor, createId, type SettingsEditorProps } from "./settings-editors";

function DescriptionList<T extends { title: string; description: string; detail?: string }>({ title, items, onChange, create, detail = false }: { title: string; items: T[]; onChange: (items: T[]) => void; create: () => T; detail?: boolean }) {
  return <div className="editor-description-list"><h3>{title}</h3>{items.map((item, index) => <ItemDetails key={index} title={item.title || `${title} ${index + 1}`} actions={<ItemControls label={item.title || title} index={index} count={items.length} onMove={(offset) => onChange(moveItem(items, index, offset))} onRemove={() => onChange(items.filter((_, n) => n !== index))} />}>
    <TextFields value={item} onChange={(next) => onChange(items.map((value, n) => n === index ? next : value))} fields={[{ key: "title", label: "标题", maxLength: 250 }, { key: "description", label: "说明", multiline: true, maxLength: 4000 }]} />
    {detail && <TextField label="卡片底部提示" value={item.detail || ""} maxLength={250} onChange={(next) => onChange(items.map((value, n) => n === index ? { ...value, detail: next } : value))} />}
  </ItemDetails>)}<button type="button" className="button small outline editor-list-add" disabled={items.length >= 12} onClick={() => onChange([...items, create()])}><Plus size={15} />添加{title}</button></div>;
}

export function ResearchSettingsEditor({ value: s, onChange: setS, articles }: SettingsEditorProps & { articles: Article[] }) {
  const research = s.home.research;
  const update = (directions: ResearchDirection[]) => setS((prev) => ({ ...prev, home: { ...prev.home, research: { ...prev.home.research, directions } } }));
  const updateOne = (id: string, next: ResearchDirection) => update(research.directions.map((item) => item.id === id ? next : item));
  return <>
    <SettingPanel title="研究方向模块">
      <HeadingEditor value={research.heading} onChange={(heading) => setS((prev) => ({ ...prev, home: { ...prev.home, research: { ...prev.home.research, heading } } }))} />
      <SelectField label="桌面端每行卡片数" value={String(research.columns)} onChange={(columns) => setS((prev) => ({ ...prev, home: { ...prev.home, research: { ...prev.home.research, columns: Number(columns) as 2 | 3 | 4 } } }))} options={[{ value: "2", label: "2 列" }, { value: "3", label: "3 列" }, { value: "4", label: "4 列" }]} />
    </SettingPanel>
    <SettingPanel title="方向卡片与详情" description="这里的标题、简介会显示在首页；展开后可编辑该方向的完整详情页。报名表的研究方向选项可自动跟随这里的启用项目。">
      {research.directions.map((direction, index) => {
        const d = direction.detail;
        const detail = (next: typeof d) => updateOne(direction.id, { ...direction, detail: next });
        return <ItemDetails key={direction.id} title={direction.title} subtitle={direction.enabled ? "首页展示 · 点击卡片可查看详情" : "已隐藏"} actions={<ItemControls label={direction.title} index={index} count={research.directions.length} onMove={(offset) => update(moveItem(research.directions, index, offset))} onRemove={() => update(research.directions.filter((item) => item.id !== direction.id))} />}>
          <ToggleField label="显示这个研究方向" value={direction.enabled} onChange={(enabled) => updateOne(direction.id, { ...direction, enabled })} />
          <div className="editor-grid"><TextFields value={direction} onChange={(next) => updateOne(direction.id, next)} fields={[{ key: "number", label: "显示编号", maxLength: 20 }, { key: "en", label: "方向英文名 / 小字", maxLength: 250 }]} /></div>
          <TextFields value={direction} onChange={(next) => updateOne(direction.id, next)} fields={[{ key: "title", label: "方向名称", maxLength: 120 }, { key: "desc", label: "首页卡片简介", multiline: true, maxLength: 4000 }]} />
          <LinesField label="首页标签" value={direction.tags} maxLength={1200} help="每行一个标签，最多 20 个，每项不超过 60 字。" onChange={(tags) => updateOne(direction.id, { ...direction, tags })} />
          <h3>详情页介绍与概览</h3><TextFields value={d} onChange={detail} fields={[{ key: "introduction", label: "方向完整介绍", multiline: true, maxLength: 4000 }, { key: "question", label: "核心研究问题", maxLength: 250 }]} />
          <div className="editor-grid"><TextFields value={d} onChange={detail} fields={[{ key: "input", label: "研究输入", maxLength: 250 }, { key: "output", label: "关注输出", maxLength: 250 }, { key: "connects", label: "相关领域", maxLength: 250 }]} /></div>
          <DescriptionList title="研究内容" items={d.topics} onChange={(topics) => detail({ ...d, topics })} detail create={() => ({ title: "新研究内容", description: "", detail: "" })} />
          <DescriptionList title="研究步骤" items={d.steps} onChange={(steps) => detail({ ...d, steps })} create={() => ({ title: "新步骤", description: "" })} />
          <h3>任务示例</h3><TextFields value={d.example} onChange={(example) => detail({ ...d, example })} fields={[{ key: "title", label: "示例标题", maxLength: 250 }, { key: "description", label: "示例说明", multiline: true, maxLength: 4000 }]} />
          <LinesField label="示例观察问题" value={d.example.observations} maxLength={12011} help="每行一个问题，最多 12 项，每项不超过 1000 字。" onChange={(observations) => detail({ ...d, example: { ...d.example, observations } })} />
          <DescriptionList title="评价方法" items={d.evaluation} onChange={(evaluation) => detail({ ...d, evaluation })} create={() => ({ title: "新评价方法", description: "" })} />
          <ArticleSelectionEditor label="优先推荐相关文章" ids={d.articleIds} articles={articles} onChange={(articleIds) => detail({ ...d, articleIds })} />
          <LinesField label="相关文章匹配关键词" value={d.keywords} maxLength={1829} help="每行一个关键词，最多 30 个，每项不超过 60 字。用于匹配已发布文章。" onChange={(keywords) => detail({ ...d, keywords })} />
        </ItemDetails>;
      })}
      {!research.directions.length && <div className="editor-empty">尚未添加研究方向。</div>}
      <button type="button" className="button small outline editor-list-add" disabled={research.directions.length >= 16} onClick={() => update([...research.directions, { id: createId("direction"), enabled: true, number: String(research.directions.length + 1).padStart(2, "0"), title: "新研究方向", en: "", desc: "", tags: [], detail: blankResearchDetail() }])}><Plus size={15} />添加研究方向</button>
    </SettingPanel>
  </>;
}
