/**
 * Avatar Configuration
 * Defines all available avatar images with their funny names
 */

export interface AvatarConfig {
  id: string;
  name: string;
  filename: string;
}

/**
 * All available avatars - compressed character images
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
 * Map avatar ID to emoji representation (for Word Hunt leaderboard compatibility)
 * Returns an emoji and color that represents the avatar
 */
export function getAvatarEmojiAndColor(avatarId: string): { emoji: string; color: string } {
  const avatarToEmojiMap: Record<string, { emoji: string; color: string }> = {
    'broccoli-bob': { emoji: '🥦', color: '#10b981' },
    'drippy-drop': { emoji: '💧', color: '#06b6d4' },
    'sunny-steve': { emoji: '☀️', color: '#f59e0b' },
    'cloudy-carl': { emoji: '☁️', color: '#94a3b8' },
    'octo-otto': { emoji: '🐙', color: '#8b5cf6' },
    'pizza-pete': { emoji: '🍕', color: '#ef4444' },
    'prickly-pat': { emoji: '🌵', color: '#84cc16' },
    'melon-molly': { emoji: '🍉', color: '#ec4899' },
    'avo-alex': { emoji: '🥑', color: '#22c55e' },
    'frosty-frank': { emoji: '❄️', color: '#60a5fa' },
    'flaky-fred': { emoji: '❄️', color: '#e0f2fe' },
    'eggy-ed': { emoji: '🥚', color: '#fef3c7' },
    'slimy-sam': { emoji: '💚', color: '#4ade80' },
    'starry-stella': { emoji: '⭐', color: '#fbbf24' },
    'shroom-shelly': { emoji: '🍄', color: '#f87171' },
    'donut-danny': { emoji: '🍩', color: '#fb923c' },
    'jelly-jen': { emoji: '🍇', color: '#c084fc' },
  };

  return avatarToEmojiMap[avatarId] || { emoji: '🎯', color: '#6366f1' };
}

/**
 * Map emoji to avatar (for migration from emoji-based avatars)
 * Maps the most commonly used emojis to similar avatar images
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
