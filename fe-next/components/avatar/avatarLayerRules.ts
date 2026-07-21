/**
 * Shared layer / skip rules for AvatarRenderer + AvatarRendererSsr.
 *
 * Keep membership here so client and SSR PNG export never drift
 * (premium back-hair/accessories must render behind the face on both paths).
 */

/** Styles that render their main body behind the head */
export const BACK_LAYER_STYLES = new Set([
  'long', 'longFlow', 'afro', 'wavy', 'dreads', 'pigtails', 'sideshave', 'braids',
  'bun', 'bangs', 'twintails', 'twinTails', 'mullet', 'flame', 'galaxy', 'neon',
  'curly', 'straight', 'spaceBuns', 'cornrows', 'wolfCut', 'curtainBangs', 'halfUp',
  'himecut', 'lob', 'shag', 'curlyBangs', 'sideSwept', 'heartBuns', 'sideBow',
  'milkmaidBraids', 'butterflyClips', 'lowPigtailsBow', 'princessBraid', 'sideBraidBow',
  'ponytail', 'cottonCandy', 'vaporwave', 'bobCut',
]);

/** Accessories that render behind the face (ears, wings, etc.) */
export const BACK_ACCESSORY_STYLES = new Set([
  'monkeyEars', 'angelWings', 'demonWings', 'butterflyWings', 'wings', 'cape',
]);

/** Non-human bases that skip cheek blush & face depth effects */
export const SKIP_BLUSH_BASES = new Set([
  'skull', 'dragonHead', 'catFace', 'robotHead', 'alienHead', 'ghostFace',
  'starBase', 'moonBase',
]);

/** Bases with their own nose anatomy — skip NosePart overlay */
export const SKIP_NOSE_BASES = new Set([
  'skull', 'dragonHead', 'robotHead', 'alienHead',
]);

/** Bases that use the standard circle shape (get circular depth effects) */
export const CIRCULAR_BASES = new Set(['round', 'blob']);

/** Bases that use elliptical shape */
export const ELLIPTICAL_BASES = new Set(['oval', 'oblong', 'pear', 'rectangular']);

/** Eyes that are closed/non-standard and shouldn't get blink animation */
export const SKIP_BLINK_EYES = new Set([
  'none', 'sleepy', 'happy', 'dizzy', 'cool', 'wink',
  'galaxy', 'flame', 'robot', 'void', 'infinity', 'laser',
  'hypno', 'alien', 'crying', 'money', 'hearts', 'star',
  'closed', 'squint',
  'pixelEyes', 'glitchEyes', 'kawaii', 'thirdEye', 'rainbowEyes', 'targetEyes',
  // Premium overhaul
  'catEye', 'starEye', 'heartEye', 'diamondEye', 'sleepyEye', 'laserEye',
  'cyberEye', 'gemEye', 'moonEye',
]);

/** Eye styles where hardcoded lash positions don't align — skip generic female lashes */
export const SKIP_FEMALE_LASHES_EYES = new Set([
  'none', 'lashes', 'monocleEye', 'crossEyed', 'wingedLiner', 'smokyEye',
  'pixelEyes', 'glitchEyes', 'thirdEye',
  // Premium overhaul — custom silhouette / lashes baked in
  'catEye', 'starEye', 'heartEye', 'diamondEye', 'sleepyEye', 'laserEye',
  'animeEye', 'cyberEye', 'gemEye', 'moonEye',
]);
