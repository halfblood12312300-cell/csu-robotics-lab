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
} from "lucide-react";
import { Asset } from "../../content";
import { apiFetch } from "../../api-client";
import { api, formatSize, dateLabel, Modal } from "../shared";
const imageTypes = "image/jpeg,image/png,image/webp,image/gif";
const accept = imageTypes + ",video/mp4,video/webm";
export function UploadArea({
  onDone,
  kind = "both",
  compact = false,
}: {
  onDone: (asset: Asset) => void;
  kind?: "both" | "image" | "video";
  compact?: boolean;
}) {
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
    if (!files?.length || locked.current) return;
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
              <small>{formatSize(a.size)}</small>
            </div>
          </button>
        ))}
      </div>
      {!rows.length && (
        <div className="empty">暂无可选素材，先上传一个文件吧。</div>
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
  return (
    <>
      <div className="cms-heading">
        <div>
          <h1>素材库</h1>
          <p>集中保存宣传视频和图片，在文章与首页中反复选用。</p>
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
        <button
          className={"button small " + (archived ? "" : "outline")}
          onClick={() => setArchived(!archived)}
        >
          <Archive size={15} />
          {archived ? "返回素材库" : "回收站"}
        </button>
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
                {formatSize(a.size)} · {dateLabel(a.created_at)}
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
          <p>上传的文件会保存在这里；只有选入已发布内容后才向访客展示。</p>
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
            {formatSize(selected.size)} · 上传于{" "}
            {dateLabel(selected.created_at)}
          </p>
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
        </Modal>
      )}
    </>
  );
}
