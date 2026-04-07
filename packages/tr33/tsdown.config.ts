import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/nextjs/index.ts", "src/react/index.tsx"],
  dts: true,
  outDir: "dist",
  clean: false,
  exports: true,
  // This isn't working for ignore tests for some reason
  ignoreWatch: ["tr33.db"],
});
