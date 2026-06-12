/**
 * Per-theme emoji used to give each Wordfall level its own visual identity —
 * surfaced on the level intro, the HUD theme label, and the result card. A
 * single emoji is cheap, locale-agnostic (renders identically in he/ja/sv/es),
 * and instantly telegraphs the level's concept without an image asset.
 *
 * Keys mirror the theme ids in BlastGame's MODE_COLORS map. Unknown themes
 * (procedurally generated levels can carry novel theme ids) fall back to a
 * neutral sparkle so the slot is never empty.
 */
const THEME_EMOJI: Record<string, string> = {
  fruits: '🍎',
  animals: '🐾',
  food: '🍕',
  ocean: '🌊',
  space: '🚀',
  nature: '🌿',
  sports: '⚽',
  colors: '🎨',
  transport: '🚗',
  body: '💪',
  home: '🏠',
  school: '🎒',
  tools: '🔧',
  weather: '⛅',
  music: '🎵',
  jobs: '👷',
  family: '👨‍👩‍👧',
  numbers: '🔢',
  feelings: '💖',
  mythology: '🐉',
  science: '🔬',
  travel: '✈️',
  art: '🖌️',
  time: '⏰',
  onboarding: '✨',
  // Mood themes
  joy: '😄',
  cozy: '🧸',
  spooky: '👻',
  magic: '🪄',
  adventure: '🗺️',
};

const FALLBACK_EMOJI = '✨';

export function themeEmoji(theme: string | undefined | null): string {
  if (!theme) return FALLBACK_EMOJI;
  return THEME_EMOJI[theme] ?? FALLBACK_EMOJI;
}
