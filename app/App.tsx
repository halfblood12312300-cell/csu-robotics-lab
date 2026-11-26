import { useEffect } from "react";
import Home from "./page";
import Articles from "./articles/page";
import ArticleView from "./articles/[id]/view";
import Join from "./join/page";
import Admin from "./admin/page";
import ResearchView from "./research/[id]/view";
import { isResearchId } from "./research/content";
import { directions } from "./content";
import { Frame } from "./ui";
import { SiteLink, useRoute } from "./router";
import { usePublicState } from "./site-state";

export default function App() {
  const route = useRoute();
  const { articles } = usePublicState();
  const research = route.pathname.match(/^\/research\/([^/]+)$/)?.[1];
  const article = route.pathname.match(/^\/articles\/([a-zA-Z0-9-]{1,80})$/)?.[1];
  useEffect(() => {
    const label = article ? articles.find((item) => item.id === article)?.title : research && isResearchId(research) ? directions.find((item) => item.id === research)?.title
      : route.pathname === "/articles" ? "项目与动态" : route.pathname === "/join" ? "加入我们" : route.pathname === "/admin" ? "内容管理" : "";
    document.title = `${label ? `${label} · ` : ""}CSU 机器人实验室 · 中南大学数学与统计学院`;
  }, [route.pathname, research, article, articles]);
  if (route.pathname === "/") return <Home />;
  if (route.pathname === "/articles") return <Articles />;
  if (article) return <ArticleView key={article} id={article} />;
  if (route.pathname === "/join") return <Join />;
  if (route.pathname === "/admin") return <Admin />;
  if (research && isResearchId(research)) return <ResearchView key={research} id={research} />;
  return <Frame><section className="section wrap"><h1 className="page-title">没有找到这个页面</h1><p>页面地址可能已更改，请从首页继续浏览。</p><SiteLink className="button" href="/">返回实验室首页</SiteLink></section></Frame>;
}
