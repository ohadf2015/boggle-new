/**
 * Decides the connection-banner copy + tone.
 *
 * The key distinction: a PLANNED server restart (deploy) should never show the
 * alarming "you went offline" message — the player's connection is fine, we're
 * just shipping a new version. `isServerUpdating` (set by the global socket
 * provider's `serverShutdown` handler) takes priority and yields calm,
 * reassuring "back in a moment" copy. Everything else falls back to the normal
 * disconnect/reconnect messaging.
 */
export type ConnectionStatusKind =
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'connecting';

export interface ConnectionBannerCopy {
  titleKey: string;
  subtitleKey: string | null;
  /** True during a planned deploy — callers use this to pick a calm (non-red) tone. */
  isUpdate: boolean;
}

export function connectionBannerCopy(
  status: ConnectionStatusKind,
  isServerUpdating: boolean,
): ConnectionBannerCopy {
  if (isServerUpdating) {
    return {
      titleKey: 'connection.serverUpdating',
      subtitleKey: 'connection.serverUpdatingHint',
      isUpdate: true,
    };
  }
  if (status === 'reconnecting') {
    return { titleKey: 'connection.reconnecting', subtitleKey: null, isUpdate: false };
  }
  return { titleKey: 'connection.disconnected', subtitleKey: null, isUpdate: false };
}
