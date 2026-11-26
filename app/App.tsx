import { useEffect } from "react";
import Home from "./page";
import Articles from "./articles/page";
import ArticleView from "./articles/[id]/view";
import Join from "./join/page";
import Admin from "./admin/page";
import ResearchView from "./research/[id]/view";
import { Frame } from "./ui";
import { SiteLink, useRoute } from "./router";
import { usePublicState } from "./site-state";
import { mediaUrl, publicAssetUrl } from "./api-client";

export default function App() {
  const route = useRoute();
  const { articles, settings } = usePublicState();
  const research = route.pathname.match(/^\/research\/([^/]+)$/)?.[1];
  const article = route.pathname.match(/^\/articles\/([a-zA-Z0-9-]{1,80})$/)?.[1];
  const direction = settings.home.research.directions.find((item) => item.id === research && item.enabled);
  useEffect(() => {
    const label = article ? articles.find((item) => item.id === article)?.title : research ? direction?.title
      : route.pathname === "/articles" ? settings.articles.title : route.pathname === "/join" ? settings.site.joinLabel : route.pathname === "/admin" ? "内容管理" : "";
    document.title = `${label ? `${label} · ` : ""}${settings.site.title}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", settings.site.description);
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) { icon.href = mediaUrl(settings.site.logo) || publicAssetUrl("favicon.svg"); icon.removeAttribute("type"); }
  }, [route.pathname, research, article, articles, settings.site, settings.articles.title, direction]);
  if (route.pathname === "/") return <Home />;
  if (route.pathname === "/articles") return <Articles />;
  if (article) return <ArticleView key={article} id={article} />;
  if (route.pathname === "/join") return <Join />;
  if (route.pathname === "/admin") return <Admin />;
  if (research && direction) return <ResearchView key={research} id={research} />;
  return <Frame><section className="section wrap"><h1 className="page-title">没有找到这个页面</h1><p>页面地址可能已更改，请从首页继续浏览。</p><SiteLink className="button" href="/">返回实验室首页</SiteLink></section></Frame>;
}
