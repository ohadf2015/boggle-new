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
  { id: 'broccoli-bob', name: "Brock O'Lee", filename: 'broccoli-bob.png' },
  { id: 'drippy-drop', name: 'Splash Gordon', filename: 'drippy-drop.png' },
  { id: 'sunny-steve', name: 'Ray Sunshine', filename: 'sunny-steve.png' },
  { id: 'cloudy-carl', name: 'Cumulus Klaus', filename: 'cloudy-carl.png' },
  { id: 'octo-otto', name: 'Inky McSquid', filename: 'octo-otto.png' },
  { id: 'pizza-pete', name: 'Cheesy Chad', filename: 'pizza-pete.png' },
  { id: 'prickly-pat', name: 'Spike Needleton', filename: 'prickly-pat.png' },
  { id: 'melon-molly', name: 'Melvin Seedless', filename: 'melon-molly.png' },
  { id: 'avo-alex', name: 'Smash Avocadro', filename: 'avo-alex.png' },
  { id: 'frosty-frank', name: 'Scoop Dogg', filename: 'frosty-frank.png' },
  { id: 'flaky-fred', name: 'Flaky McButter', filename: 'flaky-fred.png' },
  { id: 'eggy-ed', name: 'Sunny Sideup', filename: 'eggy-ed.png' },
  { id: 'slimy-sam', name: 'Wobbles McGee', filename: 'slimy-sam.png' },
  { id: 'starry-stella', name: 'Twinkle Stardust', filename: 'starry-stella.png' },
  { id: 'shroom-shelly', name: 'Fungi McSpore', filename: 'shroom-shelly.png' },
  { id: 'donut-danny', name: 'Sprinkles McGlaze', filename: 'donut-danny.png' },
  { id: 'jelly-jen', name: 'Stinger Belle', filename: 'jelly-jen.png' },
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
