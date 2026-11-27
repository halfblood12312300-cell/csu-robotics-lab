import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, sep } from "node:path";
import { readFileSync } from "node:fs";
import { collectRepositoryMedia } from "./scripts/repository-media.ts";

function repositoryMedia(): Plugin {
  const moduleId = "virtual:repository-media";
  const resolvedId = "\0" + moduleId;
  let directory = resolve("public/media");
  return {
    name: "csu-repository-media",
    configResolved(config) { directory = resolve(config.publicDir, "media"); },
    resolveId(id) { if (id === moduleId) return resolvedId; },
    load(id) {
      if (id === resolvedId) return `export default ${JSON.stringify(collectRepositoryMedia(directory))};`;
    },
    configureServer(server) {
      server.watcher.add(directory);
      const update = (file: string) => {
        if (!file.startsWith(directory + sep)) return;
        const module = server.moduleGraph.getModuleById(resolvedId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", update).on("unlink", update).on("change", update);
    },
  };
}

// Embed the same public API address as a startup fallback. A slow or failed
// runtime-config.json request must not silently disable the online service.
function runtimeApiFallback(): string | null {
  try {
    const value = JSON.parse(readFileSync(resolve("public/runtime-config.json"), "utf8"));
    return typeof value?.apiBaseUrl === "string" ? value.apiBaseUrl : null;
  } catch { return null; }
}

export default defineConfig({
  define: { __CSU_RUNTIME_API_FALLBACK__: JSON.stringify(runtimeApiFallback()) },
  base: process.env.BASE_PATH || "/csu-robotics-lab/",
  plugins: [react(), repositoryMedia()],
  server: { host: "0.0.0.0", allowedHosts: ["terminal.local", "localhost", "127.0.0.1"] },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});
