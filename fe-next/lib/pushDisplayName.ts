/**
 * Display-name resolution for push notifications.
 *
 * The DB assigns every nameless signup a placeholder username of the form
 * `Player_<8hex>` (migration 20260504160000) and guests get `Player-XXXX` /
 * `Guest_*`. These are truthy strings, so the old `username || 'Rival'` guard
 * never fired — the placeholder leaked straight into push copy ("Player_00952ce3
 * matched your score"). The real name almost always lives in a sibling column
 * (`leaderboard.display_name` / `profiles.display_name`); the lookup just never
 * preferred it.
 *
 * `resolveRivalDisplayName` takes an ordered list of name candidates (best
 * first) and returns the first one that is a real chosen name, falling back to
 * a localized generic noun only when EVERY candidate is a placeholder. This
 * fixes both reported complaints at once: shows the real name when it exists,
 * and never shows a raw ID when it doesn't.
 */

import type { PushLocale } from '@/backend/utils/pushTranslations';
import { isPlaceholderName } from './displayName';

// Re-exported for back-compat: the canonical implementation now lives in
// `lib/displayName.ts` so UI and backend share one placeholder definition.
export { isPlaceholderName };

/** Localized generic noun used when no real name is recoverable. */
const RIVAL_GENERIC: Record<PushLocale, string> = {
  en: 'a rival',
  he: 'יריב',
  sv: 'en rival',
  ja: 'ライバル',
  es: 'un rival',
  ru: 'соперник',
};

/**
 * Resolve the best display name from an ordered candidate list (best first,
 * e.g. `[display_name, username]`). Returns the first real (non-placeholder)
 * candidate, trimmed; otherwise the localized generic rival noun.
 */
export function resolveRivalDisplayName(
  candidates: Array<string | null | undefined>,
  locale: PushLocale
): string {
  for (const c of candidates) {
    if (!isPlaceholderName(c)) return (c as string).trim();
  }
  return RIVAL_GENERIC[locale] ?? RIVAL_GENERIC.en;
}
