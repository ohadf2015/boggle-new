/**
 * Avatar Configuration
 * Defines all available character avatar images
 */

import { getAvatarColorHex } from '@/lib/designSystem';

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
 * Map emoji to avatar configuration
 * Used for emoji-based avatar selection
 */
export function mapEmojiToAvatar(emoji: string): AvatarConfig {
  const emojiMap: Record<string, string> = {
    '🐶': 'prickly-pat',
    '🐱': 'slimy-sam',
    '🐭': 'starry-stella',
    '🐹': 'sunny-steve',
    '🐰': 'cloudy-carl',
    '🦊': 'pizza-pete',
    '🐻': 'broccoli-bob',
    '🐼': 'octo-otto',
    '🐨': 'melon-molly',
    '🐯': 'avo-alex',
    '🦁': 'frosty-frank',
    '🐮': 'flaky-fred',
    '🐷': 'eggy-ed',
    '🐸': 'shroom-shelly',
    '🐵': 'donut-danny',
    '🐔': 'jelly-jen',
    '🐧': 'drippy-drop',
    '🐦': 'sunny-steve',
    '🐤': 'cloudy-carl',
    '🦆': 'melon-molly',
    '🦅': 'starry-stella',
    '🦉': 'broccoli-bob',
    '🦇': 'octo-otto',
    '🐺': 'slimy-sam',
    '🐗': 'prickly-pat',
    '🐴': 'pizza-pete',
    '🦄': 'jelly-jen',
    '🐝': 'sunny-steve',
    '🐛': 'slimy-sam',
    '🦋': 'jelly-jen',
    '🐌': 'slimy-sam',
    '🐞': 'prickly-pat',
  };

  const avatarId = emojiMap[emoji] || getRandomAvatar().id;
  return getAvatarById(avatarId) || getRandomAvatar();
}

/**
 * Avatar emoji and color mappings for leaderboard display
 * Uses hex colors for socket/database compatibility
 */
const AVATAR_EMOJI_COLOR_MAP: Record<string, { emoji: string; color: string }> = {
  'broccoli-bob': { emoji: '🥦', color: getAvatarColorHex('broccoli-bob') },
  'drippy-drop': { emoji: '💧', color: getAvatarColorHex('drippy-drop') },
  'sunny-steve': { emoji: '☀️', color: getAvatarColorHex('sunny-steve') },
  'cloudy-carl': { emoji: '☁️', color: getAvatarColorHex('cloudy-carl') },
  'octo-otto': { emoji: '🐙', color: getAvatarColorHex('octo-otto') },
  'pizza-pete': { emoji: '🍕', color: getAvatarColorHex('pizza-pete') },
  'prickly-pat': { emoji: '🌵', color: getAvatarColorHex('prickly-pat') },
  'melon-molly': { emoji: '🍉', color: getAvatarColorHex('melon-molly') },
  'avo-alex': { emoji: '🥑', color: getAvatarColorHex('avo-alex') },
  'frosty-frank': { emoji: '🧊', color: getAvatarColorHex('frosty-frank') },
  'flaky-fred': { emoji: '🥐', color: getAvatarColorHex('flaky-fred') },
  'eggy-ed': { emoji: '🥚', color: getAvatarColorHex('eggy-ed') },
  'slimy-sam': { emoji: '🦠', color: getAvatarColorHex('slimy-sam') },
  'starry-stella': { emoji: '⭐', color: getAvatarColorHex('starry-stella') },
  'shroom-shelly': { emoji: '🍄', color: getAvatarColorHex('shroom-shelly') },
  'donut-danny': { emoji: '🍩', color: getAvatarColorHex('donut-danny') },
  'jelly-jen': { emoji: '🪼', color: getAvatarColorHex('jelly-jen') },
};

const DEFAULT_EMOJI_COLOR = { emoji: '🎯', color: '#FF6B6B' };

/**
 * Get emoji and color for an avatar ID
 * Used for leaderboard display when avatar images can't be shown
 */
export function getAvatarEmojiAndColor(avatarId: string): { emoji: string; color: string } {
  return AVATAR_EMOJI_COLOR_MAP[avatarId] ?? DEFAULT_EMOJI_COLOR;
}
