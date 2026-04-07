import type { Client as LibsqlClient } from "@libsql/client";
import type { Config, ConfigInput } from "@/client/config";
import type { OrmConfig } from "@/client/types";
import { Git } from "@/git/git";
import { GitHubRemote } from "@/git/remote/github";
import { NativeRemote } from "@/git/remote/native";
import { Logger } from "@/git/util/logger";
import { LibsqlDatabase } from "@/sqlite/database";
import type { FindWorktreeEntriesArgs } from "@/types";

export const createClient = <C extends Config<ConfigInput>>(args: {
  config: C;
  database: LibsqlClient;
}) => {
  const { config, database } = args;
  const db = new LibsqlDatabase({ client: database, config });
  const remote = config.localPath
    ? new NativeRemote({ config })
    : new GitHubRemote({ config });
  // const git = new Git({ config, remote, db });
  const git = new Git({ config, remote, db });
  const collections = {} as OrmConfig<{
    [K in keyof C["configInput"]["collections"] as C["configInput"]["collections"][K]["name"]]: C["configInput"]["collections"][K];
  }>;
  for (const collection of Object.values(config.collections)) {
    (collections as Record<string, unknown>)[collection.name] = {
      findMany: (args: Omit<FindWorktreeEntriesArgs, "collection">) =>
        git.findMany({ ...args, collection: collection.name }),
    };
  }
  return {
    ...collections,
    _: {
      config,
      git,
      logger: new Logger({ name: "something" }),
      db,
    },
  };
};

/**
 * Structural type for `handle()` / `createHandler()` and anywhere you need to accept any `createClient()` result.
 * Uses `Record<string, any>` for collection keys so concrete ORM shapes assign without casts.
 */
export type Tr33Client = {
  _: {
    config: Config<ConfigInput>;
    git: Git;
    logger: Logger;
    db: LibsqlDatabase;
  };
  // biome-ignore lint/suspicious/noExplicitAny: collection entries vary per app config
} & Record<string, any>;
