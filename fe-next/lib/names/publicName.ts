// Server-only: pulls in `bad-words`. Clients ask /api/names/check instead.
import { isProfane } from '@/backend/utils/profanityFilter';
import { isPlaceholderName } from '@/lib/displayName';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';

export type PublicNameIssue = 'empty' | 'placeholder' | 'default' | 'profane';

/** Why a name can't be shown to other players, or null when it can. */
export function publicNameIssue(name: string | null | undefined): PublicNameIssue | null {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return 'empty';
  if (isPlaceholderName(trimmed)) return 'placeholder';
  if (isDefaultPlayerName(trimmed)) return 'default';
  if (isProfane(trimmed)) return 'profane';
  return null;
}

/** A name fit to show other players: chosen by the player, not generated, not profane. */
export function isPublicName(name: string | null | undefined): boolean {
  return publicNameIssue(name) === null;
}

export function publicNameOrNull(name: string | null | undefined): string | null {
  return isPublicName(name) ? (name as string).trim() : null;
}

interface NamedBoardRow {
  username?: string | null;
  display_name?: string | null;
}

/** Public board rows only: a row shows when its display name or username is public; a non-public display name is cleared. */
export function toPublicBoardRows<T extends NamedBoardRow>(rows: T[] | null | undefined): T[] {
  if (!Array.isArray(rows)) return [];
  const out: T[] = [];
  for (const row of rows) {
    const displayOk = isPublicName(row.display_name);
    if (!displayOk && !isPublicName(row.username)) continue;
    out.push(displayOk || row.display_name == null ? row : { ...row, display_name: null });
  }
  return out;
}
