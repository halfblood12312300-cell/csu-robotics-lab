import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Image as ImageIcon, Film, Trash2 } from "lucide-react";
import { MediaImage, MediaVideo } from "../../media";

export function SettingPanel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="cms-panel editor-panel"><div className="editor-panel-heading"><h2>{title}</h2>{description && <p>{description}</p>}</div>{children}</section>;
}

export function TextField({ label, value, onChange, help, multiline = false, maxLength = 1000, placeholder = "", type = "text" }: {
  label: string; value: string; onChange: (value: string) => void; help?: string; multiline?: boolean; maxLength?: number; placeholder?: string; type?: "text" | "date" | "url";
}) {
  return <label className="editor-field"><span>{label}</span>{multiline
    ? <textarea rows={3} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    : <input type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
    {help && <small>{help}</small>}</label>;
}

export function TextFields<T extends object>({ value, onChange, fields }: { value: T; onChange: (value: T) => void; fields: { key: keyof T; label: string; help?: string; multiline?: boolean; maxLength?: number; placeholder?: string }[] }) {
  return <>{fields.map(({ key, ...field }) => <TextField key={String(key)} {...field} value={String(value[key] ?? "")} onChange={(next) => onChange({ ...value, [key]: next })} />)}</>;
}

export function SelectField<T extends string>({ label, value, onChange, options, help }: {
  label: string; value: T; onChange: (value: T) => void; options: readonly { value: T; label: string }[]; help?: string;
}) {
  return <label className="editor-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value as T)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{help && <small>{help}</small>}</label>;
}

export function ToggleField({ label, value, onChange, help, disabled = false }: { label: string; value: boolean; onChange: (value: boolean) => void; help?: string; disabled?: boolean }) {
  return <label className="editor-toggle"><input type="checkbox" checked={value} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /><span><b>{label}</b>{help && <small>{help}</small>}</span></label>;
}

export function NumberField({ label, value, onChange, min = 0, max = 100, help }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; help?: string }) {
  return <label className="editor-field"><span>{label}</span><input type="number" value={value} min={min} max={max} step="1" onChange={(event) => onChange(event.target.value === "" ? min : Number(event.target.value))} />{help && <small>{help}</small>}</label>;
}

/** Preserve the user's current newline while exposing a clean list to the draft. */
export function LinesField({ label, value, onChange, help, maxLength = 5000 }: { label: string; value: string[]; onChange: (value: string[]) => void; help?: string; maxLength?: number }) {
  const [text, setText] = useState(value.join("\n"));
  const signature = JSON.stringify(value);
  useEffect(() => {
    const current = text.split("\n").map((line) => line.trim()).filter(Boolean);
    if (JSON.stringify(current) !== signature) setText(value.join("\n"));
  }, [signature]);
  return <TextField label={label} value={text} multiline maxLength={maxLength} help={help || "每行填写一项。"} onChange={(next) => {
    setText(next); onChange(next.split("\n").map((line) => line.trim()).filter(Boolean));
  }} />;
}

export function moveItem<T>(items: T[], index: number, offset: number): T[] {
  const next = [...items], destination = index + offset;
  if (destination < 0 || destination >= next.length) return next;
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}

export function ItemControls({ label, index, count, onMove, onRemove, removable = true }: {
  label: string; index: number; count: number; onMove: (offset: number) => void; onRemove?: () => void; removable?: boolean;
}) {
  return <div className="editor-item-controls">
    <button type="button" className="icon-button" aria-label={`上移${label}`} title="上移" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={16} /></button>
    <button type="button" className="icon-button" aria-label={`下移${label}`} title="下移" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={16} /></button>
    {onRemove && <button type="button" className="icon-button editor-delete" aria-label={`删除${label}`} title={removable ? "删除" : "这个基础字段需要保留"} disabled={!removable} onClick={onRemove}><Trash2 size={16} /></button>}
  </div>;
}

export function MediaField({ label, value, onChange, onPick, kind = "image", poster, help }: {
  label: string; value: string; onChange: (value: string) => void; onPick: () => void; kind?: "image" | "video"; poster?: string; help?: string;
}) {
  return <div className="editor-media-field"><TextField label={label} value={value} onChange={onChange} maxLength={2000} help={help || "选择仓库素材，或填写可直接访问的图片 / 视频地址。"} />
    {value && <div className="editor-media-preview">{kind === "video"
      ? <MediaVideo preview src={value} poster={poster} controls playsInline preload="metadata" />
      : <MediaImage preview src={value} alt={`${label}预览`} loading="lazy" />}</div>}
    <div className="cms-actions"><button type="button" className="button small outline" onClick={onPick}>{kind === "video" ? <Film size={15} /> : <ImageIcon size={15} />}从素材库选择{kind === "video" ? "视频" : "图片"}</button>{value && <button type="button" className="text-link" onClick={() => onChange("")}>清除选用</button>}</div>
  </div>;
}

export function ItemDetails({ title, subtitle, children, open = false, actions }: { title: string; subtitle?: string; children: ReactNode; open?: boolean; actions?: ReactNode }) {
  return <div className="editor-item"><div className="editor-item-top"><div><b>{title || "未命名项目"}</b>{subtitle && <small>{subtitle}</small>}</div>{actions}</div><details open={open || undefined}><summary>编辑内容</summary><div className="editor-item-body">{children}</div></details></div>;
}
