/**
 * Localized display label for a `game_results.game_mode` id.
 *
 * `game_results` stores hyphenated ids ('word-hunt'); the existing i18n keys are
 * camelCased under `leaderboard.gameModes.*`. This bridges the two and humanizes
 * any unmapped id as a safe fallback.
 */

import { OTHER_MODE } from './xpByMode';

type TFn = (key: string) => string;

// Maps a hyphenated game_mode id → its leaderboard.gameModes.* sub-key.
const MODE_I18N_KEY: Record<string, string> = {
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  'wheel-rush': 'wheelRush',
};

function humanize(mode: string): string {
  return mode
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getModeLabel(mode: string, t: TFn): string {
  if (mode === OTHER_MODE) return t('profile.xpByMode.other');
  const subKey = MODE_I18N_KEY[mode];
  if (subKey) return t(`leaderboard.gameModes.${subKey}`);
  return humanize(mode);
}
