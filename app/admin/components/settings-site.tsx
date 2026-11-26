import { MediaField, SettingPanel, TextField, TextFields, ToggleField } from "./settings-controls";
import { LinkEditor, NavigationEditor, type SettingsEditorProps } from "./settings-editors";

export function SiteSettingsEditor({ value: s, onChange: setS, pick }: SettingsEditorProps) {
  return <>
    <SettingPanel title="站点名称与介绍" description="这些信息用于页面标题、导航栏与实验室联系区域。">
      <div className="editor-grid"><TextFields value={s.site} onChange={(site) => setS((prev) => ({ ...prev, site }))} fields={[
        { key: "name", label: "导航栏名称", maxLength: 100 }, { key: "subtitle", label: "导航栏副标题", maxLength: 150 },
      ]} /></div>
      <TextFields value={s.site} onChange={(site) => setS((prev) => ({ ...prev, site }))} fields={[
        { key: "title", label: "浏览器标签页标题", maxLength: 200 },
        { key: "description", label: "网站描述", maxLength: 500, multiline: true },
      ]} />
      <div className="editor-grid"><TextField label="实验室地点" value={s.location} maxLength={250} onChange={(location) => setS((prev) => ({ ...prev, location }))} /><TextField label="咨询联系方式" value={s.contact} maxLength={200} help="留空时不显示。" onChange={(contact) => setS((prev) => ({ ...prev, contact }))} /></div>
      <MediaField label="实验室标志图片" value={s.site.logo} onChange={(logo) => setS((prev) => ({ ...prev, site: { ...prev.site, logo } }))} onPick={() => pick("image", (logo) => setS((prev) => ({ ...prev, site: { ...prev.site, logo } })))} help="留空时使用网站原有图形标志。" />
      <TextField label="标志图片说明" value={s.site.logoAlt} maxLength={150} onChange={(logoAlt) => setS((prev) => ({ ...prev, site: { ...prev.site, logoAlt } }))} />
    </SettingPanel>
    <SettingPanel title="顶部导航" description="编辑导航文字和目的地，并通过上移、下移调整排列。报名入口单独设置在下方。">
      <NavigationEditor value={s.site.navLinks} onChange={(navLinks) => setS((prev) => ({ ...prev, site: { ...prev.site, navLinks } }))} label="导航链接" />
    </SettingPanel>
    <SettingPanel title="报名与管理入口">
      <div className="editor-grid"><ToggleField label="显示顶部报名入口" value={s.site.showJoin} onChange={(showJoin) => setS((prev) => ({ ...prev, site: { ...prev.site, showJoin } }))} /><TextField label="报名入口文字" value={s.site.joinLabel} maxLength={80} onChange={(joinLabel) => setS((prev) => ({ ...prev, site: { ...prev.site, joinLabel } }))} /></div>
      <ToggleField label="显示顶部管理员入口" value={s.site.showAdminLink} onChange={(showAdminLink) => setS((prev) => ({ ...prev, site: { ...prev.site, showAdminLink } }))} help="入口隐藏后，仍可通过收藏的后台地址进入。" />
      <div className="editor-grid"><TextFields value={s.site} onChange={(site) => setS((prev) => ({ ...prev, site }))} fields={[
        { key: "adminLabel", label: "未登录时的管理入口文字", maxLength: 80 }, { key: "workbenchLabel", label: "已登录时的管理入口文字", maxLength: 80 },
      ]} /></div>
    </SettingPanel>
    <SettingPanel title="页脚信息" description="页面底部的实验室名称、说明、栏目标题与落款。">
      <TextFields value={s.footer} onChange={(footer) => setS((prev) => ({ ...prev, footer }))} fields={[
        { key: "title", label: "页脚实验室名称", multiline: true, maxLength: 250 }, { key: "tagline", label: "页脚简介", multiline: true, maxLength: 250 },
      ]} />
      <div className="editor-grid"><TextFields value={s.footer} onChange={(footer) => setS((prev) => ({ ...prev, footer }))} fields={[
        { key: "contactTitle", label: "联系栏标题", maxLength: 100 }, { key: "exploreTitle", label: "链接栏标题", maxLength: 100 },
        { key: "adminLabel", label: "页脚管理入口文字", maxLength: 80 }, { key: "bottomLeft", label: "底部左侧文字", maxLength: 250 },
        { key: "bottomRight", label: "底部右侧文字", maxLength: 250 },
      ]} /></div>
      <h3>实验室介绍链接</h3><LinkEditor value={s.footer.aboutLink} onChange={(aboutLink) => setS((prev) => ({ ...prev, footer: { ...prev.footer, aboutLink } }))} />
      <h3>页脚链接列表</h3><NavigationEditor value={s.footer.links} onChange={(links) => setS((prev) => ({ ...prev, footer: { ...prev.footer, links } }))} label="页脚链接" maxCount={16} />
    </SettingPanel>
  </>;
}
