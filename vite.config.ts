import { defineConfig } from "vite";
import { resolve } from "path";

const FOUNDRY_EXTERNALS = [
  "foundry",
  "game",
  "canvas",
  "ui",
  "CONFIG",
  "CONST",
  "Hooks",
  "Actor",
  "Item",
  "Folder",
  "User",
  "Application",
  "Handlebars",
  "TextEditor",
  "fromUuid",
  "fromUuidSync",
];

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [],
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["es"],
      fileName: "main",
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: (id) => FOUNDRY_EXTERNALS.includes(id) || id.startsWith("/systems/"),
      output: {
        inlineDynamicImports: true,
        assetFileNames: "main.[ext]",
        entryFileNames: "main.js",
      },
    },
  },
});
