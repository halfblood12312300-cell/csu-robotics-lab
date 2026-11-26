import { SiteLink } from "../../router";
import { MediaImage } from "../../media";
import { useState } from "react";
import { Plus, Search, FileText, Archive, RotateCcw, Eye } from "lucide-react";
import { Article, Asset } from "../../content";
import { api, dateLabel } from "../shared";
import { ArticleEditor } from "./article-editor";
export const newArticle = (category = "实验室动态"): Article => ({
  id: crypto.randomUUID(),
  title: "",
  summary: "",
  category,
  body: "",
  cover: "",
  media: [],
  status: "draft",
  date: new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
});
export function Articles({
  articles,
  assets,
  onUpload,
  onRefresh,
  notify,
  initialNew = false,
  categories,
}: {
  articles: Article[];
  assets: Asset[];
  onUpload: (a: Asset) => void;
  onRefresh: () => Promise<void>;
  notify: (s: string) => void;
  initialNew?: boolean;
  categories: string[];
}) {
  const defaultCategory = categories.includes("实验室动态") ? "实验室动态" : categories[0] || "实验室动态";
  const [editing, setEditing] = useState<Article | null>(() =>
    initialNew ? newArticle(defaultCategory) : null,
  );
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  const rows = articles.filter(
    (a) =>
      (status === "all" ? a.status !== "archived" : a.status === status) &&
      `${a.title}${a.summary}${a.category}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  async function change(a: Article, s: string) {
    setBusy(true);
    try {
      await api("admin/article", { ...a, status: s });
      await onRefresh();
      notify(
        s === "archived"
          ? "文章已移入回收站，可随时恢复为草稿。"
          : s === "draft"
            ? "文章已保存为草稿，访客暂不可见。"
            : "文章已发布",
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (editing)
    return (
      <ArticleEditor
        key={editing.id}
        initial={editing}
        categories={categories}
        persisted={articles.some((a) => a.id === editing.id)}
        assets={assets}
        onUpload={onUpload}
        onSaved={async () => {
          await onRefresh();
          notify("文章已保存到网站");
        }}
        onClose={() => setEditing(null)}
      />
    );
  return (
    <>
      <div className="cms-heading">
        <div>
          <h1>文章管理</h1>
          <p>把实验过程、研究想法与实验室动态记录下来。</p>
        </div>
        <button
          className="button small"
          onClick={() => setEditing(newArticle(defaultCategory))}
        >
          <Plus size={17} />
          新建文章
        </button>
      </div>
      <div className="cms-filters">
        <div className="tabs">
          {[
            ["all", "全部"],
            ["published", "已发布"],
            ["draft", "草稿"],
            ["archived", "回收站"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={status === v ? "active" : ""}
              onClick={() => setStatus(v)}
            >
              {l}
              <small>
                {
                  articles.filter((a) =>
                    v === "all" ? a.status !== "archived" : a.status === v,
                  ).length
                }
              </small>
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="搜索文章"
            placeholder="搜索标题或分类"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="cms-article-list">
        {rows.map((a) => (
          <article key={a.id}>
            <div className="list-cover">
              {a.cover ? <MediaImage preview src={a.cover} alt="" /> : <FileText size={26} />}
            </div>
            <div className="list-info">
              <div className="list-meta">
                <span
                  className={
                    "status " + (a.status === "published" ? "green" : "")
                  }
                >
                  {a.status === "published"
                    ? "已发布"
                    : a.status === "archived"
                      ? "回收站"
                      : "草稿"}
                </span>
                <small>
                  {a.category} · {a.date || "实验室介绍"}
                </small>
              </div>
              <h3>{a.title}</h3>
              <p>{a.summary}</p>
            </div>
            <div className="list-actions">
              {a.status === "archived" ? (
                <button
                  disabled={busy}
                  className="button small outline"
                  onClick={() => change(a, "draft")}
                >
                  <RotateCcw size={15} />
                  恢复为草稿
                </button>
              ) : (
                <>
                  <button
                    className="button small outline"
                    onClick={() => setEditing({ ...a })}
                  >
                    编辑文章
                  </button>
                  {a.status === "published" && (
                    <SiteLink
                      href={"/articles/" + a.id}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      <Eye size={15} />
                      查看
                    </SiteLink>
                  )}
                  <button
                    disabled={busy}
                    className="text-link"
                    onClick={() =>
                      change(a, a.status === "published" ? "draft" : "archived")
                    }
                  >
                    {a.status === "published" ? (
                      "撤回为草稿"
                    ) : (
                      <>
                        <Archive size={14} />
                        移入回收站
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <div className="empty">
          <FileText size={32} />
          <h3>{q ? "没有匹配的文章" : "这里还没有文章"}</h3>
          <p>新建一篇文章，先保存草稿，再确认发布。</p>
        </div>
      )}
    </>
  );
}
