/**
 * Drop $exception events with no usable payload. Prior to this filter PostHog
 * was recording dozens of $exception events per day with null type/message —
 * mostly cross-origin "Script error." and thrown non-Error values — that
 * pollute error tracking and waste event quota.
 */

interface PostHogEventLike {
  event?: string;
  properties?: Record<string, unknown>;
}

interface ExceptionListEntry {
  type?: string | null;
  value?: string | null;
  stacktrace?: unknown;
}

export function filterEmptyException<T extends PostHogEventLike | null>(
  event: T,
): T | null {
  if (!event || event.event !== '$exception') return event;

  const list = event.properties?.$exception_list as ExceptionListEntry[] | undefined;
  if (!Array.isArray(list) || list.length === 0) return null;

  const first = list[0];
  const type = first?.type;
  const value = first?.value;

  if (!type && !value) return null;
  if (value === 'Script error.' && !first?.stacktrace) return null;

  return event;
}
