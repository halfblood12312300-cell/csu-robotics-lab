import { Plus } from "lucide-react";
import type { Article } from "../../content";
import type { GalleryItem } from "../../site-config";
import { ItemControls, ItemDetails, LinesField, MediaField, NumberField, SelectField, SettingPanel, TextField, TextFields, ToggleField, moveItem } from "./settings-controls";
import { ArticleSelectionEditor, HeadingEditor, LinkEditor, columnOptions, createId, type SettingsEditorProps } from "./settings-editors";

export function ShowcaseSettingsEditor({ value: s, onChange: setS, pick, articles }: SettingsEditorProps & { articles: Article[] }) {
  const stories = s.home.stories, gallery = s.home.gallery;
  const galleryItems = (items: GalleryItem[]) => setS((prev) => ({ ...prev, home: { ...prev.home, gallery: { ...prev.home.gallery, items } } }));
  return <>
    <SettingPanel title="首页项目与动态">
      <HeadingEditor value={stories.heading} onChange={(heading) => setS((prev) => ({ ...prev, home: { ...prev.home, stories: { ...prev.home.stories, heading } } }))} />
      <div className="editor-grid"><NumberField label="首页最多展示文章数" value={stories.limit} min={1} max={24} onChange={(limit) => setS((prev) => ({ ...prev, home: { ...prev.home, stories: { ...prev.home.stories, limit } } }))} />
        <SelectField label="桌面端文章列数" value={String(stories.columns)} options={columnOptions} onChange={(columns) => setS((prev) => ({ ...prev, home: { ...prev.home, stories: { ...prev.home.stories, columns: Number(columns) as 1 | 2 | 3 | 4 } } }))} /></div>
      <ToggleField label="首页文章区排除“招新通知”类别" value={stories.excludeRecruitment} onChange={(excludeRecruitment) => setS((prev) => ({ ...prev, home: { ...prev.home, stories: { ...prev.home.stories, excludeRecruitment } } }))} />
      <h3>更多文章链接</h3><LinkEditor value={stories.moreLink} onChange={(moreLink) => setS((prev) => ({ ...prev, home: { ...prev.home, stories: { ...prev.home.stories, moreLink } } }))} />
      <p className="editor-note">优先展示下方选定的文章，再用其他符合条件的已发布文章补足数量。草稿和已撤回的文章不会对外显示。</p>
      <ArticleSelectionEditor ids={stories.featuredIds} articles={articles} onChange={(featuredIds) => setS((prev) => ({ ...prev, home: { ...prev.home, stories: { ...prev.home.stories, featuredIds } } }))} />
    </SettingPanel>
    <SettingPanel title="首页图片与视频区">
      <HeadingEditor value={gallery.heading} onChange={(heading) => setS((prev) => ({ ...prev, home: { ...prev.home, gallery: { ...prev.home.gallery, heading } } }))} />
      <SelectField label="展示内容来源" value={gallery.source} onChange={(source) => setS((prev) => ({ ...prev, home: { ...prev.home, gallery: { ...prev.home.gallery, source } } }))} options={[{ value: "articles", label: "从已发布文章自动汇总" }, { value: "manual", label: "手动选用图片和视频" }]} />
      <div className="editor-grid"><NumberField label="最多展示素材数" value={gallery.limit} min={1} max={32} onChange={(limit) => setS((prev) => ({ ...prev, home: { ...prev.home, gallery: { ...prev.home.gallery, limit } } }))} />
        <SelectField label="桌面端素材列数" value={String(gallery.columns)} options={columnOptions} onChange={(columns) => setS((prev) => ({ ...prev, home: { ...prev.home, gallery: { ...prev.home.gallery, columns: Number(columns) as 1 | 2 | 3 | 4 } } }))} /></div>
      {gallery.source === "articles" && <p className="editor-note">此模式从已发布文章中汇总素材。切换到“手动选用”可以自行安排首页图片、视频与排列顺序。</p>}
      {gallery.source === "manual" && <>
        {gallery.items.map((item, index) => {
          const update = (next: GalleryItem) => galleryItems(gallery.items.map((value) => value.id === item.id ? next : value));
          return <ItemDetails key={item.id} title={item.caption || `素材 ${index + 1}`} subtitle={item.enabled ? (item.type === "image" ? "图片" : "视频") : "已隐藏"} actions={<ItemControls label={item.caption || "素材"} index={index} count={gallery.items.length} onMove={(offset) => galleryItems(moveItem(gallery.items, index, offset))} onRemove={() => galleryItems(gallery.items.filter((value) => value.id !== item.id))} />}>
            <ToggleField label="显示这个素材" value={item.enabled} onChange={(enabled) => update({ ...item, enabled })} />
            <SelectField label="素材类型" value={item.type} options={[{ value: "image", label: "图片" }, { value: "video", label: "视频" }]} onChange={(type) => update({ ...item, type, url: "" })} />
            <MediaField label={item.type === "image" ? "图片文件" : "视频文件"} kind={item.type} value={item.url} onChange={(url) => update({ ...item, url })} onPick={() => pick(item.type, (url) => setS((prev) => ({ ...prev, home: { ...prev.home, gallery: { ...prev.home.gallery, items: prev.home.gallery.items.map((value) => value.id === item.id ? { ...value, url } : value) } } })))} />
            <TextField label="素材说明" value={item.caption} maxLength={250} onChange={(caption) => update({ ...item, caption })} />
            <TextField label="图片点击后的展示链接" value={item.href} maxLength={2000} help="选填。可填写文章链接或外部展示页面；视频仍使用播放器控制。" onChange={(href) => update({ ...item, href })} />
          </ItemDetails>;
        })}
        {!gallery.items.length && <div className="editor-empty">尚未选用首页素材。</div>}
        <button type="button" className="button small outline editor-list-add" disabled={gallery.items.length >= 32} onClick={() => galleryItems([...gallery.items, { id: createId("media"), enabled: true, type: "image", url: "", caption: "", href: "" }])}><Plus size={15} />添加展示素材</button>
      </>}
    </SettingPanel>
    <SettingPanel title="文章列表与默认卡片" description="编辑“项目与动态”页面的标题、说明、分类与未设置封面时的文字。文章正文仍在“文章管理”中编辑。">
      <TextFields value={s.articles} onChange={(next) => setS((prev) => ({ ...prev, articles: next }))} fields={[
        { key: "eyebrow", label: "页面标题上方的小字", maxLength: 250 }, { key: "title", label: "文章列表标题", maxLength: 250 },
        { key: "description", label: "文章列表说明", multiline: true, maxLength: 4000 }, { key: "emptyText", label: "没有匹配文章时的提示", maxLength: 250 },
        { key: "undatedLabel", label: "未填写日期时的文字", maxLength: 100 },
      ]} />
      <div className="editor-grid"><TextFields value={s.articles} onChange={(next) => setS((prev) => ({ ...prev, articles: next }))} fields={[{ key: "coverLeft", label: "默认封面左侧文字", maxLength: 100 }, { key: "coverRight", label: "默认封面右侧文字", maxLength: 100 }, { key: "coverCaption", label: "默认封面说明", maxLength: 250 }]} /></div>
      <LinesField label="文章分类" value={s.articles.categories} maxLength={800} help="每行一个分类，最多 20 项，每项不超过 40 字。调整列表不会自动修改现有文章的分类。" onChange={(categories) => setS((prev) => ({ ...prev, articles: { ...prev.articles, categories } }))} />
    </SettingPanel>
  </>;
}
