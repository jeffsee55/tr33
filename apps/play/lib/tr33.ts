import { createClient as libsqlCreateClient } from "@libsql/client";
import { createClient, defineConfig, z } from "tr33";

const libsqlClient = libsqlCreateClient({
  url: "file:./tr33.db",
});

const authors = z.collection({
  name: "authors",
  match: "content/authors/**/*.json",
  schema: z.json({
    name: z.filter(z.string()),
  }),
});

const docs = z.collection({
  name: "docs",
  match: "content/docs/**/*.md",
  schema: z.markdown({
    title: z.filter(z.string()),
    author: z.connect(authors, { referencedAs: "docsAuthored" }),
  }),
});

const config = defineConfig({
  org: "jeffsee55",
  repo: "tr33-mono",
  ref: "main",
  localPath: ".",
  version: "0",
  collections: {
    docs,
    authors,
  },
});

export const tr33 = createClient({ config, database: libsqlClient });
