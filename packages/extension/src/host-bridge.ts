/**
 * Same-origin channel from the embedding Kit page → extension host. Must match
 * {@link TR33_KIT_HOST_REF_CHANNEL} in `packages/kit` (`kit-fab-menu.tsx`).
 */
export const TR33_KIT_HOST_REF_CHANNEL = "tr33-kit-host-ref";

/**
 * Same-origin channel from **extension host → Kit page** when the active ref changes
 * (e.g. branch switch). Distinct from {@link TR33_KIT_HOST_REF_CHANNEL} so messages do not
 * echo into {@link subscribeHostRef}. Must match `packages/kit` (`kit-fab-menu.tsx`).
 */
export const TR33_EXTENSION_TO_HOST_REF_CHANNEL = "tr33-extension-to-host";

/**
 * Extension host → Kit: worktree content changed (save / add / commit / discard) so the host
 * can soft-refresh RSC (`router.refresh()`). Must match `packages/kit`.
 */
export const TR33_EXTENSION_WORKSPACE_CHANGED_CHANNEL =
  "tr33-extension-workspace-changed";

export type HostRefMessage = { ref: string };

export function subscribeHostRef(onRef: (ref: string) => void): {
  dispose(): void;
} {
  if (typeof BroadcastChannel === "undefined") {
    return { dispose() {} };
  }
  const bc = new BroadcastChannel(TR33_KIT_HOST_REF_CHANNEL);
  bc.onmessage = (ev: MessageEvent<HostRefMessage>) => {
    const ref = ev.data?.ref;
    if (typeof ref === "string" && ref.length > 0) {
      onRef(ref);
    }
  };
  return {
    dispose() {
      bc.close();
    },
  };
}
