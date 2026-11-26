import { MediaImage, MediaVideo } from "../../media";
import { useRef, useState, useEffect } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  Film,
  Search,
  Archive,
  RotateCcw,
  Check,
  Loader2,
  X,
  FolderOpen,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Asset } from "../../content";
import { apiFetch, mediaUrl } from "../../api-client";
import { api, formatSize, dateLabel, Modal } from "../shared";
import { repositoryMediaFile, repositoryMediaFolder, useMediaCapabilities } from "../media-context";
const imageTypes = "image/jpeg,image/png,image/webp,image/gif";
const accept = imageTypes + ",video/mp4,video/webm";
function RepositoryMediaNotice({ compact = false }: { compact?: boolean }) {
  return <div className={"repository-media-notice " + (compact ? "compact" : "")}>
    <FolderOpen size={24} />
    <div>
      <b>通过 GitHub 添加图片和短视频</b>
      <p>打开 public/media 文件夹，选择 Add file → Upload files。提交到 main，等待网站发布完成后刷新本页，即可在素材库选用。</p>
      <small>网页上传单个文件 ≤ 25 MiB。仓库素材公开可见，请仅上传可公开的内容。</small>
    </div>
    <a className="button small" href={repositoryMediaFolder} target="_blank" rel="noreferrer">打开素材文件夹 <ExternalLink size={14} /></a>
  </div>;
}
export function UploadArea({
  onDone,
  kind = "both",
  compact = false,
}: {
  onDone: (asset: Asset) => void;
  kind?: "both" | "image" | "video";
  compact?: boolean;
}) {
  const { mediaUpload } = useMediaCapabilities();
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [drag, setDrag] = useState(false);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [busy]);
  async function upload(files: FileList | File[] | null) {
    if (!mediaUpload || !files?.length || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setDone("");
    let completed = 0;
    try {
      for (const file of Array.from(files)) {
        setName(file.name);
        setProgress(0);
        if (
          !accept.split(",").includes(file.type) ||
          (kind !== "both" && !file.type.startsWith(kind + "/"))
        )
          throw Error(
            "请选择支持的" +
              (kind === "video" ? "MP4或WebM视频" : "图片或视频") +
              "文件",
          );
        if (
          file.size >
          (file.type.startsWith("video/") ? 500 : 20) * 1024 * 1024
        )
          throw Error("图片最大20MB，视频最大500MB");
        const start = await api("admin/media/start", {
          name: file.name,
          mime: file.type,
          size: file.size,
        });
        controller.current = new AbortController();
        let finished = false;
        try {
          for (
            let offset = 0, part = 1;
            offset < file.size;
            offset += start.chunkSize, part++
          ) {
            const chunk = file.slice(offset, offset + start.chunkSize);
            for (let attempt = 0; ; attempt++) {
              try {
                const r = await apiFetch(
                  "/api/admin/media/chunk?id=" +
                    encodeURIComponent(start.id) +
                    "&part=" +
                    part,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/octet-stream" },
                    body: chunk,
                    signal: controller.current.signal,
                  },
                );
                const j: any = await r.json();
                if (!r.ok)
                  throw Object.assign(Error(j.error || "上传失败"), {
                    status: r.status,
                  });
                break;
              } catch (e) {
                if (
                  controller.current.signal.aborted ||
                  attempt >= 2 ||
                  ((e as any).status && (e as any).status < 500)
                )
                  throw e;
              }
            }
            setProgress(
              Math.round(
                (Math.min(offset + start.chunkSize, file.size) / file.size) *
                  99,
              ),
            );
          }
          const asset = await api("admin/media/complete", { id: start.id });
          finished = true;
          setProgress(100);
          completed++;
          onDone(asset);
        } finally {
          if (!finished)
            await api("admin/media/cancel", { id: start.id }).catch(() => {});
        }
      }
      setDone("已上传 " + completed + " 个文件，可在素材库中选用。");
    } catch (e) {
      setError(
        controller.current?.signal.aborted
          ? "上传已取消。已完成的文件仍保存在素材库。"
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
      locked.current = false;
      controller.current = null;
      if (input.current) input.current.value = "";
    }
  }
  if (!mediaUpload) return <RepositoryMediaNotice compact={compact} />;
  return (
    <div
      data-uploading={busy}
      className={
        "upload-box " + (compact ? "compact " : "") + (drag ? "dragging" : "")
      }
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        upload(e.dataTransfer.files);
      }}
    >
      <input
        hidden
        ref={input}
        type="file"
        multiple
        accept={
          kind === "image"
            ? imageTypes
            : kind === "video"
              ? "video/mp4,video/webm"
              : accept
        }
        onChange={(e) => upload(e.target.files)}
        disabled={busy}
      />
      {busy ? (
        <div className="upload-progress">
          <div>
            <Loader2 size={19} className="spin" />
            <b>正在上传 {name}</b>
            <button
              type="button"
              aria-label="取消上传"
              className="icon-button"
              onClick={() => controller.current?.abort()}
            >
              <X size={17} />
            </button>
          </div>
          <progress max={100} value={progress} />
          <small>{progress}% · 请保持此页面打开</small>
        </div>
      ) : (
        <>
          <UploadCloud size={compact ? 22 : 32} />
          <div>
            <b>{compact ? "上传新素材" : "拖放图片或视频到这里"}</b>
            <small>图片 ≤ 20MB · 视频 ≤ 500MB · 支持多选</small>
          </div>
          <button
            type="button"
            className="button small"
            onClick={() => input.current?.click()}
          >
            选择文件
          </button>
        </>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="upload-success" role="status">
          <Check size={15} />
          {done}
        </p>
      )}
    </div>
  );
}
export function AssetThumb({ asset }: { asset: Asset }) {
  return (
    <div className="asset-thumb">
      {asset.type === "image" ? (
        <MediaImage preview src={asset.url} alt={asset.caption || asset.name} loading="lazy" />
      ) : (
        <div className="video-tile">
          <Film size={32} />
          <span>VIDEO</span>
        </div>
      )}
      <span className="asset-kind">
        {asset.type === "video" ? <Film size={12} /> : <ImageIcon size={12} />}{" "}
        {asset.type === "video" ? "视频" : "图片"}
      </span>
    </div>
  );
}
export function AssetPicker({
  assets,
  kind = "both",
  onSelect,
  onClose,
  onUpload,
}: {
  assets: Asset[];
  kind?: "both" | "image" | "video";
  onSelect: (a: Asset) => void;
  onClose: () => void;
  onUpload: (a: Asset) => void;
}) {
  const { mediaUpload } = useMediaCapabilities();
  const [q, setQ] = useState("");
  const rows = assets.filter(
    (a) =>
      !a.archived &&
      (kind === "both" || a.type === kind) &&
      a.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Modal title="从素材库选择" onClose={onClose} wide>
      <UploadArea compact kind={kind} onDone={onUpload} />
      <input
        aria-label="搜索素材"
        placeholder="搜索素材名称"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="asset-grid picker-grid">
        {rows.map((a) => (
          <button
            type="button"
            className="asset-card"
            key={a.id}
            onClick={() => {
              onSelect(a);
              onClose();
            }}
          >
            <AssetThumb asset={a} />
            <div className="asset-info">
              <b>{a.name}</b>
              <small>{formatSize(a.size)}{a.source === "repository" ? " · 仓库公开素材" : ""}</small>
            </div>
          </button>
        ))}
      </div>
      {!rows.length && (
        <div className="empty">{mediaUpload ? "暂无可选素材，先上传一个文件吧。" : "暂无匹配素材。将文件提交到仓库，等待网站发布完成后刷新本页。"}</div>
      )}
    </Modal>
  );
}
export function MediaLibrary({
  assets,
  onUpload,
  onRefresh,
  notify,
}: {
  assets: Asset[];
  onUpload: (a: Asset) => void;
  onRefresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const { mediaUpload } = useMediaCapabilities();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [archived, setArchived] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = assets.filter(
    (a) =>
      a.archived === archived &&
      (type === "all" || a.type === type) &&
      `${a.name}${a.caption}`.toLowerCase().includes(q.toLowerCase()),
  );
  async function save(a: Asset) {
    if (a.source === "repository") return;
    setBusy(true);
    try {
      await api("admin/media/update", { id: a.id, name: a.name, caption: a.caption, archived: a.archived });
      await onRefresh();
      setSelected(null);
      notify(
        a.archived
          ? "素材已移入回收站；已发布页面中的引用仍可正常显示。"
          : "素材信息已保存",
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function publishedUrl(asset: Asset) {
    const path = mediaUrl(asset.url);
    return path ? new URL(path, window.location.href).href : "";
  }
  async function copyUrl(asset: Asset) {
    try {
      await navigator.clipboard.writeText(publishedUrl(asset));
      notify("已复制公开素材网址");
    } catch { notify("浏览器未允许自动复制，请从素材详情中的网址输入框手动复制。"); }
  }
  return (
    <>
      <div className="cms-heading">
        <div>
          <h1>素材库</h1>
          <p>在文章与首页中选用图片和短视频。仓库素材随网站发布，可公开访问。</p>
        </div>
      </div>
      <UploadArea onDone={onUpload} />
      <div className="cms-filters">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="搜索素材名称或说明"
            placeholder="搜索素材名称或说明"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          aria-label="素材类型"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">全部类型</option>
          <option value="image">图片</option>
          <option value="video">视频</option>
        </select>
        {(mediaUpload || assets.some((asset) => asset.source !== "repository")) && <button
          className={"button small " + (archived ? "" : "outline")}
          onClick={() => setArchived(!archived)}
        >
          <Archive size={15} />
          {archived ? "返回素材库" : "回收站"}
        </button>}
      </div>
      <div className="asset-grid">
        {rows.map((a) => (
          <button
            className="asset-card"
            key={a.id}
            onClick={() => setSelected({ ...a })}
          >
            <AssetThumb asset={a} />
            <div className="asset-info">
              <b>{a.name}</b>
              <small>
                {formatSize(a.size)} · {a.source === "repository" ? "仓库公开素材" : dateLabel(a.created_at)}
              </small>
            </div>
          </button>
        ))}
      </div>
      {!rows.length && (
        <div className="empty">
          <ImageIcon size={32} />
          <h3>
            {q
              ? "没有找到匹配的素材"
              : archived
                ? "回收站为空"
                : "素材库还是空的"}
          </h3>
          <p>{mediaUpload ? "上传后可从这里选择素材。仓库来源的文件始终公开。" : "在 GitHub 添加素材并完成网站发布后，刷新本页即可选用。"}</p>
        </div>
      )}
      {selected && (
        <Modal title="素材详情" onClose={() => setSelected(null)}>
          <div className="asset-preview">
            {selected.type === "video" ? (
              <MediaVideo preview
                controls
                playsInline
                preload="metadata"
                src={selected.url}
              />
            ) : (
              <MediaImage preview src={selected.url} alt={selected.caption || selected.name} />
            )}
          </div>
          <p className="muted">
            {formatSize(selected.size)} · {selected.source === "repository" ? "仓库公开素材" : "上传于 " + dateLabel(selected.created_at)}
          </p>
          {selected.source === "repository" ? <>
            <label>仓库文件名<input readOnly value={selected.name} /></label>
            <label>公开文件地址<input readOnly value={publishedUrl(selected)} onFocus={(event) => event.currentTarget.select()} /></label>
            <p className="notice">文件随仓库公开发布。替换、改名和删除请在 GitHub 中操作，发布完成后刷新后台。素材在文章中的说明可在文章编辑器填写。</p>
            <div className="cms-actions">
              <button type="button" className="button small" onClick={() => void copyUrl(selected)}><Copy size={15} />复制网址</button>
              <a className="button small outline" href={repositoryMediaFile(selected)} target="_blank" rel="noreferrer"><FolderOpen size={15} />在 GitHub 管理</a>
            </div>
          </> : <>
          <label>
            素材名称
            <input
              maxLength={250}
              value={selected.name}
              onChange={(e) =>
                setSelected({ ...selected, name: e.target.value })
              }
            />
          </label>
          <label>
            素材说明
            <textarea
              maxLength={150}
              rows={2}
              placeholder="例如：机器人自主导航实验"
              value={selected.caption}
              onChange={(e) =>
                setSelected({ ...selected, caption: e.target.value })
              }
            />
          </label>
          <div className="cms-actions">
            <button
              className="button small"
              disabled={busy || !selected.name.trim()}
              onClick={() => save(selected)}
            >
              保存信息
            </button>
            <button
              className="button small outline"
              disabled={busy}
              onClick={() =>
                save({ ...selected, archived: !selected.archived })
              }
            >
              {selected.archived ? (
                <RotateCcw size={15} />
              ) : (
                <Archive size={15} />
              )}{" "}
              {selected.archived ? "恢复素材" : "移入回收站"}
            </button>
          </div>
          </>}
        </Modal>
      )}
    </>
  );
}
