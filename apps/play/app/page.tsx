import { cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { resolveActiveRef, Toolbar } from "tr33/nextjs";
import { Tr33JsonView } from "tr33/react";

import { tr33 } from "@/lib/tr33";

async function loadPlaygroundDocsCached(ref: string): Promise<object> {
  "use cache";
  cacheTag("some-cache-tag");

  console.log({ ref });

  const result = await tr33.docs.findMany({ ref });
  return tr33._.logger.print(result, false) as object;
}

export async function getPlaygroundDocsViewData(): Promise<object> {
  const ref = resolveActiveRef({
    tr33,
    cookies: await cookies(),
  });
  return loadPlaygroundDocsCached(ref);
}

export async function PlaygroundDocsSection() {
  const viewData = await getPlaygroundDocsViewData();

  return <Tr33JsonView value={viewData} />;
}

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between gap-8 py-32 px-8 bg-white dark:bg-black sm:items-start">
        <Suspense
          fallback={
            <div className="w-full min-h-[200px] rounded-md border border-zinc-200 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50" />
          }
        >
          <PlaygroundDocsSection />
        </Suspense>
        <Toolbar tr33={tr33} />
      </main>
    </div>
  );
}
