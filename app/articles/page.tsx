import { useState } from "react";
import { Frame, Eyebrow, ArticleCard, usePublic, ErrorNotice } from "../ui";

export default function Articles() {
  const { settings, articles, error, loading } = usePublic();
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const categories = ["全部", ...new Set([...settings.articles.categories, ...articles.map((article) => article.category)])];
  const shown = articles.filter((article) => (filter === "全部" || article.category === filter) &&
    `${article.title}${article.summary}`.toLowerCase().includes(query.toLowerCase()));
  return <Frame><section className="section wrap">
    {settings.articles.eyebrow && <Eyebrow>{settings.articles.eyebrow}</Eyebrow>}
    <h1 className="page-title cms-lines">{settings.articles.title}</h1>
    {settings.articles.description && <p className="page-desc cms-lines">{settings.articles.description}</p>}
    <div className="filter-row"><div className="tabs">{categories.map((category) => <button key={category}
      className={filter === category ? "active" : ""} onClick={() => setFilter(category)}>{category}</button>)}</div>
      <input aria-label="搜索文章" placeholder="搜索文章…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <ErrorNotice error={error} />
    <div className="article-grid">{shown.map((article) => <ArticleCard key={article.id} article={article} display={settings.articles} />)}</div>
    {!shown.length && <div className="empty">{loading ? "正在读取文章…" : settings.articles.emptyText}</div>}
  </section></Frame>;
}
