import { SiteLink } from "./router";
import { MediaImage, MediaVideo } from "./media";
import { useState } from "react";
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
import { Article } from "./content";
import { logoutAdmin, mediaUrl } from "./api-client";
import { usePublicState, useSessionState } from "./site-state";
export { ArrowUpRight, ArrowRight, MapPin, Play };
export const usePublic = usePublicState;
export const useSession = useSessionState;
export function Header() {
  const [open, setOpen] = useState(false);
  const { isAdmin } = useSession();
  return (
    <header className="header">
      <SiteLink href="/" className="brand">
        <span className="brand-mark">
          <Network size={27} />
        </span>
        <span>
          <b>机器人实验室</b>
          <small>中南大学 · 数学与统计学院</small>
        </span>
      </SiteLink>
      <button
        className="menu-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? "关闭菜单" : "打开菜单"}
        aria-expanded={open}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? "nav open" : "nav"}>
        <SiteLink href="/#about" onClick={() => setOpen(false)}>
          关于实验室
        </SiteLink>
        <SiteLink href="/#research" onClick={() => setOpen(false)}>
          研究方向
        </SiteLink>
        <SiteLink href="/#platforms" onClick={() => setOpen(false)}>
          实验平台
        </SiteLink>
        <SiteLink href="/articles">项目与动态</SiteLink>
        <SiteLink href="/admin" className="admin-entry">
          {isAdmin ? "管理工作台" : "管理员登录"}
        </SiteLink>
        <SiteLink href="/join" className="button small">
          加入我们 <ArrowUpRight size={16} />
        </SiteLink>
      </nav>
    </header>
  );
}
export function Footer() {
  const { settings } = usePublic();
  return (
    <footer className="footer wrap">
      <div>
        <SiteLink className="footer-title" href="/">
          中南大学数学与统计学院
          <br />
          机器人实验室
        </SiteLink>
        <p>理解任务 · 感知环境 · 自主行动</p>
      </div>
      <div>
        <span>联系我们</span>
        <p>{settings.location}</p>
        {settings.contact && <p>{settings.contact}</p>}
        <SiteLink href="/#about">
          了解实验室 <ArrowUpRight size={14} />
        </SiteLink>
      </div>
      <div>
        <span>探索更多</span>
        <SiteLink href="/articles">项目与动态</SiteLink>
        <SiteLink href="/#platforms">实验平台</SiteLink>
        <SiteLink href="/admin">
          管理入口 <ArrowUpRight size={14} />
        </SiteLink>
      </div>
      <div className="footer-bottom">
        <small>CSU · MATHEMATICS & STATISTICS · ROBOTICS LAB</small>
        <small>让好奇心，在真实世界中得到验证。</small>
      </div>
    </footer>
  );
}
export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <AdminBar />
      <main>{children}</main>
      <Footer />
    </>
  );
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
  const Icon = [Network, BrainCircuit, Blocks, ScanEye][index];
  return <Icon size={28} strokeWidth={1.5} />;
}
export function ErrorNotice({ error }: { error: string }) {
  return error ? (
    <div role="alert" className="notice error">
      {error} <button onClick={() => location.reload()}>重新加载</button>
    </div>
  ) : null;
}
export function Cover({ article }: { article: Article }) {
  return article.cover ? (
    <MediaImage src={article.cover} alt={article.title} loading="lazy" />
  ) : (
    <div className="diagram-cover">
      <span>PERCEIVE</span>
      <i />
      <BrainCircuit size={58} strokeWidth={1} />
      <i />
      <span>ACT</span>
      <small>从指令到行动</small>
    </div>
  );
}
export function ArticleCard({ article }: { article: Article }) {
  return (
    <SiteLink className="article-card" href={"/articles/" + article.id}>
      <div className="card-cover">
        <Cover article={article} />
        <span className="circle-arrow">
          <ArrowUpRight size={21} />
        </span>
      </div>
      <div className="card-meta">
        <span>{article.category}</span>
        <small>{article.date || "实验室介绍"}</small>
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
