/**
 * Decide whether the mobile 5s background-disconnect should arm when the page
 * hides (see utils/SocketContext.tsx handleVisibilityChange).
 *
 * A fullscreen ad hides the page without the player leaving — arming there
 * kills the room connection mid-ad. `fullscreenAdActive` comes from the
 * useRewardAdPause bus (module-level isFullscreenAdActive: the hide handler
 * can't wait for a React re-render before its 5s timer fires).
 */
export function shouldArmBackgroundDisconnect({
  fullscreenAdActive,
}: {
  fullscreenAdActive: boolean;
}): boolean {
  return !fullscreenAdActive;
}
