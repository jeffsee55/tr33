import { defineConfig } from "drizzle-kit";

/** SQLite for apps/play (`file:./tr33.db` in that app). Drizzle Studio: pnpm studio:play (port 3002). */
export const url = "file:../../apps/play/tr33.db";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/sqlite/schema.ts",
  dbCredentials: {
    url,
  },
});
