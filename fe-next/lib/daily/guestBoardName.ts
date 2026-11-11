import { publicNameOrNull } from '@/lib/names/publicName';
import { sanitizeGuestDisplayName } from '@/shared/guestDisplayName';

/** A guest's name fit for a public daily board, or null when it is empty, profane or one we generated. */
export function acceptGuestBoardName(raw: unknown): string | null {
  return publicNameOrNull(sanitizeGuestDisplayName(raw, ''));
}
