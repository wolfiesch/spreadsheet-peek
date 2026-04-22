import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: "es2022",
    cssCodeSplit: false,
    assetsInlineLimit: 10_000_000,
  },
  server: {
    host: "127.0.0.1",
    port: 5177,
    strictPort: false,
  },
});
