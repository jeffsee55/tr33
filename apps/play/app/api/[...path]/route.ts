import { handle } from "tr33/nextjs";

import { tr33 } from "@/lib/tr33";

const tr33Api = handle(tr33, {
  revalidateTagOnDraftExit: "some-cache-tag",
});

export const GET = tr33Api;
export const HEAD = tr33Api;
export const OPTIONS = tr33Api;
/** Git mutations and other Tr33 APIs use POST; Next only forwards exported methods. */
export const POST = tr33Api;
