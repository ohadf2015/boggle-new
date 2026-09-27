/**
 * Decides whether the in-menu notification list should be its own scroll
 * container.
 *
 * A short list must NOT become a nested scroll port: with `overscroll-contain`
 * an inner box swallows touch/wheel gestures and refuses to chain them to the
 * parent drawer even when it has nothing to scroll — which makes the side menu
 * feel unscrollable when you grab the notification card. So we only impose a
 * max-height + scroll once the list genuinely overflows; below that, the list
 * flows into the drawer and the drawer's own scroll handles everything.
 */

/** Items that comfortably fit inside the list's max-height without scrolling. */
export const NOTIFICATION_FIT_THRESHOLD = 4;

/**
 * @param itemCount number of notification rows actually rendered
 * @param maxHClass Tailwind max-height class to apply when scroll is needed
 * @returns scroll-container classes, or '' to let the list flow into the drawer
 */
export function notificationListScrollClass(itemCount: number, maxHClass: string): string {
  if (itemCount <= NOTIFICATION_FIT_THRESHOLD) return '';
  return `${maxHClass} overflow-y-auto overscroll-contain`;
}
