/**
 * Starts the second session from the classroom handoff page.
 * A repeat call in the same tab (Strict Mode, refresh) does not count again.
 */
import { parseClassModeBridgeStart, rememberClassModeBridge, secondSessionHref } from './classModeBridge';
import { trackSecondSessionStarted } from './classModeBridgeTelemetry';

const STARTED_PREFIX = 'lc.classModeBridge.started.';

type BridgeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function beginClassModeBridgeSession(
  search: string,
  locale: string,
  storage: BridgeStorage | null,
): string | null {
  const start = parseClassModeBridgeStart(search);
  if (!start) return null;
  const href = secondSessionHref(locale, start);
  const key = `${STARTED_PREFIX}${start.classId}.${start.mode}`;
  if (storage?.getItem(key) === '1') return href;
  rememberClassModeBridge(start, storage);
  trackSecondSessionStarted({ class_id: start.classId, mode: start.mode });
  try {
    storage?.setItem(key, '1');
  } catch {
    /* the redirect still carries the class */
  }
  return href;
}
