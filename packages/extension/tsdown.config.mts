import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/extension.ts",
  dts: false,
  hash: false,
  format: "cjs",
  outDir: "dist",
  clean: true,
  noExternal: ["tr33-store"],
  external: ["vscode"],
});
