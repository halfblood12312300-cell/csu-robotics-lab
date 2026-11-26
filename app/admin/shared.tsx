import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Article, Asset, Settings } from "../content";
import type { FieldOption, FieldType, FormAnswer, FormField } from "../site-config";
import { apiJson } from "../api-client";
export type ApplicationAnswerSnapshot = { id: string; label: string; type: FieldType; value: FormAnswer; options: FieldOption[] };
export type ApplicationFormSnapshot = { title: string; version: number; consentText: string; fields: FormField[] };
export type Application = {
  id: string;
  name: string;
  college: string;
  grade: string;
  contact: string;
  directions: string[];
  experience: string;
  availability: string;
  portfolio: string;
  status: string;
  note: string;
  created_at: string;
  answers?: ApplicationAnswerSnapshot[];
  formVersion?: string;
  formSnapshot?: ApplicationFormSnapshot | null;
};
export type AdminData = {
  settings: Settings;
  articles: Article[];
  applications: Application[];
  assets: Asset[];
  capabilities?: { mediaUpload: boolean; siteEditor?: boolean; formEditor?: boolean };
};
export const states = ["待查看", "已联系", "待交流", "已录取", "暂不合适"];
export const categories = [
  "招新通知",
  "研究导读",
  "平台介绍",
  "实验记录",
  "实验室动态",
];
export async function api(path: string, body?: unknown) {
  return apiJson("/api/" + path, body);
}
export const formatSize = (n: number) =>
  n < 1024 * 1024
    ? (n / 1024).toFixed(0) + " KB"
    : (n / 1024 / 1024).toFixed(1) + " MB";
export const dateLabel = (s: string) =>
  s
    ? new Date(s).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })
    : "实验室介绍";
export function downloadJson(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const list = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input:not([disabled]),textarea,select,[tabindex="0"]',
          ) || [],
        );
        const first = list[0],
          last = list[list.length - 1];
        if (!list.length) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        className={"modal cms-modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭弹窗"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
