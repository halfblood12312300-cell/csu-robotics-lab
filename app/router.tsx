import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { publicAssetUrl } from "./api-client";

export type Route = { pathname: string; search: string; anchor: string };
export function currentRoute(): Route {
  const hash = window.location.hash.slice(1);
  const raw = hash.startsWith("/") ? hash : hash ? `/#${hash}` : "/";
  const url = new URL(raw, "https://route.local");
  return { pathname: url.pathname.replace(/\/+$/, "") || "/", search: url.search, anchor: url.hash.slice(1) };
}
const RouteContext = createContext<Route>({ pathname: "/", search: "", anchor: "" });
export const useRoute = () => useContext(RouteContext);

export function routeHref(path: string): string {
  if (path.startsWith("#")) {
    const route = currentRoute();
    return `${publicAssetUrl("")}#${route.pathname}${route.search}${path}`;
  }
  if (path.startsWith("/") && !path.startsWith("//")) return `${publicAssetUrl("")}#${path}`;
  try {
    const url = new URL(path);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol) ? path : "#";
  } catch { return "#"; }
}

export function navigate(path: string, replace = false) {
  const href = routeHref(path);
  if (replace) {
    window.history.replaceState(null, "", href);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else window.location.hash = href.slice(href.indexOf("#"));
}

function scrollToRoute(route: Route) {
  if (route.anchor) {
    let anchor = route.anchor;
    try { anchor = decodeURIComponent(anchor); } catch {}
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    document.getElementById(anchor)?.scrollIntoView({ behavior, block: "start" });
  } else window.scrollTo({ top: 0, behavior: "instant" });
}

export function HashRouter({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const change = () => setRoute(currentRoute());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollToRoute(route));
    return () => cancelAnimationFrame(frame);
  }, [route.pathname, route.anchor]);
  return <RouteContext.Provider value={route}>{children}</RouteContext.Provider>;
}

export function SiteLink({ href = "/", onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const resolved = routeHref(href);
  return <a {...props} href={resolved} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === "_blank") return;
    if ((href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#")) {
      const current = currentRoute();
      const nextHash = resolved.slice(resolved.indexOf("#") + 1);
      const next = new URL(nextHash, "https://route.local");
      if (next.pathname !== current.pathname) {
        if (document.querySelector('[data-uploading="true"]')) {
          event.preventDefault();
          window.alert("文件正在上传，请完成或取消上传后再离开。");
          return;
        }
        if (document.querySelector('[data-unsaved="true"]') && !window.confirm("还有修改未保存，确定离开当前页面吗？")) {
          event.preventDefault();
          return;
        }
      }
      if (window.location.hash === `#${nextHash}`) {
        event.preventDefault();
        scrollToRoute(current);
      }
    }
  }} />;
}
