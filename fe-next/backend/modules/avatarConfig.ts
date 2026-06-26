/**
 * Avatar Configuration (Backend)
 * Defines all available character avatar images
 * This is the TypeScript version for backend use
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
export function getAvatarPath(avatar: string | AvatarConfig): string {
  const filename = typeof avatar === 'string' ? avatar : avatar.filename;
  return `/avatars/${filename}`;
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

