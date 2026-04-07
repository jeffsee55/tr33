import { z as zod } from "zod/v4";
import {
  collection,
  connect,
  filter,
  json,
  markdown,
  variant,
} from "@/zod/extensions";

export { defineConfig } from "@/client/config";
export { createClient, type Tr33Client } from "@/client/index";

export const z = {
  ...zod,
  variant,
  markdown,
  json,
  connect,
  collection,
  filter,
};
