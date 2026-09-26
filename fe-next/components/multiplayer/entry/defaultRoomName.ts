import { sanitizeRoomName } from '@/utils/consts';

/** The default room name stays well inside the server's 50-char RoomNameSchema. */
export const DEFAULT_ROOM_NAME_MAX = 30;
const HOST_NAME_MAX = 20;

type T = (key: string, params?: Record<string, string | number>) => string;

/**
 * "{{name}}'s Room" for a host who did not name their room.
 *
 * The server's RoomNameSchema rejects apostrophes, so sanitizeRoomName strips
 * them — the old template ("{{name}}'s Room") therefore always shipped as
 * "Ohads Room". The `mpUi.entry.defaultRoomName` templates are written so they
 * SURVIVE the sanitizer in every locale (English uses U+02BC MODIFIER LETTER
 * APOSTROPHE, a letter per Unicode, so the possessive is kept). Only the host
 * name is sanitized (it can carry apostrophes, bidi marks, emoji); the whole
 * result is sanitized once more as a guard and capped.
 */
export function defaultRoomName(t: T, hostName: string): string {
  const name = sanitizeRoomName(hostName).slice(0, HOST_NAME_MAX).trim();
  const templated = t('mpUi.entry.defaultRoomName', { name });
  return sanitizeRoomName(templated).slice(0, DEFAULT_ROOM_NAME_MAX).trim();
}
