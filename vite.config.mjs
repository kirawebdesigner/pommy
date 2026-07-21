import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "assets",
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: resolve(process.cwd(), "src/astryx-islands.jsx"),
      formats: ["es"],
      fileName: () => "js/pommy-astryx.js",
      cssFileName: "css/pommy-astryx",
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css")
            ? "css/pommy-astryx.css"
            : "astryx/[name][extname]",
      },
    },
  },
});
