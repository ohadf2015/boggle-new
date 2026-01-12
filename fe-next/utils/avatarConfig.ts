/**
 * Avatar Configuration
 * Defines all available character avatar images
 */

export interface AvatarConfig {
  id: string;
  name: string;
  filename: string;
}

// Special constant for "use profile avatar" selection
export const PROFILE_AVATAR_ID = '__profile_avatar__';

/**
 * All available avatars - 17 character images
 */
export const AVATARS: AvatarConfig[] = [
  { id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' },
  { id: 'drippy-drop', name: 'Drippy Drop', filename: 'drippy-drop.png' },
  { id: 'sunny-steve', name: 'Sunny Steve', filename: 'sunny-steve.png' },
  { id: 'cloudy-carl', name: 'Cloudy Carl', filename: 'cloudy-carl.png' },
  { id: 'octo-otto', name: 'Octo Otto', filename: 'octo-otto.png' },
  { id: 'pizza-pete', name: 'Pizza Pete', filename: 'pizza-pete.png' },
  { id: 'prickly-pat', name: 'Prickly Pat', filename: 'prickly-pat.png' },
  { id: 'melon-molly', name: 'Melon Molly', filename: 'melon-molly.png' },
  { id: 'avo-alex', name: 'Avo Alex', filename: 'avo-alex.png' },
  { id: 'frosty-frank', name: 'Frosty Frank', filename: 'frosty-frank.png' },
  { id: 'flaky-fred', name: 'Flaky Fred', filename: 'flaky-fred.png' },
  { id: 'eggy-ed', name: 'Eggy Ed', filename: 'eggy-ed.png' },
  { id: 'slimy-sam', name: 'Slimy Sam', filename: 'slimy-sam.png' },
  { id: 'starry-stella', name: 'Starry Stella', filename: 'starry-stella.png' },
  { id: 'shroom-shelly', name: 'Shroom Shelly', filename: 'shroom-shelly.png' },
  { id: 'donut-danny', name: 'Donut Danny', filename: 'donut-danny.png' },
  { id: 'jelly-jen', name: 'Jelly Jen', filename: 'jelly-jen.png' },
];

/**
 * Get avatar by ID
 */
export function getAvatarById(id: string): AvatarConfig | undefined {
  return AVATARS.find(avatar => avatar.id === id);
}

/**
 * Get random avatar
 */
export function getRandomAvatar(): AvatarConfig {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

/**
 * Get avatar path for rendering
 */
export function getAvatarPath(avatar: AvatarConfig | string): string {
  if (typeof avatar === 'string') {
    // Could be an ID or a filename - check if it's an ID first
    const avatarConfig = getAvatarById(avatar);
    const filename = avatarConfig ? avatarConfig.filename : avatar;
    return `/avatars/${filename}`;
  }
  return `/avatars/${avatar.filename}`;
}

/**
 * Check if an avatar ID is valid (exists in AVATARS or is PROFILE_AVATAR_ID)
 */
export function isValidAvatarId(id: string): boolean {
  return id === PROFILE_AVATAR_ID || AVATARS.some(avatar => avatar.id === id);
}

/**
 * Get avatar ID with fallback to random if invalid
 */
export function getValidAvatarId(id: string | undefined | null): string {
  if (!id) return getRandomAvatar().id;
  if (isValidAvatarId(id)) return id;
  return getRandomAvatar().id;
}

/**
 * Avatar emoji and color mappings for leaderboard display
 */
const AVATAR_EMOJI_COLOR_MAP: Record<string, { emoji: string; color: string }> = {
  'broccoli-bob': { emoji: '🥦', color: '#10b981' },
  'drippy-drop': { emoji: '💧', color: '#3b82f6' },
  'sunny-steve': { emoji: '☀️', color: '#f59e0b' },
  'cloudy-carl': { emoji: '☁️', color: '#94a3b8' },
  'octo-otto': { emoji: '🐙', color: '#8b5cf6' },
  'pizza-pete': { emoji: '🍕', color: '#ef4444' },
  'prickly-pat': { emoji: '🌵', color: '#22c55e' },
  'melon-molly': { emoji: '🍉', color: '#f472b6' },
  'avo-alex': { emoji: '🥑', color: '#84cc16' },
  'frosty-frank': { emoji: '🧊', color: '#06b6d4' },
  'flaky-fred': { emoji: '🥐', color: '#d97706' },
  'eggy-ed': { emoji: '🥚', color: '#fbbf24' },
  'slimy-sam': { emoji: '🦠', color: '#a3e635' },
  'starry-stella': { emoji: '⭐', color: '#fcd34d' },
  'shroom-shelly': { emoji: '🍄', color: '#dc2626' },
  'donut-danny': { emoji: '🍩', color: '#ec4899' },
  'jelly-jen': { emoji: '🪼', color: '#c084fc' },
};

const DEFAULT_EMOJI_COLOR = { emoji: '🎯', color: '#6366f1' };

/**
 * Get emoji and color for an avatar ID
 * Used for leaderboard display when avatar images can't be shown
 */
export function getAvatarEmojiAndColor(avatarId: string): { emoji: string; color: string } {
  return AVATAR_EMOJI_COLOR_MAP[avatarId] ?? DEFAULT_EMOJI_COLOR;
}
