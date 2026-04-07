import { TR33_ACTIVE_REF_COOKIE } from "./preview-cookies";

/**
 * Minimal client shape for active-ref resolution. Any `createClient()` instance satisfies this.
 */
export type Tr33ForActiveRef = {
  _: { config: { ref: string } };
};

/**
 * Minimal shape of `cookies()` from `next/headers` (sync read after await).
 */
export type Tr33RequestCookies = {
  get(name: string): { value: string } | undefined;
};

/**
 * Parses the raw HTTP `Cookie` header into {@link Tr33RequestCookies} so {@link resolveActiveRef}
 * can be used from H3 / `Request` handlers (no Next.js `cookies()`).
 */
export function cookiesFromCookieHeader(
  cookieHeader: string | null | undefined,
): Tr33RequestCookies {
  return {
    get(name: string): { value: string } | undefined {
      if (cookieHeader == null || cookieHeader === "") return undefined;
      const parts = cookieHeader.split(";").map((p) => p.trimStart());
      const prefix = `${name}=`;
      for (const part of parts) {
        if (part.startsWith(prefix)) {
          const raw = part.slice(prefix.length);
          try {
            return { value: decodeURIComponent(raw) };
          } catch {
            return { value: raw };
          }
        }
      }
      return undefined;
    },
  };
}

/**
 * Resolves the active git ref from the **`tr33-active-ref`** cookie, falling back to **`configRef`**
 * when the cookie is absent or empty. The cookie is set when switching branches via the Tr33 git API
 * and cleared when exiting branch preview (`POST …/tr33/preview`).
 *
 * This does **not** use Next.js [Draft Mode](https://nextjs.org/docs/app/api-reference/functions/draft-mode);
 * the ref cookie alone is the source of truth for “previewing” a non-default branch.
 */
export function resolveActiveRef(args: {
  tr33: Tr33ForActiveRef;
  cookies: Tr33RequestCookies;
}): string {
  const trimmed = args.cookies.get(TR33_ACTIVE_REF_COOKIE)?.value?.trim();
  return trimmed ? trimmed : args.tr33._.config.ref;
}
