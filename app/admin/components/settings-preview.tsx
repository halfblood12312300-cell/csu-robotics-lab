import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** An isolated viewport uses the same React views and CSS as the published site. */
export function SettingsPreviewFrame({ children, mobile }: { children: ReactNode; mobile: boolean }) {
  const [body, setBody] = useState<HTMLElement | null>(null);
  const connect = useCallback((frame: HTMLIFrameElement | null) => {
    if (!frame) return;
    function ready() {
      const target = frame!.contentDocument;
      if (!target) return;
      for (const previous of target.head.querySelectorAll("[data-preview-style]")) previous.remove();
      for (const source of document.querySelectorAll('link[rel="stylesheet"],style')) {
        const copy = source.cloneNode(true) as HTMLElement;
        copy.setAttribute("data-preview-style", "");
        if (copy instanceof HTMLLinkElement && source instanceof HTMLLinkElement) copy.href = source.href;
        target.head.appendChild(copy);
      }
      target.documentElement.lang = "zh-CN";
      target.body.style.margin = "0";
      setBody(target.body);
    }
    frame.addEventListener("load", ready, { once: true });
    if (frame.contentDocument?.readyState === "complete") ready();
  }, []);
  return <>
    <iframe ref={connect} title={mobile ? "手机尺寸页面预览" : "桌面尺寸页面预览"}
      className={"settings-preview-viewport " + (mobile ? "mobile" : "")}
      sandbox="allow-same-origin" srcDoc={'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>'}
      style={{ display: "block", height: "70vh", border: "1px solid #dfe5ef" }} />
    {body && createPortal(<div onClickCapture={(event) => {
      if ((event.target as Element).closest("a")) { event.preventDefault(); event.stopPropagation(); }
    }} onSubmitCapture={(event) => event.preventDefault()}>{children}</div>, body)}
  </>;
}
