/** Last git ref selected via Tr33 git API (create branch / switch worktree). */
export const TR33_ACTIVE_REF_COOKIE = "tr33-active-ref";

/**
 * When set to `1` on `GET …/git/worktrees/:ref`, the Next `handle` wrapper may set
 * {@link TR33_ACTIVE_REF_COOKIE}. The VS Code extension calls `worktrees/:ref` for FS state
 * without this header so those responses do not overwrite the host preview cookie.
 */
export const TR33_SYNC_HOST_ACTIVE_REF_HEADER = "x-tr33-sync-host-active-ref";

const ACTIVE_REF_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/**
 * Serialized `Set-Cookie` value for {@link TR33_ACTIVE_REF_COOKIE} (must match options in `handle`).
 * Used as an explicit header so the cookie is always on the wire (App Route + `Headers` cloning can drop
 * `Set-Cookie` from `NextResponse#cookies` in some cases).
 */
export function activeRefSetCookieHeader(ref: string): string {
  const value = encodeURIComponent(ref);
  return `${TR33_ACTIVE_REF_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ACTIVE_REF_MAX_AGE_SEC}`;
}
