import { createRoot } from "react-dom/client";
import { initializeApiConfig } from "./api-client";
import { HashRouter } from "./router";
import { SiteStateProvider } from "./site-state";
import App from "./App";
import "./globals.css";

void initializeApiConfig().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <SiteStateProvider><HashRouter><App /></HashRouter></SiteStateProvider>,
  );
});
