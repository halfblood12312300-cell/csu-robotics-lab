import { Plus } from "lucide-react";
import { homeModuleLabels, type Settings } from "../../site-config";
import { ItemControls, ItemDetails, MediaField, SelectField, SettingPanel, TextField, TextFields, ToggleField, moveItem } from "./settings-controls";
import { LinkEditor, createId, type SettingsEditorProps } from "./settings-editors";

export function HomeSettingsEditor({ value: s, onChange: setS, pick }: SettingsEditorProps) {
  const updateHero = (hero: Settings["home"]["hero"]) => setS((prev) => ({ ...prev, home: { ...prev.home, hero } }));
  const updateStats = (stats: Settings["home"]["stats"]) => setS((prev) => ({ ...prev, home: { ...prev.home, stats } }));
  return <>
    <SettingPanel title="首页模块顺序" description="从上到下就是首页展示顺序。关闭模块会保留内容，重新勾选即可恢复展示。">
      {s.home.modules.map((module, index) => <div className="editor-item" key={module.id}><div className="editor-item-top">
        <ToggleField label={homeModuleLabels[module.id]} value={module.enabled} onChange={(enabled) => setS((prev) => ({ ...prev, home: { ...prev.home, modules: prev.home.modules.map((item) => item.id === module.id ? { ...item, enabled } : item) } }))} />
        <ItemControls label={homeModuleLabels[module.id]} index={index} count={s.home.modules.length} onMove={(offset) => setS((prev) => ({ ...prev, home: { ...prev.home, modules: moveItem(prev.home.modules, index, offset) } }))} />
      </div></div>)}
    </SettingPanel>
    <SettingPanel title="颜色与版面" description="调整网站的主色、留白和内容宽度。手机端会按屏幕宽度自动排列。">
      <div className="editor-grid">{([{ key: "accentColor", label: "主题强调色" }, { key: "backgroundColor", label: "页面背景色" }] as const).map(({ key, label }) => <label className="editor-field" key={key}><span>{label}</span><div className="editor-color"><input aria-label={label} type="color" value={s.theme[key]} onChange={(event) => setS((prev) => ({ ...prev, theme: { ...prev.theme, [key]: event.target.value } }))} /><span>{s.theme[key]}</span></div></label>)}</div>
      <div className="editor-grid">
        <SelectField label="内容宽度" value={s.theme.contentWidth} onChange={(contentWidth) => setS((prev) => ({ ...prev, theme: { ...prev.theme, contentWidth } }))} options={[{ value: "compact", label: "紧凑" }, { value: "standard", label: "标准" }, { value: "wide", label: "宽版" }]} />
        <SelectField label="模块间距" value={s.theme.spacing} onChange={(spacing) => setS((prev) => ({ ...prev, theme: { ...prev.theme, spacing } }))} options={[{ value: "compact", label: "紧凑" }, { value: "comfortable", label: "宽松" }]} />
        <SelectField label="卡片与按钮边角" value={s.theme.cornerStyle} onChange={(cornerStyle) => setS((prev) => ({ ...prev, theme: { ...prev.theme, cornerStyle } }))} options={[{ value: "square", label: "利落直角" }, { value: "rounded", label: "柔和圆角" }]} />
        <ToggleField label="滚动时固定顶部导航" value={s.theme.stickyHeader} onChange={(stickyHeader) => setS((prev) => ({ ...prev, theme: { ...prev.theme, stickyHeader } }))} />
      </div>
    </SettingPanel>
    <SettingPanel title="首屏标题与介绍">
      <SelectField label="首屏布局" value={s.home.hero.layout} onChange={(layout) => updateHero({ ...s.home.hero, layout })} options={[{ value: "image-right", label: "文字左侧 · 图片右侧" }, { value: "image-left", label: "图片左侧 · 文字右侧" }, { value: "centered", label: "居中排列" }]} />
      <TextFields value={s.home.hero} onChange={updateHero} fields={[
        { key: "eyebrow", label: "标题上方的小字", maxLength: 250 }, { key: "title", label: "首屏大标题", multiline: true, maxLength: 250, help: "按回车换行。" },
        { key: "highlight", label: "标题中的强调文字", maxLength: 250 },
      ]} />
      <TextField label="实验室简介" value={s.intro} multiline maxLength={4000} onChange={(intro) => setS((prev) => ({ ...prev, intro }))} />
      <TextField label="简介下方的小提示" value={s.home.hero.note} maxLength={250} onChange={(note) => updateHero({ ...s.home.hero, note })} />
      <h3>主要展示按钮</h3><LinkEditor value={s.home.hero.primary} onChange={(primary) => updateHero({ ...s.home.hero, primary })} />
      <h3>次要展示按钮</h3><LinkEditor value={s.home.hero.secondary} onChange={(secondary) => updateHero({ ...s.home.hero, secondary })} />
    </SettingPanel>
    <SettingPanel title="首屏图片与视频" description="设置视频后会显示可播放的视频，图片同时作为封面；清除视频则恢复图片展示。">
      <div className="editor-grid"><MediaField label="首页图片 / 视频封面" value={s.heroImage} onChange={(heroImage) => setS((prev) => ({ ...prev, heroImage }))} onPick={() => pick("image", (heroImage) => setS((prev) => ({ ...prev, heroImage })))} />
        <MediaField label="首页宣传视频" value={s.heroVideo} poster={s.heroImage} kind="video" onChange={(heroVideo) => setS((prev) => ({ ...prev, heroVideo }))} onPick={() => pick("video", (heroVideo) => setS((prev) => ({ ...prev, heroVideo })))} /></div>
      <TextFields value={s.home.hero} onChange={updateHero} fields={[
        { key: "imageAlt", label: "图片内容说明", maxLength: 250 }, { key: "imageCredit", label: "图片来源 / 说明文字", maxLength: 250 },
      ]} />
      <div className="editor-grid"><TextFields value={s.home.hero} onChange={updateHero} fields={[
        { key: "photoLabel", label: "图片内说明文字", maxLength: 250 }, { key: "photoLabelEn", label: "图片内上方小字", maxLength: 250 },
        { key: "visualLeft", label: "图片下方左侧文字", maxLength: 250 }, { key: "visualRight", label: "图片下方右侧文字", maxLength: 250 },
      ]} /></div>
    </SettingPanel>
    <SettingPanel title="数据概览" description="编辑数量、单位和说明。数据是展示内容，调整设备或方向数量后可在这里同步修改。">
      {s.home.stats.items.map((item, index) => <ItemDetails key={item.id} title={`${item.value}${item.unit} · ${item.label}`} subtitle={item.enabled ? "正在展示" : "已隐藏"} actions={<ItemControls label={item.label || "数据项"} index={index} count={s.home.stats.items.length} onMove={(offset) => updateStats({ ...s.home.stats, items: moveItem(s.home.stats.items, index, offset) })} onRemove={() => updateStats({ ...s.home.stats, items: s.home.stats.items.filter((_, n) => n !== index) })} />}>
        <ToggleField label="显示这项数据" value={item.enabled} onChange={(enabled) => updateStats({ ...s.home.stats, items: s.home.stats.items.map((value, n) => n === index ? { ...value, enabled } : value) })} />
        <div className="editor-grid three"><TextFields value={item} onChange={(next) => updateStats({ ...s.home.stats, items: s.home.stats.items.map((value, n) => n === index ? next : value) })} fields={[{ key: "value", label: "数值", maxLength: 60 }, { key: "unit", label: "单位", maxLength: 60 }, { key: "label", label: "说明", maxLength: 250 }]} /></div>
      </ItemDetails>)}
      <button type="button" className="button small outline editor-list-add" disabled={s.home.stats.items.length >= 12} onClick={() => updateStats({ ...s.home.stats, items: [...s.home.stats.items, { id: createId("stat"), enabled: true, value: "0", unit: "", label: "新数据" }] })}><Plus size={15} />添加数据项</button>
      <div style={{ marginTop: 20 }}><TextField label="数据旁的说明文字" value={s.home.stats.statement} multiline maxLength={1000} onChange={(statement) => updateStats({ ...s.home.stats, statement })} /></div>
    </SettingPanel>
    <SettingPanel title="底部展示横幅">
      <TextFields value={s.home.banner} onChange={(banner) => setS((prev) => ({ ...prev, home: { ...prev.home, banner } }))} fields={[
        { key: "eyebrow", label: "标题上方的小字", maxLength: 250 }, { key: "title", label: "横幅标题", maxLength: 250, multiline: true },
        { key: "description", label: "横幅说明", maxLength: 4000, multiline: true },
      ]} />
      <div className="editor-grid"><TextFields value={s.home.banner} onChange={(banner) => setS((prev) => ({ ...prev, home: { ...prev.home, banner } }))} fields={[{ key: "symbol", label: "装饰符号", maxLength: 20 }, { key: "symbolCaption", label: "符号旁文字", maxLength: 250 }]} /></div>
      <LinkEditor value={s.home.banner.button} onChange={(button) => setS((prev) => ({ ...prev, home: { ...prev.home, banner: { ...prev.home.banner, button } } }))} />
    </SettingPanel>
  </>;
}
