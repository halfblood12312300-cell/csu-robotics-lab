import { SiteLink } from "../../router";
import { MediaImage, MediaVideo } from "../../media";
import { useState, useEffect } from "react";
import { Save, Image as ImageIcon, Film, ExternalLink } from "lucide-react";
import { Asset, Settings as SettingsType } from "../../content";
import { api, downloadJson } from "../shared";
import { AssetPicker } from "./media-library";
export function Settings({
  value,
  assets,
  onUpload,
  onRefresh,
  notify,
  content,
}: {
  value: SettingsType;
  assets: Asset[];
  onUpload: (a: Asset) => void;
  onRefresh: () => Promise<void>;
  notify: (s: string) => void;
  content: unknown;
}) {
  const [s, setS] = useState(value);
  const [picker, setPicker] = useState<"image" | "video" | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(value);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  return (
    <>
      <div className="cms-heading">
        <div>
          <h1>网站设置</h1>
          <p>更新首页介绍、展示影像与招新信息。</p>
        </div>
        <span className="muted">
          {dirty ? "有修改尚未保存" : "已与网站同步"}
        </span>
      </div>
      <form
        data-unsaved={dirty}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("admin/settings", s);
            await onRefresh();
            notify("网站设置已保存");
          } catch (e) {
            notify((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="settings-grid">
          <section className="cms-panel">
            <h2>首页展示</h2>
            <label>
              实验室简介
              <textarea
                rows={4}
                maxLength={250}
                value={s.intro}
                onChange={(e) => setS({ ...s, intro: e.target.value })}
              />
            </label>
            <label>首页图片 / 视频封面</label>
            {s.heroImage ? (
              <MediaImage preview
                className="settings-cover"
                src={s.heroImage}
                alt="首页图片预览"
              />
            ) : (
              <div className="cover-placeholder">
                <ImageIcon size={30} />
              </div>
            )}
            <button
              type="button"
              className="button small outline"
              onClick={() => setPicker("image")}
            >
              <ImageIcon size={16} />
              从素材库选择图片
            </button>
            <label className="setting-video-label">
              首页宣传视频<small>选用后，首页展示可播放的视频</small>
            </label>
            {s.heroVideo ? (
              <MediaVideo preview
                controls
                playsInline
                preload="metadata"
                className="settings-cover"
                src={s.heroVideo}
                poster={s.heroImage}
              />
            ) : (
              <div className="notice">尚未设置宣传视频，首页使用上方图片。</div>
            )}
            <div className="cms-actions">
              <button
                type="button"
                className="button small outline"
                onClick={() => setPicker("video")}
              >
                <Film size={16} />
                选择视频
              </button>
              {s.heroVideo && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setS({ ...s, heroVideo: "" })}
                >
                  恢复为图片展示
                </button>
              )}
            </div>
          </section>
          <div>
            <section className="cms-panel">
              <h2>招新设置</h2>
              <label className="switch-row">
                <span>
                  <b>开放在线报名</b>
                  <small>
                    {s.registrationOpen
                      ? "正在接收同学报名"
                      : "关闭时保留报名介绍，停止接收新报名"}
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={s.registrationOpen}
                  onChange={(e) =>
                    setS({ ...s, registrationOpen: e.target.checked })
                  }
                />
              </label>
              <label>
                报名截止日期<small>留空表示不设截止日期</small>
                <input
                  type="date"
                  value={s.deadline}
                  onChange={(e) => setS({ ...s, deadline: e.target.value })}
                />
              </label>
              <label>
                咨询联系方式<small>留空则不显示</small>
                <input
                  maxLength={100}
                  value={s.contact}
                  onChange={(e) => setS({ ...s, contact: e.target.value })}
                />
              </label>
              <label>
                实验室地点
                <input
                  required
                  maxLength={150}
                  value={s.location}
                  onChange={(e) => setS({ ...s, location: e.target.value })}
                />
              </label>
            </section>
            <section className="cms-panel">
              <h2>内容备份</h2>
              <p>导出文章、素材索引和网站设置，便于后续整理或交接维护。</p>
              <button
                type="button"
                className="button small outline"
                onClick={() =>
                  downloadJson(
                    {
                      format: "csu-robotics-content-v1",
                      exportedAt: new Date().toISOString(),
                      content,
                    },
                    "机器人实验室内容备份.json",
                  )
                }
              >
                导出内容备份
              </button>
              <p className="muted backup-note">
                备份含素材链接，不含视频和图片文件本体；报名名单在“报名管理”中单独导出。
              </p>
            </section>
          </div>
        </div>
        <div className="settings-save">
          <button type="submit" className="button" disabled={busy || !dirty}>
            <Save size={17} />
            {busy ? "保存中…" : "保存网站设置"}
          </button>
          <SiteLink href="/" target="_blank" rel="noreferrer" className="text-link">
            查看首页 <ExternalLink size={15} />
          </SiteLink>
        </div>
      </form>
      {picker && (
        <AssetPicker
          kind={picker}
          assets={assets}
          onUpload={onUpload}
          onClose={() => setPicker(null)}
          onSelect={(a) =>
            setS((prev) =>
              picker === "image"
                ? { ...prev, heroImage: a.url }
                : { ...prev, heroVideo: a.url },
            )
          }
        />
      )}
    </>
  );
}
