import { Plus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { Article } from "../../content";
import type { ContentLink, NavigationLink, SectionHeading, Settings } from "../../site-config";
import { ItemControls, ItemDetails, TextFields, ToggleField, moveItem } from "./settings-controls";

export type SettingsEditorProps = { value: Settings; onChange: Dispatch<SetStateAction<Settings>>; pick: (kind: "image" | "video", select: (url: string) => void) => void };
export const createId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export const emptyLink = (): ContentLink => ({ label: "新链接", href: "/articles", enabled: true });
export const emptyHeading = (): SectionHeading => ({ number: "", eyebrow: "", title: "", description: "" });
export const columnOptions = [1, 2, 3, 4].map((value) => ({ value: String(value), label: `${value} 列` }));

export function LinkEditor({ value, onChange }: { value: ContentLink; onChange: (value: ContentLink) => void }) {
  return <>
    <ToggleField label="显示这个链接" value={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} />
    <div className="editor-grid"><TextFields value={value} onChange={onChange} fields={[
      { key: "label", label: "链接文字", maxLength: 100 },
      { key: "href", label: "点击后前往", maxLength: 2000, help: "例如 /articles、/#research，或完整的 https:// 地址。" },
    ]} /></div>
  </>;
}

export function HeadingEditor({ value, onChange }: { value: SectionHeading; onChange: (value: SectionHeading) => void }) {
  return <><div className="editor-grid"><TextFields value={value} onChange={onChange} fields={[
    { key: "number", label: "模块编号", maxLength: 20 }, { key: "eyebrow", label: "标题上方的小字", maxLength: 100 },
  ]} /></div><TextFields value={value} onChange={onChange} fields={[
    { key: "title", label: "模块标题", multiline: true, maxLength: 250, help: "可以换行，留空时不显示这项文字。" },
    { key: "description", label: "模块说明", multiline: true, maxLength: 1000 },
  ]} /></>;
}

export function NavigationEditor({ value, onChange, label = "链接", maxCount = 12 }: { value: NavigationLink[]; onChange: (value: NavigationLink[]) => void; label?: string; maxCount?: number }) {
  return <>
    {!value.length && <div className="editor-empty">尚未添加{label}。</div>}
    {value.map((link, index) => <ItemDetails key={link.id} title={link.label} subtitle={link.enabled ? link.href : "已隐藏"} actions={<ItemControls label={link.label || label} index={index} count={value.length} onMove={(offset) => onChange(moveItem(value, index, offset))} onRemove={() => onChange(value.filter((_, n) => n !== index))} />}>
      <LinkEditor value={link} onChange={(next) => onChange(value.map((item, n) => n === index ? { ...item, ...next } : item))} />
    </ItemDetails>)}
    <button type="button" className="button small outline editor-list-add" disabled={value.length >= maxCount} onClick={() => onChange([...value, { ...emptyLink(), id: createId("link") }])}><Plus size={15} />添加{label}</button>
  </>;
}

export function ArticleSelectionEditor({ ids, articles, onChange, label = "优先展示文章" }: { ids: string[]; articles: Article[]; onChange: (ids: string[]) => void; label?: string }) {
  const choices = articles.filter((article) => article.status === "published" && !ids.includes(article.id));
  return <div className="editor-article-selection"><h3>{label}</h3>{ids.map((id, index) => {
    const article = articles.find((item) => item.id === id);
    return <div className="editor-item" key={id}><div className="editor-item-top"><div><b>{article?.title || "文章已移除"}</b><small>{article?.status === "published" ? article.category : "当前未发布，不会对外显示"}</small></div><ItemControls label={article?.title || "文章"} index={index} count={ids.length} onMove={(offset) => onChange(moveItem(ids, index, offset))} onRemove={() => onChange(ids.filter((_, n) => n !== index))} /></div></div>;
  })}<label className="editor-field"><span>添加已发布文章</span><select aria-label={`添加${label}`} value="" disabled={!choices.length || ids.length >= 40} onChange={(event) => { if (event.target.value) onChange([...ids, event.target.value]); }}><option value="">{choices.length ? "请选择文章" : "暂无可添加的已发布文章"}</option>{choices.map((article) => <option value={article.id} key={article.id}>{article.title}</option>)}</select></label></div>;
}
