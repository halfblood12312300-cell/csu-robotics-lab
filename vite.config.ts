import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.BASE_PATH || "/csu-robotics-lab/",
  plugins: [react()],
  server: { host: "0.0.0.0", allowedHosts: ["terminal.local", "localhost", "127.0.0.1"] },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});
