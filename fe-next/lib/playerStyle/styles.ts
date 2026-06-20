/**
 * Player Style registry — the single source of truth for music/theme personalization.
 *
 * A "style" is a music-genre identity the player picks. It drives:
 *   - the signature in-game music track (musicFile)
 *   - the accent color (accentHex → overrides the --accent CSS variable)
 *   - the mascot art used as the picker button + the player's badge
 *
 * `default` is a FIRST-CLASS style (musicFile/accentHex null = keep the original
 * track and the base --accent), so "keep default" in the popup simply selects it
 * and existing users see zero change.
 *
 * Adding a new style later = drop `public/music/styles/<key>.mp3`, a
 * `public/mascots/styles/<key>.png`, one row here, and 5 i18n labels. Nothing else.
 */

export type PlayerStyleKey =
  | 'default'
  | 'rock'
  | 'hasidic'
  | 'jazz'
  | 'arabic'
  | 'epic'
  | 'viking'
  | 'arcade'
  | 'latin'
  | 'reggae'
  | 'japanese'
  | 'k_pop'
  | 'desert_epic'
  | 'fanfare';

export interface PlayerStyle {
  key: PlayerStyleKey;
  /** i18n key: `playerStyle.styles.<key>` */
  labelKey: string;
  /** Accent color hex; `null` = use the base `--accent` (no override). */
  accentHex: string | null;
  /** Public path to the genre music file; `null` = keep the original track. */
  musicFile: string | null;
  /** Public path to the genre mascot art (picker button + player badge). */
  mascot: string;
  /** Quick glyph fallback used in chips / before art loads. */
  emoji: string;
}

export const DEFAULT_STYLE_KEY: PlayerStyleKey = 'default';

/** Ordered for the picker — `default` leads. */
export const STYLE_KEYS: PlayerStyleKey[] = [
  'default',
  'rock',
  'hasidic',
  'jazz',
  'arabic',
  'epic',
  'viking',
  'arcade',
  'latin',
  'reggae',
  'japanese',
  'k_pop',
  'desert_epic',
  'fanfare',
];

const def = (
  key: PlayerStyleKey,
  accentHex: string | null,
  emoji: string,
): PlayerStyle => ({
  key,
  labelKey: `playerStyle.styles.${key}`,
  accentHex,
  musicFile: key === 'default' ? null : `/music/styles/${key}.mp3`,
  mascot: key === 'default' ? '/mascot-new-main.jpg' : `/mascots/styles/${key}.png`,
  emoji,
});

export const STYLES: Record<PlayerStyleKey, PlayerStyle> = {
  default: def('default', null, '🎮'),
  rock: def('rock', '#ff2d4b', '🎸'),
  hasidic: def('hasidic', '#3b6fff', '🎻'),
  jazz: def('jazz', '#f2b134', '🎷'),
  arabic: def('arabic', '#1fb88a', '🪕'),
  epic: def('epic', '#ff6b35', '⚔️'),
  viking: def('viking', '#46c5e0', '🪓'),
  arcade: def('arcade', '#ff37d0', '👾'),
  latin: def('latin', '#ff5e57', '🪇'),
  reggae: def('reggae', '#36b04a', '🌴'),
  japanese: def('japanese', '#ff7eb6', '🌸'),
  k_pop: def('k_pop', '#b14bff', '🎤'),
  desert_epic: def('desert_epic', '#e0a526', '🏜️'),
  fanfare: def('fanfare', '#ffd13b', '🎺'),
};

export function isPlayerStyleKey(value: unknown): value is PlayerStyleKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(STYLES, value);
}

/** Resolve a (possibly untrusted) key to a concrete style, falling back to default. */
export function getStyle(key: unknown): PlayerStyle {
  return isPlayerStyleKey(key) ? STYLES[key] : STYLES[DEFAULT_STYLE_KEY];
}

/**
 * Decide which file the signature in-game track should play for a style.
 * Returns the style's music file, or the original path when the style overrides nothing.
 */
export function resolveStyleTrack(key: unknown, originalTrack: string): string {
  return getStyle(key).musicFile ?? originalTrack;
}

/** The accent hex to apply for a style, or `null` to leave the base `--accent` untouched. */
export function resolveStyleAccent(key: unknown): string | null {
  return getStyle(key).accentHex;
}

/**
 * Render a stored `profiles.player_style` value as a compact badge (emoji + label)
 * for admin/display surfaces. Returns `null` when the player never chose a style
 * (NULL/empty) so the caller can render nothing. Unknown-but-present keys still
 * badge (forward-compatible) with a generic glyph + a title-cased label.
 */
export function formatStyleBadge(
  style: string | null | undefined,
): { emoji: string; label: string } | null {
  const key = (style ?? '').trim();
  if (!key) return null;
  const titleCase = key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const emoji = isPlayerStyleKey(key) ? STYLES[key].emoji : '🎵';
  return { emoji, label: titleCase };
}
