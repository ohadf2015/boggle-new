// Server-only so `bad-words` stays out of client bundles.
import { isProfane } from '@/backend/utils/profanityFilter';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';
import { sanitizeGuestDisplayName } from '@/shared/guestDisplayName';

/** A guest's name fit for a public daily board, or null when it is empty, profane or one we generated. */
export function acceptGuestBoardName(raw: unknown): string | null {
  const name = sanitizeGuestDisplayName(raw, '');
  if (!name || isProfane(name) || isDefaultPlayerName(name)) return null;
  return name;
}
