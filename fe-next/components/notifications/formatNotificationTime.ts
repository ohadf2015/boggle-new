/**
 * Locale-aware relative time for notifications.
 *
 * Replaces `date-fns/formatDistanceToNow`, which rendered English ("2 hours ago")
 * for every locale because no `locale` was passed. Uses the existing
 * `notifications.*` keys (singular/plural) so he/sv/ja/es read correctly.
 *
 * `now` is injected (not read via Date.now() inside) to keep the function pure
 * and testable.
 */
type TFn = (key: string, params?: Record<string, string | number>) => string;

export function formatNotificationTime(
  createdAt: number | string | Date,
  now: number,
  t: TFn,
): string {
  const ts =
    createdAt instanceof Date
      ? createdAt.getTime()
      : typeof createdAt === 'string'
        ? new Date(createdAt).getTime()
        : createdAt;

  const diffMs = Math.max(0, now - ts); // clamp future timestamps (clock skew) to 0
  const seconds = diffMs / 1000;
  if (seconds < 60) return t('notifications.justNow');

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return t(minutes === 1 ? 'notifications.minutesAgo' : 'notifications.minutesAgoPlural', { count: minutes });
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t(hours === 1 ? 'notifications.hoursAgo' : 'notifications.hoursAgoPlural', { count: hours });
  }

  const days = Math.floor(hours / 24);
  return t(days === 1 ? 'notifications.daysAgo' : 'notifications.daysAgoPlural', { count: days });
}
