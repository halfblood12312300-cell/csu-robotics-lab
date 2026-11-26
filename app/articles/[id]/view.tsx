import { SiteLink } from "../../router";
import { MediaImage, MediaVideo } from "../../media";
import { Frame, ArticleBody, usePublic, ErrorNotice, ArrowRight } from "../../ui";

export default function ArticleView({ id }: { id: string }) {
  const { settings, articles, loading, error } = usePublic();
  const article = articles.find((item) => item.id === id);
  const originalDeviceCover = article && ["/media/a2-scene.jpg", "/media/h2-scene.jpg"].includes(article.cover);
  return <Frame><div className="article-page wrap">
    <SiteLink href="/articles" className="back">← 返回{settings.articles.title}</SiteLink><ErrorNotice error={error} />
    {article ? <>
      <div className="card-meta"><span>{article.category}</span><span>{article.date || settings.articles.undatedLabel}</span></div>
      <h1>{article.title}</h1><p className="article-lead">{article.summary}</p>
      {article.cover && <figure className="article-hero"><MediaImage src={article.cover} alt={article.title} />
        {originalDeviceCover && <figcaption>设备图片来源：宇树官方产品资料，非实验室实拍</figcaption>}</figure>}
      <ArticleBody body={article.body} />
      {article.media.map((media, index) => <figure className="article-media" key={index}>
        {media.type === "video" ? <MediaVideo controls playsInline preload="metadata" src={media.url} />
          : <MediaImage src={media.url} alt={media.caption || article.title} />}
        {media.caption && <figcaption>{media.caption}</figcaption>}
      </figure>)}
      {settings.home.modules.some((module) => module.id === "research" && module.enabled) && <div className="article-cta">
        <span>继续探索相关研究与实验记录。</span><SiteLink href="/#research" className="text-link">浏览研究方向<ArrowRight size={18} /></SiteLink>
      </div>}
    </> : <div className="empty">{loading ? "正在加载文章…" : "文章不存在或尚未发布。"}</div>}
  </div></Frame>;
}
