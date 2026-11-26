import { MediaImage, MediaVideo } from "../../media";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Eye,
  Save,
  Send,
  Image as ImageIcon,
  Film,
  Heading2,
  Bold,
  List,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import { Article, Asset, Media } from "../../content";
import { ArticleBody } from "../../ui";
import { AssetPicker, UploadArea } from "./media-library";
import { api, categories, Modal } from "../shared";
export function ArticlePreview({ article }: { article: Article }) {
  return (
    <article className="cms-article-preview">
      <div className="card-meta">
        <span>{article.category}</span>
        <span>{article.date}</span>
      </div>
      <h1>{article.title || "未命名文章"}</h1>
      <p className="article-lead">{article.summary}</p>
      {article.cover && (
        <MediaImage preview
          className="preview-cover"
          src={article.cover}
          alt={article.title}
        />
      )}
      <ArticleBody body={article.body} preview />
      {article.media.map((m, i) => (
        <figure className="article-media" key={i}>
          {m.type === "video" ? (
            <MediaVideo preview controls playsInline preload="metadata" src={m.url} />
          ) : (
            <MediaImage preview src={m.url} alt={m.caption} />
          )}
          <figcaption>{m.caption}</figcaption>
        </figure>
      ))}
    </article>
  );
}
export function ArticleEditor({
  initial,
  assets,
  onUpload,
  onSaved,
  onClose,
  persisted,
}: {
  initial: Article;
  persisted: boolean;
  assets: Asset[];
  onUpload: (a: Asset) => void;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [a, setA] = useState<Article>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [preview, setPreview] = useState(false);
  const [picker, setPicker] = useState<
    "cover" | "body-image" | "body-video" | "gallery" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cached, setCached] = useState<Article | null>(null);
  const [localTime, setLocalTime] = useState("");
  const text = useRef<HTMLTextAreaElement>(null);
  const changed = JSON.stringify(a) !== saved;
  const cacheKey = persisted
    ? "csu-article-draft-" + initial.id
    : "csu-new-article-draft";
  useEffect(() => {
    try {
      const cache = localStorage.getItem(cacheKey);
      if (cache) {
        const restored = JSON.parse(cache);
        if (
          (!persisted || restored.id === initial.id) &&
          typeof restored.body === "string" &&
          Array.isArray(restored.media) &&
          JSON.stringify(restored) !== JSON.stringify(initial)
        )
          setCached(restored);
      }
    } catch {}
  }, [cacheKey]);
  useEffect(() => {
    if (!changed) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(a));
        setLocalTime(
          new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [a, changed, cacheKey]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (changed) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [changed]);
  function close() {
    if (!changed || window.confirm("还有修改未保存到网站，确定返回列表吗？"))
      onClose();
  }
  function insert(before: string, after = "") {
    const el = text.current;
    const start = el?.selectionStart ?? a.body.length,
      end = el?.selectionEnd ?? start;
    const selected = a.body.slice(start, end);
    setA((prev) => ({
      ...prev,
      body:
        prev.body.slice(0, start) +
        before +
        selected +
        after +
        prev.body.slice(end),
    }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }
  function choose(asset: Asset) {
    const caption = asset.caption || asset.name.replace(/\.[^.]+$/, "");
    if (picker === "cover") setA((prev) => ({ ...prev, cover: asset.url }));
    else if (picker === "gallery")
      setA((prev) => ({
        ...prev,
        media: [...prev.media, { url: asset.url, type: asset.type, caption }],
      }));
    else
      insert(
        "\n\n" +
          (asset.type === "video" ? "@video" : "!") +
          "[" +
          caption.replace(/[\[\]\n]/g, " ") +
          "](" +
          asset.url +
          ")\n\n",
      );
  }
  async function save(status: string) {
    setBusy(true);
    setError("");
    try {
      if (!a.title.trim()) throw Error("请先填写文章标题");
      const value = { ...a, title: a.title.trim(), status };
      await api("admin/article", value);
      try {
        localStorage.removeItem(cacheKey);
      } catch {}
      setSaved(JSON.stringify(value));
      setA(value);
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function move(index: number, delta: number) {
    setA((prev) => {
      const media = [...prev.media];
      [media[index], media[index + delta]] = [
        media[index + delta],
        media[index],
      ];
      return { ...prev, media };
    });
  }
  return (
    <>
      <div className="editor-toolbar" data-unsaved={changed}>
        <button className="text-link" onClick={close}>
          <ArrowLeft size={17} />
          文章列表
        </button>
        <span className="draft-state">
          {changed
            ? localTime
              ? "本机草稿已暂存 " + localTime
              : "有未保存的修改"
            : persisted
              ? "已保存到网站"
              : "新建文章 · 尚未保存"}
        </span>
        <div className="cms-actions">
          <button
            className="button small outline"
            onClick={() => setPreview(true)}
          >
            <Eye size={15} />
            预览
          </button>
          <button
            className="button small outline"
            disabled={busy}
            onClick={() =>
              save(a.status === "published" ? "published" : "draft")
            }
          >
            <Save size={15} />
            {a.status === "published" ? "保存修改" : "保存草稿"}
          </button>
          {a.status !== "published" && (
            <button
              className="button small"
              disabled={busy}
              onClick={() => save("published")}
            >
              <Send size={15} />
              发布文章
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {cached && (
        <div className="notice restore-notice">
          <span>发现这篇文章的本机暂存版本。</span>
          <button
            onClick={() => {
              setA(cached);
              setCached(null);
            }}
          >
            恢复编辑
          </button>
          <button
            onClick={() => {
              localStorage.removeItem(cacheKey);
              setCached(null);
            }}
          >
            忽略
          </button>
        </div>
      )}
      <div className="editor-layout">
        <section className="cms-panel article-edit-main">
          <label>
            文章标题
            <input
              className="title-input"
              maxLength={100}
              placeholder="为这次分享写一个标题"
              value={a.title}
              onChange={(e) => setA({ ...a, title: e.target.value })}
            />
          </label>
          <label>
            内容摘要
            <textarea
              rows={3}
              maxLength={250}
              placeholder="用两三句话介绍文章，显示在首页与文章列表中"
              value={a.summary}
              onChange={(e) => setA({ ...a, summary: e.target.value })}
            />
          </label>
          <div className="body-field">
            <label htmlFor="article-body">文章正文</label>
            <div className="format-toolbar">
              <button
                title="插入小标题"
                aria-label="插入小标题"
                onClick={() => insert("\n\n## ", "\n")}
              >
                <Heading2 size={18} />
              </button>
              <button
                title="加粗选中文字"
                aria-label="加粗选中文字"
                onClick={() => insert("**", "**")}
              >
                <Bold size={17} />
              </button>
              <button
                title="插入列表"
                aria-label="插入列表"
                onClick={() => insert("\n- ")}
              >
                <List size={18} />
              </button>
              <span />
              <button onClick={() => setPicker("body-image")}>
                <ImageIcon size={16} />
                插入图片
              </button>
              <button onClick={() => setPicker("body-video")}>
                <Film size={16} />
                插入视频
              </button>
            </div>
            <textarea
              ref={text}
              id="article-body"
              className="body-editor"
              rows={19}
              maxLength={50000}
              placeholder="写下实验过程、研究想法或实验室动态…"
              value={a.body}
              onChange={(e) => setA({ ...a, body: e.target.value })}
            />
            <small className="muted">
              {a.body.length.toLocaleString()} 字符 · 可用上方按钮排版和插入素材
            </small>
          </div>
        </section>
        <aside className="editor-side">
          <section className="cms-panel">
            <h3>文章信息</h3>
            <label>
              分类
              <select
                value={a.category}
                onChange={(e) => setA({ ...a, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              发布日期
              <input
                type="date"
                value={a.date}
                onChange={(e) => setA({ ...a, date: e.target.value })}
              />
            </label>
            <p className="muted">
              日期用于页面展示；点击“发布文章”后立即公开展示。
            </p>
          </section>
          <section className="cms-panel">
            <h3>封面图片</h3>
            {a.cover ? (
              <MediaImage preview className="cover-selection" src={a.cover} alt="文章封面" />
            ) : (
              <div className="cover-placeholder">
                <ImageIcon size={30} />
                <span>选择一张文章封面</span>
              </div>
            )}
            <div className="cms-actions">
              <button
                className="button small outline"
                onClick={() => setPicker("cover")}
              >
                选择封面
              </button>
              {a.cover && (
                <button
                  className="text-link"
                  onClick={() => setA({ ...a, cover: "" })}
                >
                  移除
                </button>
              )}
            </div>
          </section>
          <section className="cms-panel">
            <h3>上传素材</h3>
            <p className="muted">上传后可从素材库选入正文、封面或相册。</p>
            <UploadArea compact onDone={onUpload} />
          </section>
        </aside>
      </div>
      <section className="cms-panel article-gallery">
        <div className="cms-heading small-heading">
          <div>
            <h2>文章相册与视频</h2>
            <p>显示在文章末尾，同时进入首页“实验室影像”。</p>
          </div>
          <button
            className="button small outline"
            disabled={a.media.length >= 20}
            onClick={() => setPicker("gallery")}
          >
            从素材库添加
          </button>
        </div>
        {a.media.map((m, i) => (
          <div className="gallery-row" key={i}>
            {m.type === "image" ? (
              <MediaImage preview src={m.url} alt={m.caption} />
            ) : (
              <span className="gallery-video">
                <Film size={23} />
              </span>
            )}
            <label>
              素材说明
              <input
                maxLength={150}
                value={m.caption}
                onChange={(e) =>
                  setA({
                    ...a,
                    media: a.media.map((x, j) =>
                      i === j ? { ...x, caption: e.target.value } : x,
                    ),
                  })
                }
              />
            </label>
            <div className="cms-actions">
              <button
                aria-label="上移素材"
                disabled={i === 0}
                className="icon-button"
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                aria-label="下移素材"
                disabled={i === a.media.length - 1}
                className="icon-button"
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                aria-label="从文章移除素材"
                className="icon-button"
                onClick={() =>
                  setA({ ...a, media: a.media.filter((_, j) => j !== i) })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {!a.media.length && (
          <p className="muted">
            还未添加素材。你也可以直接在正文中插入图片和视频。
          </p>
        )}
      </section>
      {picker && (
        <AssetPicker
          assets={assets}
          kind={
            picker === "cover" || picker === "body-image"
              ? "image"
              : picker === "body-video"
                ? "video"
                : "both"
          }
          onSelect={choose}
          onUpload={onUpload}
          onClose={() => setPicker(null)}
        />
      )}{" "}
      {preview && (
        <Modal title="发布效果预览" wide onClose={() => setPreview(false)}>
          <ArticlePreview article={a} />
        </Modal>
      )}
    </>
  );
}
