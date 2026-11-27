import { useEffect, useRef, useState } from "react";
import { Save, Eye, ExternalLink, Globe2, LayoutTemplate, Network, Bot, Images, ClipboardList, ListChecks, Download, CheckCircle2, Circle, RefreshCw, Monitor, Smartphone } from "lucide-react";
import { SiteLink } from "../../router";
import type { Article, Asset, Settings as SettingsType } from "../../content";
import { normalizeSettings } from "../../site-config";
import { settingsSchema } from "../../settings-schema";
import { SettingsPreviewProvider } from "../../site-state";
import Home from "../../page";
import Join from "../../join/page";
import { api, downloadJson, Modal } from "../shared";
import { publicationMessage, publicationRuns, publicationWorkflow } from "../publication";
import { AssetPicker } from "./media-library";
import { SettingPanel } from "./settings-controls";
import { SiteSettingsEditor } from "./settings-site";
import { HomeSettingsEditor } from "./settings-home";
import { ResearchSettingsEditor } from "./settings-research";
import { PlatformSettingsEditor } from "./settings-platforms";
import { ShowcaseSettingsEditor } from "./settings-showcase";
import { RegistrationFieldsEditor, RegistrationPageEditor } from "./settings-registration";
import { SettingsPreviewFrame } from "./settings-preview";
import { describeSettingsIssue } from "./settings-validation";
import "./settings.css";

const tabs = [
  { id: "site", label: "站点与导航", icon: Globe2 },
  { id: "home", label: "首页与布局", icon: LayoutTemplate },
  { id: "research", label: "研究方向", icon: Network },
  { id: "platforms", label: "拟开展项目", icon: Bot },
  { id: "showcase", label: "文章与影像", icon: Images },
  { id: "registration", label: "报名页面", icon: ClipboardList },
  { id: "fields", label: "报名表字段", icon: ListChecks },
  { id: "backup", label: "内容备份", icon: Download },
] as const;
type TabId = typeof tabs[number]["id"];

export function Settings({ value, articles, assets, onUpload, onRefresh, notify, content, editingAvailable = true }: {
  value: SettingsType; articles: Article[]; assets: Asset[]; onUpload: (a: Asset) => void;
  onRefresh: () => Promise<void>; notify: (s: string) => void; content: unknown; editingAvailable?: boolean;
}) {
  const [s, setS] = useState(() => normalizeSettings(value));
  const [saved, setSaved] = useState(() => normalizeSettings(value));
  const [tab, setTab] = useState<TabId>("home");
  const [picker, setPicker] = useState<{ kind: "image" | "video"; select: (url: string) => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [conflict, setConflict] = useState(false);
  const [preview, setPreview] = useState<"home" | "registration" | null>(null);
  const [mobile, setMobile] = useState(false);
  const incoming = useRef(JSON.stringify(normalizeSettings(value)));
  const feedback = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const pick = (kind: "image" | "video", select: (url: string) => void) => setPicker({ kind, select });

  useEffect(() => {
    const next = normalizeSettings(value), signature = JSON.stringify(next);
    if (signature === incoming.current) return;
    incoming.current = signature;
    if (!dirty) { setS(next); setSaved(next); setConflict(false); }
    else if (next.revision !== saved.revision) {
      setConflict(true);
      setError("网站设置已在其他页面更新。你的未保存修改仍保留，请先导出草稿，再载入最新设置后合并修改。");
    }
  }, [value]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  useEffect(() => { if (dirty) setSuccess(""); }, [dirty]);
  useEffect(() => { if (error) feedback.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [error]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAvailable || busy || !dirty || conflict) return;
    const checked = settingsSchema.safeParse(s);
    if (!checked.success) {
      const problem = describeSettingsIssue(checked.error.issues[0], s);
      setTab(problem.tab); setError(problem.message); setSuccess("");
      return;
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      const result = await api("admin/settings", s);
      if (!result?.settings || typeof result.settings.revision !== "number") throw new Error("服务尚未支持完整设置，请刷新后重试；当前草稿已保留。");
      const next = normalizeSettings(result.settings);
      incoming.current = JSON.stringify(next); setS(next); setSaved(next); setConflict(false);
      setSuccess(publicationMessage(result.publication));
      notify(publicationMessage(result.publication));
      try { await onRefresh(); } catch { /* Keep the confirmed save and publish status. */ }
    } catch (failure) {
      if ((failure as { status?: number }).status === 409) {
        setConflict(true);
        setError("其他页面已经保存了更新的设置。为保留双方的修改，本次没有覆盖。你的草稿仍在，请先导出，再载入最新设置后合并修改。");
      } else setError((failure as Error).message || "设置保存失败，当前修改已保留。");
    } finally { setBusy(false); }
  }

  function exportDraft() {
    downloadJson({ format: "csu-robotics-settings-draft-v1", exportedAt: new Date().toISOString(), settings: s }, "实验室网站设置草稿.json");
  }
  async function reloadSaved() {
    if (dirty && !window.confirm("载入已保存设置会替换本页未保存的修改。需要保留时，请先导出草稿。现在继续载入吗？")) return;
    setBusy(true);
    try {
      const latest = await api("admin");
      if (!latest.settings || typeof latest.settings.revision !== "number") throw new Error("后台配置服务正在更新，请稍后刷新。");
      const next = normalizeSettings(latest.settings);
      incoming.current = JSON.stringify(next); setS(next); setSaved(next); setConflict(false); setError(""); setSuccess("已载入网站当前保存的设置。");
      await onRefresh();
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  const editorProps = { value: s, onChange: setS, pick };

  return <div className="site-settings">
    <div className="cms-heading"><div><h1>网站设置</h1><p>维护首页、研究展示与报名表。先预览，再保存；通过 GitHub 发布公开网站。</p></div><span className={"settings-state " + (dirty ? "dirty" : "")} role="status">{dirty ? <Circle size={13} /> : <CheckCircle2 size={15} />}{dirty ? "有修改尚未保存" : "已与数据库同步"}</span></div>
    {!editingAvailable && <div className="settings-feedback error" role="alert">后台配置服务正在更新，请稍后刷新。你可以浏览设置，保存功能会在服务就绪后开放。 <button type="button" className="button small outline" onClick={() => onRefresh().catch((failure) => setError((failure as Error).message))}><RefreshCw size={14} />重新检查</button></div>}
    <div ref={feedback} aria-live="polite">{error && <div className="settings-feedback error" role="alert">{error}{conflict && <div className="cms-actions"><button type="button" className="button small outline" onClick={exportDraft}><Download size={14} />导出当前草稿</button><button type="button" className="button small outline" onClick={() => void reloadSaved()} disabled={busy}><RefreshCw size={14} />载入最新设置</button></div>}</div>}{success && <div className="settings-feedback" role="status">{success}</div>}</div>
    <div className="settings-tab-bar" role="tablist" aria-label="网站设置分类">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" className="settings-tab" aria-selected={tab === id} aria-controls={`settings-panel-${id}`} id={`settings-tab-${id}`} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}</div>
    <form noValidate data-unsaved={dirty} onSubmit={(event) => void save(event)}>
      <fieldset className="settings-fields" disabled={busy}><div role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`}>
        {tab === "site" && <SiteSettingsEditor {...editorProps} />}
        {tab === "home" && <HomeSettingsEditor {...editorProps} />}
        {tab === "research" && <ResearchSettingsEditor {...editorProps} articles={articles} />}
        {tab === "platforms" && <PlatformSettingsEditor {...editorProps} />}
        {tab === "showcase" && <ShowcaseSettingsEditor {...editorProps} articles={articles} />}
        {tab === "registration" && <RegistrationPageEditor {...editorProps} />}
        {tab === "fields" && <RegistrationFieldsEditor {...editorProps} />}
        {tab === "backup" && <SettingPanel title="内容备份" description="导出文章、素材索引和已保存的网站设置，便于交接维护。">
          <div className="cms-actions"><button type="button" className="button small outline" onClick={() => downloadJson({ format: "csu-robotics-content-v2", exportedAt: new Date().toISOString(), content }, "机器人实验室内容备份.json")}><Download size={15} />导出已保存内容</button><button type="button" className="button small outline" onClick={exportDraft}><Download size={15} />导出当前设置草稿</button></div>
          <p className="muted backup-note">内容备份包含素材链接，图片与视频原件请另行保留。报名名单在“报名管理”中单独导出；当前草稿导出包含本页尚未保存的设置。</p>
        </SettingPanel>}
      </div></fieldset>
      <div className="settings-save-bar"><div className="cms-actions"><button type="submit" className="button" disabled={busy || !dirty || conflict || !editingAvailable}><Save size={17} />{busy ? "保存中…" : "保存设置"}</button><button type="button" className="button outline" disabled={busy} onClick={() => setPreview(tab === "registration" || tab === "fields" ? "registration" : "home")}><Eye size={17} />预览未保存修改</button>{dirty && !conflict && <button type="button" className="text-link" disabled={busy} onClick={() => { if (window.confirm("放弃本页尚未保存的修改，恢复到上次保存的设置吗？")) { setS(structuredClone(saved)); setError(""); } }}>放弃修改</button>}</div><div className="settings-save-hint">保存后请打开 GitHub，选择 Run workflow → main → Run workflow。<br /><a className="text-link" href={publicationWorkflow} target="_blank" rel="noopener noreferrer">立即同步公开网站 <ExternalLink size={13} /></a><br /><a className="text-link" href={publicationRuns} target="_blank" rel="noreferrer">查看发布状态</a><br /><SiteLink href="/" target="_blank" rel="noreferrer" className="text-link">查看已发布首页 <ExternalLink size={13} /></SiteLink></div></div>
    </form>
    {picker && <AssetPicker kind={picker.kind} assets={assets} onUpload={onUpload} onClose={() => setPicker(null)} onSelect={(asset) => picker.select(asset.url)} />}
    {preview && <Modal title="页面预览 · 当前未保存设置" wide onClose={() => setPreview(null)}>
      <div className="settings-preview-toolbar"><div className="cms-actions"><button type="button" className={"button small " + (preview === "home" ? "" : "outline")} onClick={() => setPreview("home")}>首页</button><button type="button" className={"button small " + (preview === "registration" ? "" : "outline")} onClick={() => setPreview("registration")}>报名页</button></div><div className="cms-actions"><button type="button" className={"button small " + (!mobile ? "" : "outline")} onClick={() => setMobile(false)}><Monitor size={15} />桌面</button><button type="button" className={"button small " + (mobile ? "" : "outline")} onClick={() => setMobile(true)}><Smartphone size={15} />手机</button></div><span>预览不会发布内容或提交报名。</span></div>
      <SettingsPreviewFrame mobile={mobile}><SettingsPreviewProvider settings={s} articles={articles.filter((article) => article.status === "published")}>{preview === "home" ? <Home preview /> : <Join preview />}</SettingsPreviewProvider></SettingsPreviewFrame>
    </Modal>}
  </div>;
}
