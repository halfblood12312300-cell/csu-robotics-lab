import { type CSSProperties, type ReactNode } from "react";
import { SiteLink } from "./router";
import { MediaImage, MediaVideo } from "./media";
import { type Article } from "./content";
import { type HomeModuleId, type SectionHeading, type Settings } from "./site-config";
import {
  Frame, Eyebrow, ArrowUpRight, DirectionIcon, ArticleCard, usePublic, ErrorNotice, ContentAction,
} from "./ui";

const columns = (value: number): CSSProperties => ({ "--content-columns": value, "--mobile-columns": Math.min(2, value) } as CSSProperties);
function Heading({ heading, children }: { heading: SectionHeading; children?: ReactNode }) {
  return <div className="section-heading">
    <div>
      {(heading.eyebrow || heading.number) && <Eyebrow number={heading.number}>{heading.eyebrow}</Eyebrow>}
      {heading.title && <h2 className="cms-lines">{heading.title}</h2>}
    </div>
    {(heading.description || children) && <div className="section-heading-aside">
      {heading.description && <p className="cms-lines">{heading.description}</p>}{children}
    </div>}
  </div>;
}

/** The same renderer is used by the public homepage and the administrator's unsaved preview. */
export function HomeContent({ settings, articles, preview = false, error = "" }: {
  settings: Settings; articles: Article[]; preview?: boolean; error?: string;
}) {
  const { home } = settings;
  const directions = home.research.directions.filter((item) => item.enabled);
  const platforms = home.platforms.items.filter((item) => item.enabled);
  const stats = home.stats.items.filter((item) => item.enabled);
  const eligibleArticles = articles.filter((article) => article.status === "published" &&
    (!home.stories.excludeRecruitment || article.category !== "招新通知"));
  const featured = home.stories.featuredIds.flatMap((id) => {
    const article = eligibleArticles.find((value) => value.id === id);
    return article ? [article] : [];
  });
  const shownArticles = [...featured, ...eligibleArticles.filter((article) => !home.stories.featuredIds.includes(article.id))]
    .slice(0, home.stories.limit);
  const gallery = (home.gallery.source === "manual"
    ? home.gallery.items.filter((item) => item.enabled && item.url)
    : eligibleArticles.flatMap((article) => article.media.map((item, index) => ({
      ...item, id: `${article.id}-${index}`, enabled: true, caption: item.caption || article.title, href: "/articles/" + article.id,
    })))).slice(0, home.gallery.limit);

  const modules: Record<HomeModuleId, ReactNode> = {
    hero: <section className={"hero wrap hero-" + home.hero.layout + (!settings.heroImage && !settings.heroVideo ? " hero-no-media" : "")} id="about">
      <div className="hero-copy">
        {home.hero.eyebrow && <Eyebrow>{home.hero.eyebrow}</Eyebrow>}
        <h1><span className="cms-lines">{home.hero.title}</span>{home.hero.highlight && <em className="hero-highlight cms-lines">{home.hero.highlight}</em>}</h1>
        {settings.intro && <p className="cms-lines">{settings.intro}</p>}
        <div className="hero-actions">
          <ContentAction link={home.hero.primary} settings={settings} className="button" />
          <ContentAction link={home.hero.secondary} settings={settings} arrow="right" />
        </div>
        {home.hero.note && <div className="hero-note"><span className="dot" />{home.hero.note}</div>}
      </div>
      {(settings.heroImage || settings.heroVideo) && <div className="hero-visual">
        <div className="hero-photo">
          {settings.heroVideo
            ? <MediaVideo preview={preview} src={settings.heroVideo} controls playsInline poster={settings.heroImage || undefined} preload="metadata" aria-label={home.hero.imageAlt} />
            : <MediaImage preview={preview} src={settings.heroImage} alt={home.hero.imageAlt} fetchPriority="high" />}
          {(home.hero.photoLabel || home.hero.photoLabelEn) && <div className="photo-label">
            <span>{home.hero.photoLabelEn}</span><b>{home.hero.photoLabel}</b>
          </div>}
        </div>
        {(home.hero.visualLeft || home.hero.visualRight) && <div className="visual-bottom">
          <span>{home.hero.visualLeft}</span><span>{home.hero.visualRight}{home.hero.visualRight && <ArrowUpRight size={17} />}</span>
        </div>}
        {home.hero.imageCredit && <div className="image-credit cms-lines">{home.hero.imageCredit}</div>}
      </div>}
    </section>,
    stats: (stats.length > 0 || home.stats.statement) && <section className="stats wrap configurable-stats" id="stats"
      style={{ "--stat-columns": Math.max(1, Math.min(4, stats.length + (home.stats.statement ? 1 : 0))) } as CSSProperties} aria-label="数据概览">
      {stats.map((item) => <div key={item.id}><strong>{item.value}{item.unit && <span>{item.unit}</span>}</strong><p>{item.label}</p></div>)}
      {home.stats.statement && <div className="stats-statement cms-lines">{home.stats.statement}</div>}
    </section>,
    research: <section className="research section wrap" id="research">
      <Heading heading={home.research.heading} />
      {directions.length > 0 && <div className="research-grid cms-grid" style={columns(Math.min(home.research.columns, directions.length))}>
        {directions.map((direction, index) => <SiteLink href={"/research/" + direction.id} key={direction.id} className="research-item">
          <div className="research-top"><DirectionIcon index={index} /><span>{direction.number}</span></div>
          {direction.en && <small>{direction.en}</small>}<h3>{direction.title}</h3>
          {direction.desc && <p className="cms-lines">{direction.desc}</p>}
          <div className="tags">{direction.tags.map((tag, tagIndex) => <span key={tagIndex}>{tag}</span>)}</div>
          <span className="research-arrow"><ArrowUpRight size={22} /></span>
        </SiteLink>)}
      </div>}
    </section>,
    platforms: <section className="platform-section" id="platforms"><div className="wrap section">
      <Heading heading={home.platforms.heading} />
      {platforms.length > 0 && <div className="platform-grid cms-grid" style={columns(Math.min(home.platforms.columns, platforms.length))}>
        {platforms.map((platform) => <article key={platform.id} className="platform">
          {platform.image && <MediaImage preview={preview} src={platform.image} alt={platform.imageAlt || platform.title} loading="lazy" />}
          <div className="platform-content">
            <div>{platform.kind && <small>{platform.kind}</small>}<h3>{platform.title}{platform.subtitle && <span>{platform.subtitle}</span>}</h3></div>
            {platform.count && <b>{platform.count}{platform.unit && <span>{platform.unit}</span>}</b>}
            {platform.description && <p className="cms-lines">{platform.description}</p>}
            <ContentAction link={platform.link} settings={settings} />
          </div>
        </article>)}
      </div>}
      {(home.platforms.note || home.platforms.sources.some((link) => link.enabled)) && <div className="platform-note">
        {home.platforms.note && <span className="cms-lines">{home.platforms.note}</span>}
        <div className="platform-sources">{home.platforms.sources.map((link, index) => <ContentAction key={index} link={link} settings={settings} arrow="none" />)}</div>
      </div>}
    </div></section>,
    stories: <section className="section wrap" id="stories">
      <Heading heading={home.stories.heading}><ContentAction link={home.stories.moreLink} settings={settings} arrow="right" /></Heading>
      {shownArticles.length > 0 && <div className="article-grid cms-grid" style={columns(home.stories.columns)}>
        {shownArticles.map((article) => <ArticleCard key={article.id} article={article} display={settings.articles} preview={preview} />)}
      </div>}
    </section>,
    gallery: gallery.length > 0 && <section className="media-section section wrap" id="media">
      <Heading heading={home.gallery.heading} />
      <div className="media-grid cms-grid" style={columns(home.gallery.columns)}>{gallery.map((item) => <figure key={item.id}>
        {item.type === "video" ? <MediaVideo preview={preview} controls playsInline preload="metadata" src={item.url} aria-label={item.caption || "视频"} />
          : item.href ? <SiteLink href={item.href}><MediaImage preview={preview} src={item.url} alt={item.caption} loading="lazy" /></SiteLink>
          : <MediaImage preview={preview} src={item.url} alt={item.caption} loading="lazy" />}
        {item.caption && <figcaption>{item.type === "video" && item.href ? <SiteLink href={item.href}>{item.caption}</SiteLink> : item.caption}</figcaption>}
      </figure>)}</div>
    </section>,
    banner: <section className="join-banner wrap" id="banner"><div>
      {home.banner.eyebrow && <Eyebrow>{home.banner.eyebrow}</Eyebrow>}
      {home.banner.title && <h2 className="cms-lines">{home.banner.title}</h2>}
      {home.banner.description && <p className="cms-lines">{home.banner.description}</p>}
      <ContentAction link={home.banner.button} settings={settings} className="button white" />
    </div>{home.banner.symbol && <div className="join-symbol" aria-hidden="true">{home.banner.symbol}<span>{home.banner.symbolCaption}</span></div>}</section>,
  };
  return <div className="home-content">
    {error && <div className="wrap home-error"><ErrorNotice error={error} /></div>}
    {home.modules.filter((module) => module.enabled).map((module) => <div key={module.id} className={"home-module home-module-" + module.id} data-home-module={module.id}>{modules[module.id]}</div>)}
  </div>;
}

export default function Home({ preview = false }: { preview?: boolean }) {
  const { settings, articles, error } = usePublic();
  return <Frame preview={preview}><HomeContent settings={settings} articles={articles} error={error} preview={preview} /></Frame>;
}
