import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

module.exports = defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.js"),
      formats: ["es"],
      fileName: "csvs",
    },
    sourcemap: "inline",
  },
  resolve: {
    alias: {
      path: "path-browserify",
    },
  },
});
