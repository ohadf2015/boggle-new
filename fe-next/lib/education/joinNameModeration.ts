// Server-only so `bad-words` stays out of client bundles.
import { isProfane } from '@/backend/utils/profanityFilter';
import { isChatProfane } from '@/backend/utils/chatProfanity';
import { suggestPlayerName } from '@/utils/onboardingNameSuggestions';

/** Whole words in all six class languages (plus a few unambiguous Japanese substrings), so a name merely containing a banned piece passes. */
export function isProfaneJoinName(name: string): boolean {
  const parts = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const flagged = (text: string) => isProfane(text) || isChatProfane(text);
  if (flagged(parts.join(' '))) return true;
  // "f u c k" / "b.i.t.c.h": letters spaced out to slip past a word match.
  return parts.length > 2 && parts.every((p) => [...p].length === 1) && flagged(parts.join(''));
}

/** Names go on the projector wall: a profane one is swapped for a generated one, without telling the student. */
export function moderateJoinName(
  name: string,
  locale: string,
  pick: (locale: string) => string = suggestPlayerName,
): string {
  return name && isProfaneJoinName(name) ? pick(locale) : name;
}

const LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

/** The join page's language, so a replacement name reads naturally to the class. */
export function joinNameLocale(referer: string | null): string {
  try {
    const segment = new URL(referer ?? '').pathname.split('/')[1];
    return LOCALES.has(segment) ? segment : 'en';
  } catch {
    return 'en';
  }
}
