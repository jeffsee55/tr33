import { defineConfig } from "drizzle-kit";

export const url = "file:../../apps/shad-docs/tr33.db";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/sqlite/schema.ts",
  dbCredentials: {
    url,
  },
});
