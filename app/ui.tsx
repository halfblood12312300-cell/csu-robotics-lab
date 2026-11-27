import { SiteLink } from "./router";
import { MediaImage, MediaVideo } from "./media";
import { useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  MapPin,
  Network,
  ScanEye,
  Blocks,
  BrainCircuit,
  Play,
} from "lucide-react";
import { type Article } from "./content";
import { defaultSettings, type ContentLink, type Settings } from "./site-config";
import { logoutAdmin, mediaUrl } from "./api-client";
import { usePublicState, useSessionState } from "./site-state";
export { ArrowUpRight, ArrowRight, MapPin, Play };
export const usePublic = usePublicState;
export const useSession = useSessionState;
export function contentLinkVisible(link: ContentLink, settings?: Settings) {
  if (!link.enabled || !link.label.trim() || !link.href.trim()) return false;
  const anchors: Record<string, string> = { about: "hero", stats: "stats", research: "research", platforms: "platforms", stories: "stories", media: "gallery", banner: "banner" };
  const anchor = link.href.match(/^\/?#([^?]+)$/)?.[1];
  const module = anchor ? anchors[anchor] : undefined;
  return !module || !settings || settings.home.modules.some((item) => item.id === module && item.enabled);
}
export function ContentAction({ link, settings, className = "text-link", arrow = "up" }: {
  link: ContentLink; settings?: Settings; className?: string; arrow?: "up" | "right" | "none";
}) {
  if (!contentLinkVisible(link, settings)) return null;
  return <SiteLink href={link.href} className={className}
    {...(/^https?:/.test(link.href) ? { target: "_blank", rel: "noreferrer" } : {})}>
    {link.label}{arrow === "up" ? <ArrowUpRight size={18} /> : arrow === "right" ? <ArrowRight size={18} /> : null}
  </SiteLink>;
}
export function siteThemeStyle(settings: Settings): CSSProperties {
  const rgb = (value: string): number[] => {
    const raw = /^#[a-f0-9]{3}([a-f0-9]{3})?$/i.test(value) ? value.slice(1) : "244bd8";
    const hex = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
    return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
  };
  const luminance = (channels: number[]) => channels.map((channel) => channel / 255)
    .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const contrast = (first: number[], second: number[]) => {
    const a = luminance(first), b = luminance(second);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  };
  const accent = rgb(settings.theme.accentColor), background = rgb(settings.theme.backgroundColor);
  const dark = luminance(background) < .179;
  const surface = dark ? [25, 39, 59] : [255, 255, 255];
  let foregroundAccent = accent;
  for (let step = 1; step <= 10 && (contrast(foregroundAccent, background) < 4.5 || contrast(foregroundAccent, surface) < 4.5); step++) {
    foregroundAccent = accent.map((channel) => Math.round(channel + ((dark ? 255 : 0) - channel) * step / 10));
  }
  return {
    "--blue": settings.theme.accentColor,
    "--accent-text": `rgb(${foregroundAccent.join(",")})`,
    "--accent-ink": contrast(accent, [255, 255, 255]) >= contrast(accent, [21, 32, 49]) ? "#ffffff" : "#152031",
    "--ink": dark ? "#eef2f8" : "#152031",
    "--muted": dark ? "#bac5d4" : "#697384",
    "--line": dark ? "#374457" : "#e2e6ed",
    "--soft": dark ? "#213048" : "#f5f6f9",
    "--public-surface": dark ? "#19273b" : "#ffffff",
    "--public-background": settings.theme.backgroundColor,
    "--content-width": { compact: "1040px", standard: "1240px", wide: "1440px" }[settings.theme.contentWidth],
    "--section-space": settings.theme.spacing === "compact" ? "58px" : "96px",
    "--public-radius": settings.theme.cornerStyle === "rounded" ? "18px" : "4px",
  } as CSSProperties;
}
export function Header({ preview = false }: { preview?: boolean }) {
  const [open, setOpen] = useState(false);
  const { isAdmin } = useSession();
  const { settings } = usePublic();
  const site = settings.site;
  return (
    <header className={"header" + (settings.theme.stickyHeader ? "" : " header-static")}>
      <SiteLink href="/" className="brand" onClick={() => setOpen(false)}>
        <span className={"brand-mark" + (site.logo ? " has-logo" : "")}>
          {site.logo ? <MediaImage preview={preview} src={site.logo} alt={site.logoAlt} /> : <Network size={27} />}
        </span>
        <span><b>{site.name}</b>{site.subtitle && <small>{site.subtitle}</small>}</span>
      </SiteLink>
      <button className="menu-toggle" onClick={() => setOpen(!open)}
        aria-label={open ? "关闭菜单" : "打开菜单"} aria-expanded={open} aria-controls="site-navigation">
        {open ? <X /> : <Menu />}
      </button>
      <nav id="site-navigation" className={open ? "nav open" : "nav"} aria-label="主导航">
        {site.navLinks.filter((link) => contentLinkVisible(link, settings)).map((link) => (
          <SiteLink key={link.id} href={link.href} onClick={() => setOpen(false)}
            {...(/^https?:/.test(link.href) ? { target: "_blank", rel: "noreferrer" } : {})}>{link.label}</SiteLink>
        ))}
        {site.showAdminLink && <SiteLink href="/admin" className="admin-entry" onClick={() => setOpen(false)}>
          {isAdmin ? site.workbenchLabel : site.adminLabel}
        </SiteLink>}
        {site.showJoin && <SiteLink href="/join" className="button small" onClick={() => setOpen(false)}>
          {site.joinLabel}<ArrowUpRight size={16} />
        </SiteLink>}
      </nav>
    </header>
  );
}
export function Footer() {
  const { settings, syncedAt } = usePublic();
  const footer = settings.footer;
  return <footer className="footer wrap">
    <div>
      <SiteLink className="footer-title cms-lines" href="/">{footer.title}</SiteLink>
      {footer.tagline && <p className="cms-lines">{footer.tagline}</p>}
    </div>
    <div>
      {footer.contactTitle && <span>{footer.contactTitle}</span>}
      {settings.location && <p className="cms-lines">{settings.location}</p>}
      {settings.contact && <p className="cms-lines">{settings.contact}</p>}
      <ContentAction link={footer.aboutLink} settings={settings} />
    </div>
    <div>
      {footer.exploreTitle && <span>{footer.exploreTitle}</span>}
      {footer.links.map((link) => <ContentAction key={link.id} link={link} settings={settings} arrow="none" />)}
      {settings.site.showAdminLink && <SiteLink href="/admin">{footer.adminLabel}<ArrowUpRight size={14} /></SiteLink>}
    </div>
    {syncedAt && <div className="footer-bottom"><small>公开网站同步时间（北京时间）：{new Date(syncedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}</small></div>}
    {(footer.bottomLeft || footer.bottomRight) && <div className="footer-bottom">
      <small className="cms-lines">{footer.bottomLeft}</small><small className="cms-lines">{footer.bottomRight}</small>
    </div>}
  </footer>;
}
export function Frame({ children, preview = false }: { children: React.ReactNode; preview?: boolean }) {
  const { settings } = usePublic();
  return <div className={"public-site" + (preview ? " public-preview" : "")}
    data-spacing={settings.theme.spacing} data-corners={settings.theme.cornerStyle} style={siteThemeStyle(settings)}
    onClickCapture={preview ? (event) => {
      if ((event.target as HTMLElement).closest("a")) event.preventDefault();
    } : undefined}>
    <Header preview={preview} />{!preview && <AdminBar />}<main>{children}</main><Footer />
  </div>;
}
export function AdminBar() {
  const { isAdmin } = useSession();
  return isAdmin ? (
    <div className="admin-view-bar">
      <span>管理员已登录 · 当前为网站展示页面</span>
      <div>
        <SiteLink href="/admin">进入工作台 →</SiteLink>
        <button type="button" onClick={() => { void logoutAdmin(); }}>
          退出登录
        </button>
      </div>
    </div>
  ) : null;
}
export function Eyebrow({
  number,
  children,
}: {
  number?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="eyebrow">
      {number && <span>{number} /</span>}
      {children}
    </div>
  );
}
export function DirectionIcon({ index }: { index: number }) {
  const icons = [Network, BrainCircuit, Blocks, ScanEye];
  const Icon = icons[index % icons.length] || Network;
  return <Icon size={28} strokeWidth={1.5} />;
}
export function ErrorNotice({ error }: { error: string }) {
  return error ? (
    <div role="alert" className="notice error">
      {error} <button onClick={() => location.reload()}>重新加载</button>
    </div>
  ) : null;
}
export function Cover({ article, display = defaultSettings.articles, preview = false }: { article: Article; display?: Settings["articles"]; preview?: boolean }) {
  return article.cover ? (
    <MediaImage preview={preview} src={article.cover} alt={article.title} loading="lazy" />
  ) : (
    <div className="diagram-cover">
      <span>{display.coverLeft}</span>
      <i />
      <BrainCircuit size={58} strokeWidth={1} />
      <i />
      <span>{display.coverRight}</span>
      <small>{display.coverCaption}</small>
    </div>
  );
}
export function ArticleCard({ article, display = defaultSettings.articles, preview = false }: { article: Article; display?: Settings["articles"]; preview?: boolean }) {
  return (
    <SiteLink className="article-card" href={"/articles/" + article.id}>
      <div className="card-cover">
        <Cover article={article} display={display} preview={preview} />
        <span className="circle-arrow">
          <ArrowUpRight size={21} />
        </span>
      </div>
      <div className="card-meta">
        <span>{article.category}</span>
        <small>{article.date || display.undatedLabel}</small>
      </div>
      <h3>{article.title}</h3>
      <p>{article.summary}</p>
    </SiteLink>
  );
}
function safeMediaUrl(url: string) {
  return !!mediaUrl(url);
}
function inlineText(line: string) {
  return line
    .split(/(\*\*[^*]+\*\*)/g)
    .map((s, i) =>
      s.startsWith("**") && s.endsWith("**") ? (
        <strong key={i}>{s.slice(2, -2)}</strong>
      ) : (
        s
      ),
    );
}
export function ArticleBody({ body, preview = false }: { body: string; preview?: boolean }) {
  return (
    <div className="prose">
      {body.split(/\n\s*\n/).map((block, i) => (
        <div key={i}>
          {block.split("\n").map((line, j) => {
            const m = line.match(/^(!|@video)\[([^\]]*)\]\(([^)]+)\)$/);
            if (m && safeMediaUrl(m[3]))
              return (
                <figure className="article-media" key={j}>
                  {m[1] === "@video" ? (
                    <MediaVideo preview={preview} controls playsInline preload="metadata" src={m[3]} />
                  ) : (
                    <MediaImage preview={preview} loading="lazy" src={m[3]} alt={m[2]} />
                  )}
                  <figcaption>{m[2]}</figcaption>
                </figure>
              );
            return line.startsWith("## ") ? (
              <h2 key={j}>{inlineText(line.slice(3))}</h2>
            ) : line.startsWith("# ") ? (
              <h2 key={j}>{inlineText(line.slice(2))}</h2>
            ) : line.startsWith("- ") ? (
              <p className="bullet" key={j}>
                • {inlineText(line.slice(2))}
              </p>
            ) : (
              <p key={j}>{inlineText(line)}</p>
            );
          })}
        </div>
      ))}
    </div>
  );
}
