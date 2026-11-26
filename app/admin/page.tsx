import { SiteLink } from "../router";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  Images,
  Users,
  Settings2,
  Network,
  ArrowUpRight,
  LogOut,
  ShieldCheck,
  Plus,
  UploadCloud,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { Frame, useSession } from "../ui";
import { clearAdminSession, getAdminSession, isApiConfigured, loginAdmin, logoutAdmin } from "../api-client";
import { navigate, useRoute } from "../router";
import { Asset } from "../content";
import repositoryAssets from "virtual:repository-media";
import { MediaCapabilitiesContext, repositoryMediaFolder } from "./media-context";
import { api, AdminData, Modal } from "./shared";
import { Articles } from "./components/articles";
import { Applications } from "./components/applications";
import { MediaLibrary } from "./components/media-library";
import { Settings } from "./components/settings";
const sections = [
  { id: "overview", label: "工作台", icon: LayoutDashboard },
  { id: "articles", label: "文章管理", icon: FileText },
  { id: "media", label: "素材库", icon: Images },
  { id: "applications", label: "报名管理", icon: Users },
  { id: "settings", label: "网站设置", icon: Settings2 },
];
export default function Admin() {
  const session = useSession();
  const route = useRoute();
  const configured = isApiConfigured();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [newArticle, setNewArticle] = useState(false);
  const [notice, setNotice] = useState("");
  const [guide, setGuide] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  async function load() {
    try {
      const d = await api("admin");
      if (!getAdminSession()) return;
      setData({
        ...d,
        capabilities: { mediaUpload: d.capabilities?.mediaUpload === true },
        assets: [...repositoryAssets, ...d.assets.map((asset: Asset) => ({ ...asset, source: "r2" as const }))],
      });
      setError("");
      setDenied(false);
    } catch (e) {
      setError((e as Error).message);
      const unauthorized = [401, 403].includes((e as any).status);
      setDenied(unauthorized);
      if (unauthorized) { setData(null); clearAdminSession(); }
      throw e;
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const section = new URLSearchParams(route.search).get("section");
    setTab(sections.some((s) => s.id === section) ? section! : "overview");
  }, [route.search]);
  useEffect(() => {
    if (session.loading) return;
    if (session.isAdmin) {
      setLoading(true);
      load().catch(() => {});
    } else {
      setData(null);
      setLoading(false);
      setDenied(true);
    }
  }, [session.isAdmin, session.loading]);
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || loggingIn) return;
    setLoggingIn(true);
    setLoginError("");
    try {
      await loginAdmin(accessKey);
      setAccessKey("");
    } catch (failure) { setLoginError((failure as Error).message); }
    finally { setLoggingIn(false); }
  }
  async function signOut() {
    if (document.querySelector('[data-uploading="true"]')) {
      setNotice("文件正在上传，请完成或取消上传后再退出。");
      return;
    }
    if (document.querySelector('[data-unsaved="true"]') && !window.confirm("还有修改未保存，确定退出登录吗？")) return;
    await logoutAdmin();
    setData(null);
    navigate("/admin", true);
  }
  function go(id: string, create = false) {
    if (document.querySelector('[data-uploading="true"]')) {
      setNotice("文件正在上传，请完成或取消后再切换。");
      return;
    }
    if (
      document.querySelector('[data-unsaved="true"]') &&
      !window.confirm("还有修改未保存到网站，确定离开当前页面吗？")
    )
      return;
    setTab(id);
    setNewArticle(create);
    setNotice("");
    navigate("/admin" + (id === "overview" ? "" : "?section=" + id), true);
  }
  function addAsset(asset: Asset) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            assets: [asset, ...prev.assets.filter((a) => a.id !== asset.id)],
          }
        : prev,
    );
  }
  if (!data)
    return (
      <Frame>
        <section className="admin-login wrap">
          <div className="login-visual">
            <div className="login-icon">
              <ShieldCheck size={38} />
            </div>
            <span className="eyebrow">LAB CONTENT WORKSPACE</span>
            <h1>
              让每一次探索，
              <br />
              被更多人看见。
            </h1>
            <p>
              文章、照片、视频与招新信息，
              <br />
              在一个工作台中完成管理。
            </p>
            <div className="login-features">
              <span>
                <FileText size={17} />
                文章编辑
              </span>
              <span>
                <Images size={17} />
                素材管理
              </span>
              <span>
                <Users size={17} />
                报名维护
              </span>
            </div>
          </div>
          <div className="login-card">
            <LockKeyhole size={27} />
            <h2>管理员登录</h2>
            <p>
              首页、文章与报名共用同一套展示页面。管理员登录后，可进入内容维护工作台。
            </p>
            {loading || session.loading ? (
              <div className="notice">正在检查登录状态…</div>
            ) : !configured ? (
              <>
                <div className="notice">内容管理暂未启用。</div>
                <p className="login-help">实验室介绍与研究展示可以正常浏览，内容管理开放后可在这里登录。</p>
                <SiteLink href="/" className="button login-button">返回实验室首页 <ArrowUpRight size={17} /></SiteLink>
              </>
            ) : (
              <>
                {!denied && error && <div className="notice error" role="alert">{error}</div>}
                <form className="admin-key-form" onSubmit={signIn}>
                  <label htmlFor="admin-access-key">管理员访问密钥
                    <input id="admin-access-key" type="password" name="access-key" autoComplete="current-password" required maxLength={200} value={accessKey} onChange={(event) => setAccessKey(event.target.value)} placeholder="输入实验室管理员访问密钥" disabled={loggingIn} />
                  </label>
                  {loginError && <div className="notice error" role="alert">{loginError}</div>}
                  <button className="button login-button" type="submit" disabled={loggingIn || !accessKey.trim()}>{loggingIn ? "正在登录…" : "登录管理工作台"} <ArrowUpRight size={17} /></button>
                </form>
                <p className="login-help">
                  请使用网站维护者提供的访问密钥。登录仅保留在当前浏览器标签页，离开时请退出。
                </p>
                <div className="cms-actions">
                  <button
                    className="text-link"
                    onClick={() => location.reload()}
                  >
                    <RefreshCw size={14} />
                    重新检查
                  </button>
                  <SiteLink href="/" className="text-link">
                    返回首页
                  </SiteLink>
                </div>
              </>
            )}
          </div>
        </section>
      </Frame>
    );
  const mediaUpload = data.capabilities?.mediaUpload === true;
  const published = data.articles.filter((a) => a.status === "published"),
    drafts = data.articles.filter((a) => a.status === "draft"),
    assets = data.assets.filter((a) => !a.archived),
    pending = data.applications.filter((a) => a.status === "待查看");
  return (
    <MediaCapabilitiesContext.Provider value={{ mediaUpload }}>
    <div className="cms-shell">
      <aside className="cms-sidebar">
        <SiteLink href="/" className="brand cms-brand">
          <span className="brand-mark">
            <Network size={25} />
          </span>
          <span>
            <b>机器人实验室</b>
            <small>内容管理工作台</small>
          </span>
        </SiteLink>
        <div className="sidebar-label">WORKSPACE / 管理</div>
        <nav aria-label="管理导航">
          {sections.map((s) => (
            <button
              key={s.id}
              aria-current={tab === s.id ? "page" : undefined}
              className={tab === s.id ? "active" : ""}
              onClick={() => go(s.id)}
            >
              <s.icon size={19} />
              {s.label}
              {s.id === "applications" && pending.length > 0 && (
                <span>{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setGuide(true)}>
            <BookOpen size={17} />
            维护指南
          </button>
          <SiteLink href="/" target="_blank" rel="noreferrer">
            <ArrowUpRight size={17} />
            查看网站首页
          </SiteLink>
          <div className="admin-identity">
            <span className="identity-avatar">管</span>
            <div>
              <b>实验室管理员</b>
              <small>已通过身份验证</small>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <div className="cms-body">
        <header className="cms-topbar">
          <span>
            中南大学 · 数学与统计学院 <i>/</i>{" "}
            <b>{sections.find((s) => s.id === tab)?.label}</b>
          </span>
          <div>
            <SiteLink href="/" className="top-preview">
              浏览网站 <ArrowUpRight size={14} />
            </SiteLink>
            <button type="button" onClick={() => { void signOut(); }} className="signout">
              <LogOut size={16} />
              <span>退出登录</span>
            </button>
          </div>
        </header>
        <main className="cms-main">
          {notice && (
            <div className="notice cms-notice" role="status">
              <span>{notice}</span>
              <button aria-label="关闭提示" onClick={() => setNotice("")}>
                ×
              </button>
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button onClick={() => load().catch(() => {})}>重新加载</button>
            </div>
          )}
          {tab === "overview" && (
            <>
              <div className="cms-heading">
                <div>
                  <span className="eyebrow">CONTENT & COMMUNITY</span>
                  <h1>欢迎回到实验室工作台</h1>
                  <p>把研究进展与精彩瞬间，分享给每一位好奇的同学。</p>
                </div>
                <button
                  className="button small"
                  onClick={() => go("articles", true)}
                >
                  <Plus size={17} />
                  写一篇文章
                </button>
              </div>
              <div className="dashboard-stats">
                {[
                  {
                    label: "已发布文章",
                    value: published.length,
                    detail: drafts.length + " 篇草稿待整理",
                    icon: FileText,
                    tab: "articles",
                  },
                  {
                    label: "图片与视频",
                    value: assets.length,
                    detail:
                      assets.filter((a) => a.type === "video").length +
                      " 个视频素材",
                    icon: Images,
                    tab: "media",
                  },
                  {
                    label: "报名人数",
                    value: data.applications.length,
                    detail: pending.length + " 份报名待查看",
                    icon: Users,
                    tab: "applications",
                  },
                  {
                    label: "在线报名",
                    value: data.settings.registrationOpen ? "已开放" : "未开放",
                    detail: data.settings.deadline
                      ? "截止 " + data.settings.deadline
                      : "可在网站设置中调整",
                    icon: Settings2,
                    tab: "settings",
                  },
                ].map((s) => (
                  <button key={s.label} onClick={() => go(s.tab)}>
                    <div>
                      <span>{s.label}</span>
                      <s.icon size={20} />
                    </div>
                    <b>{s.value}</b>
                    <small>
                      {s.detail}
                      <ArrowUpRight size={14} />
                    </small>
                  </button>
                ))}
              </div>
              <div className="dashboard-middle">
                <section className="cms-panel quick-start">
                  <span className="eyebrow">QUICK START</span>
                  <h2>今天，分享一点新进展。</h2>
                  <p>从一篇文章，或一段实验影像开始。</p>
                  <div className="quick-actions">
                    <button onClick={() => go("articles", true)}>
                      <span>
                        <FileText size={22} />
                      </span>
                      <b>新建文章</b>
                      <small>记录实验与研究动态</small>
                      <ArrowUpRight size={18} />
                    </button>
                    <button onClick={() => go("media")}>
                      <span>
                        <UploadCloud size={23} />
                      </span>
                      <b>{mediaUpload ? "上传宣传素材" : "管理仓库素材"}</b>
                      <small>{mediaUpload ? "批量上传图片和视频" : "从 GitHub 添加公开图片和短视频"}</small>
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </section>
                <section className="cms-panel workflow-guide">
                  <h2>一次发布，三步完成</h2>
                  {[
                    ["01", mediaUpload ? "上传素材" : "添加公开素材", mediaUpload ? "把照片或视频放进素材库" : "在 GitHub 仓库添加图片或短视频"],
                    ["02", "编辑与预览", "写正文、选封面，检查展示效果"],
                    ["03", "确认发布", "草稿转为发布后，展示在网站中"],
                  ].map(([n, t, d]) => (
                    <div key={n}>
                      <span>{n}</span>
                      <div>
                        <b>{t}</b>
                        <small>{d}</small>
                      </div>
                    </div>
                  ))}
                  <button className="text-link" onClick={() => setGuide(true)}>
                    查看维护指南 <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <div className="dashboard-bottom">
                <section className="cms-panel">
                  <div className="panel-title">
                    <h2>最近的文章</h2>
                    <button
                      className="text-link"
                      onClick={() => go("articles")}
                    >
                      管理全部 <ArrowRight size={15} />
                    </button>
                  </div>
                  {data.articles
                    .filter((a) => a.status !== "archived")
                    .slice(0, 4)
                    .map((a) => (
                      <div className="recent-article" key={a.id}>
                        <span className="recent-icon">
                          <FileText size={18} />
                        </span>
                        <div>
                          <b>{a.title}</b>
                          <small>
                            {a.category} · {a.date || "实验室介绍"}
                          </small>
                        </div>
                        <span
                          className={
                            "status " +
                            (a.status === "published" ? "green" : "")
                          }
                        >
                          {a.status === "published" ? "已发布" : "草稿"}
                        </span>
                      </div>
                    ))}
                </section>
                <section className="cms-panel maintenance-card">
                  <CheckCircle2 size={26} />
                  <h2>内容和展示，各有位置。</h2>
                  <p>
                    普通访客看到统一首页与已发布内容。登录的管理员可以进入工作台，维护素材和报名信息。
                  </p>
                  <SiteLink
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    查看当前展示效果 <ArrowUpRight size={15} />
                  </SiteLink>
                </section>
              </div>
            </>
          )}
          {tab === "articles" && (
            <Articles
              articles={data.articles}
              assets={data.assets}
              onUpload={addAsset}
              onRefresh={load}
              notify={setNotice}
              initialNew={newArticle}
            />
          )}
          {tab === "media" && (
            <MediaLibrary
              assets={data.assets}
              onUpload={addAsset}
              onRefresh={load}
              notify={setNotice}
            />
          )}
          {tab === "applications" && (
            <Applications
              people={data.applications}
              onRefresh={load}
              notify={setNotice}
            />
          )}
          {tab === "settings" && (
            <Settings
              value={data.settings}
              assets={data.assets}
              onUpload={addAsset}
              onRefresh={load}
              notify={setNotice}
              content={{
                settings: data.settings,
                articles: data.articles,
                assets: data.assets.map(({ preview_url: _preview, expiresAt: _expiry, ...asset }) => asset),
              }}
            />
          )}
          <footer className="cms-footer">
            CSU ROBOTICS LAB <span>理解任务 · 感知环境 · 自主行动</span>
          </footer>
        </main>
      </div>
      {guide && (
        <Modal title="网站维护指南" wide onClose={() => setGuide(false)}>
          <div className="maintenance-guide">
            <h3>普通访客与管理员</h3>
            <p>
              所有人从同一个首页进入。普通访客浏览已发布内容、填写报名表；管理员使用专用访问密钥进入工作台。密钥仅交给负责网站维护的人员，离开时请退出登录。
            </p>
            <h3>发布文章</h3>
            <p>
              在“文章管理”新建文章，填写标题、摘要与正文。可用工具栏插入小标题、加粗、图片或视频。先保存草稿，再使用预览检查，最后发布。已发布文章可以撤回为草稿，草稿可以移入回收站并恢复。
            </p>
            <h3>管理图片与视频</h3>
            {mediaUpload && <p>
              在线素材库支持多选、拖放上传：图片最大20MB，视频最大500MB。上传后选入文章或首页即可展示；回收站保留原文件和已有引用。
            </p>}
            <p>
              仓库素材请放到 GitHub 的 public/media 文件夹，选择 Add file → Upload files 并提交到 main。等待 Pages 发布成功后，刷新后台，文件会自动出现在素材库，可选入正文、封面或首页视频。支持图片与 MP4/WebM 短视频，网页上传单个文件不超过25 MiB。
            </p>
            <p>
              仓库文件公开可见，即使只选入草稿也不会变成私有文件。仓库中的文件名、替换和删除在 GitHub 中管理；替换后沿用原文件名可保留引用，删除前请先检查文章和首页是否仍在使用。
            </p>
            <a className="text-link" href={repositoryMediaFolder} target="_blank" rel="noreferrer">打开仓库素材文件夹 <ArrowUpRight size={15} /></a>
            <h3>设置首页与报名</h3>
            <p>
              在“网站设置”选择首页图片或宣传视频，修改实验室简介、地点与招新信息。开启在线报名后，报名记录会出现在“报名管理”，可以搜索、备注和导出。
            </p>
            <h3>备份与后续开发</h3>
            <p>
              内容备份包含文章、设置和素材索引；图片与视频原件请自行保留。网站的页面展示、内容管理、上传服务与数据库结构已分别整理，后续可以继续扩展。网站访问范围与报名开关是独立设置。
            </p>
          </div>
        </Modal>
      )}
    </div>
    </MediaCapabilitiesContext.Provider>
  );
}
