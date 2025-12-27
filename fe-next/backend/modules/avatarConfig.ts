/**
 * Avatar Configuration (Backend)
 * Defines all available avatar images with their funny names
 * This is the TypeScript version for backend use
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
export function getAvatarPath(avatar: string | AvatarConfig): string {
  const filename = typeof avatar === 'string' ? avatar : avatar.filename;
  return `/avatars/${filename}`;
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

// CommonJS exports for backward compatibility
module.exports = {
  AVATARS,
  getAvatarById,
  getRandomAvatar,
  getAvatarPath,
  mapEmojiToAvatar,
};
