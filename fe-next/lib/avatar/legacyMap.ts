/**
 * Old part id → new art id.
 *
 * The 2026-09 art rewrite draws a curated set of parts. Part ids did NOT
 * change (every saved avatar_config still parses, every gold price / level
 * ladder / premium_avatar_parts key is still valid); ids that no longer have
 * their own drawing are "retired" and render as their closest sibling here.
 *
 * Invariants (tested over EVERY enum id):
 *  - total: any string / null / junk maps to a canonical id;
 *  - rarity-equal: a retired id maps to a part of the SAME rarity, so a bought
 *    legendary never renders as a common and a free part never looks premium;
 *  - retired ids == HIDDEN_PARTS in shared/types/customAvatar.ts, so pickers
 *    and the randomizer never hand one out.
 *
 * Pure: no React, safe for server + client.
 */
import {
  DEFAULT_AVATAR_CONFIG,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';

export const LEGACY_CATEGORIES = [
  'base', 'hair', 'eyes', 'eyebrows', 'noseStyle', 'mouth', 'facialHair', 'accessory', 'bodyStyle',
] as const;
export type LegacyCategory = (typeof LEGACY_CATEGORIES)[number];

/** Parts that have their own drawing in components/avatar/art. Picker order. */
export const CANONICAL_PARTS: Record<LegacyCategory, readonly string[]> = {
  base: [
    'square', 'round', 'oval', 'heart', 'pear', 'catFace',
    'slime', 'diamond',
    'skull', 'robotHead', 'alienHead', 'ghostFace',
    'dragonHead',
  ],
  hair: [
    'none', 'buzz', 'spiky', 'sideSwept', 'mohawk', 'curly', 'afro', 'dreads', 'cornrows',
    'straight', 'wavy', 'long', 'bob', 'pixie', 'ponytail', 'bun', 'pigtails', 'braids',
    'cottonCandy', 'vaporwave', 'twintails', 'elvis', 'spaceBuns', 'undercut', 'longFlow',
    'lightning', 'rainbowMohawk', 'flame', 'galaxy',
    // legendary celebrity-lookalike cues (celebrity bots wear these)
    'trumpSwoop', 'recedingHair', 'highAndTight',
  ],
  eyes: [
    'round', 'happy', 'sparkle', 'cool', 'sleepy', 'wink', 'wide', 'curious', 'lashes',
    'closed', 'angry', 'sad', 'dizzy', 'hearts', 'star',
    'kawaii', 'animeEye', 'confident', 'cyclops', 'monocleEye', 'laser', 'hypno',
    'heartEye', 'starEye', 'flame', 'galaxy', 'robot', 'void',
    'infinity', 'thirdEye',
  ],
  eyebrows: [
    'none', 'natural', 'thin', 'thick', 'flat', 'raised', 'worried', 'angry', 'unibrow',
    'arched', 'bushy', 'scarred',
    'angryThick',
  ],
  noseStyle: ['none', 'button', 'round', 'pointed', 'wide', 'long', 'cat', 'clown'],
  mouth: [
    'smile', 'grin', 'smirk', 'oh', 'flat', 'frown', 'pout', 'tongue', 'kiss', 'teeth',
    'cat', 'braces', 'bubbleGum', 'lipstick',
    'fangs', 'vampire', 'goldTooth', 'zipper', 'blowfish', 'robotMouth',
    'neonSmile', 'dragon', 'glitch', 'grillz',
  ],
  facialHair: [
    'none', 'stubble', 'mustache', 'goatee', 'shortBeard', 'fullBeard', 'chinStrap',
    'handlebar', 'vanDyke', 'trimmedBeard',
    'wizardBeard', 'braidedBeard', 'flameBeard',
  ],
  accessory: [
    'none', 'glasses', 'sunglasses', 'heartGlasses', 'goggles', 'cap', 'beanie', 'headband',
    'bandana', 'bow', 'catEars', 'bunnyEars', 'horns', 'halo', 'partyHat', 'propellerHat',
    'earring', 'scarf',
    'headphones', 'cowboyHat', 'duckHat', 'crown', 'tiara', 'flowerCrown', 'topHat',
    'pirateHat', 'viking', 'eyepatch', 'vrHeadset',
    'frogHat', 'butterflyWings', 'iceCrown', 'wizardHat', 'astronaut', 'angelWings',
    'demonWings', 'cyberpunkVisor', 'samurai', 'flamingHalo',
    'phoenixCrown', 'crystalCrown', 'microphone', 'earsOut',
  ],
  bodyStyle: ['default', 'hoodie', 'suit', 'turtleneck', 'offShoulder', 'cropTop'],
};

/** Retired id → canonical id. Same rarity on both sides (tested). */
const RETIRED: Record<LegacyCategory, Record<string, string>> = {
  base: {
    hexagon: 'square', rectangular: 'square', blob: 'round', oblong: 'oval', triangle: 'heart',
    shield: 'robotHead', starBase: 'alienHead', moonBase: 'ghostFace',
  },
  hair: {
    topknot: 'bun', sideshave: 'pixie', bangs: 'bob',
    mullet: 'straight', combover: 'sideSwept', frizzle: 'curly', durag: 'cornrows', locsShort: 'dreads',
    fade: 'buzz', wolfCut: 'wavy', curtainBangs: 'straight', halfUp: 'long', himecut: 'long',
    frenchBob: 'bob', shag: 'wavy', flatTop: 'buzz', lob: 'bob', fingerWaves: 'wavy',
    curlyBangs: 'curly', quiff: 'sideSwept', heartBuns: 'pigtails', sideBow: 'ponytail',
    milkmaidBraids: 'braids', butterflyClips: 'long', lowPigtailsBow: 'braids',
    princessBraid: 'braids', sideBraidBow: 'braids',
    ramen: 'cottonCandy', fadeCurly: 'undercut', twinTails: 'twintails', bobCut: 'longFlow',
    pompadour: 'elvis', slickBack: 'undercut',
    neon: 'lightning', iceSpikes: 'galaxy',
  },
  eyes: {
    none: 'round', relaxed: 'cool', crossEyed: 'dizzy', squint: 'sleepy', focused: 'cool',
    catPupils: 'round', doe: 'sparkle', crying: 'sad', determined: 'angry', smokyEye: 'lashes',
    wingedLiner: 'lashes',
    money: 'hypno', alien: 'animeEye', pixelEyes: 'laser', targetEyes: 'hypno', catEye: 'confident',
    sleepyEye: 'confident', laserEye: 'laser',
    glitchEyes: 'robot', rainbowEyes: 'galaxy', diamondEye: 'starEye', cyberEye: 'robot',
    gemEye: 'starEye', moonEye: 'void',
  },
  eyebrows: { short: 'thin', feathered: 'natural' },
  noseStyle: { snub: 'button', roman: 'long', dot: 'round' },
  mouth: {
    none: 'smile', whistle: 'oh', gap: 'teeth', buckTeeth: 'teeth', sideSmile: 'smirk',
    lipGloss: 'lipstick', closedSmile: 'smile', thinLips: 'flat', drool: 'tongue', mustache: 'smile',
    pipe: 'goldTooth', rainbowTongue: 'fangs', tongueOut: 'fangs', grimace: 'zipper', zen: 'blowfish',
    diamond: 'grillz', openLaugh: 'neonSmile', toothyGrind: 'grillz',
  },
  facialHair: {
    soulPatch: 'goatee', muttonChops: 'chinStrap', pencilMustache: 'mustache',
    fuManchu: 'handlebar', rainbowBeard: 'flameBeard',
  },
  accessory: {
    butterflyClip: 'bow', keffiyeh: 'bandana', mustacheGlasses: 'glasses', fez: 'beanie',
    hat: 'cap', pearls: 'earring', antenna: 'propellerHat', clownNose: 'partyHat', bowtie: 'scarf',
    turban: 'bandana', cucumberFace: 'sunglasses', monkeyEars: 'catEars', chefHat: 'beanie',
    noseRing: 'earring', choker: 'earring', plunger: 'partyHat',
    devilHorns: 'viking', monocle: 'eyepatch', mask: 'eyepatch', sombrero: 'cowboyHat',
    gamerHeadset: 'headphones', graduationCap: 'topHat', tinfoilHat: 'topHat', earrings: 'tiara',
    ninjaScarf: 'samurai', cape: 'demonWings', wings: 'angelWings',
  },
  bodyStyle: {},
};

/** Fallback for unknown / missing values. */
const DEFAULTS: Record<LegacyCategory, string> = {
  base: 'square',
  hair: 'straight',
  eyes: 'round',
  eyebrows: 'none',
  noseStyle: 'button',
  mouth: 'smile',
  facialHair: 'none',
  accessory: 'none',
  bodyStyle: 'default',
};

const CANON_SETS: Record<LegacyCategory, ReadonlySet<string>> = Object.fromEntries(
  LEGACY_CATEGORIES.map(c => [c, new Set(CANONICAL_PARTS[c])]),
) as unknown as Record<LegacyCategory, ReadonlySet<string>>;

function isCategory(c: string): c is LegacyCategory {
  return (LEGACY_CATEGORIES as readonly string[]).includes(c);
}

/** Premium-key category name → config key ("nose" → "noseStyle"). */
function toConfigCategory(c: string): LegacyCategory | null {
  if (isCategory(c)) return c;
  if (c === 'nose') return 'noseStyle';
  if (c === 'body') return 'bodyStyle';
  return null;
}

/** Total: always returns a canonical id for the category. */
export function mapLegacyPart(category: LegacyCategory | string, id: unknown): string {
  const cat = toConfigCategory(category);
  if (!cat) return typeof id === 'string' ? id : '';
  if (typeof id !== 'string' || id === '') return DEFAULTS[cat];
  if (CANON_SETS[cat].has(id)) return id;
  const to = RETIRED[cat][id];
  return to && CANON_SETS[cat].has(to) ? to : DEFAULTS[cat];
}

/** A known id that no longer has its own drawing (unknown strings are not "retired"). */
export function isRetiredPart(category: LegacyCategory | string, id: string): boolean {
  const cat = toConfigCategory(category);
  if (!cat) return false;
  return !CANON_SETS[cat].has(id) && Object.prototype.hasOwnProperty.call(RETIRED[cat], id);
}

/** The retired ids of a category (== HIDDEN_PARTS[category]). */
export function getRetiredParts(category: LegacyCategory): string[] {
  return Object.keys(RETIRED[category]).filter(id => !CANON_SETS[category].has(id));
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const hex = (v: unknown, fallback: string): string => (typeof v === 'string' && HEX_RE.test(v) ? v : fallback);

/**
 * Any saved avatar blob → a complete config whose every part id has a drawing.
 * Colors pass through (any valid hex), invalid ones fall back to defaults.
 * Never throws.
 */
export function resolveAvatarConfig(raw: unknown): CustomAvatarConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_AVATAR_CONFIG;
  const gender = src.gender === 'female' ? 'female' : 'male';
  const out = {
    gender,
    base: mapLegacyPart('base', src.base),
    skinColor: hex(src.skinColor, d.skinColor),
    hair: mapLegacyPart('hair', src.hair),
    hairColor: hex(src.hairColor, d.hairColor),
    eyes: mapLegacyPart('eyes', src.eyes),
    eyeColor: hex(src.eyeColor, d.eyeColor ?? '#4A6FA5'),
    noseStyle: mapLegacyPart('noseStyle', src.noseStyle),
    eyebrows: mapLegacyPart('eyebrows', src.eyebrows),
    facialHair: gender === 'male' ? mapLegacyPart('facialHair', src.facialHair) : 'none',
    mouth: mapLegacyPart('mouth', src.mouth),
    accessory: mapLegacyPart('accessory', src.accessory),
    accessoryColor: hex(src.accessoryColor, d.accessoryColor),
    bgColor: hex(src.bgColor, d.bgColor),
    shirtColor: hex(src.shirtColor, d.shirtColor ?? '#4A90D9'),
    bodyStyle: mapLegacyPart('bodyStyle', src.bodyStyle),
  };
  return out as CustomAvatarConfig;
}

/**
 * premium_avatar_parts keys + the canonical key of every retired part owned,
 * so someone who bought a part before the redraw can still equip what it
 * turned into. Unknown keys pass through untouched. No duplicates.
 */
export function expandOwnedKeys(owned: readonly string[]): string[] {
  const out = new Set<string>(owned);
  for (const key of owned) {
    const sep = key.indexOf(':');
    if (sep < 0) continue;
    const cat = key.slice(0, sep);
    const id = key.slice(sep + 1);
    if (!isRetiredPart(cat, id)) continue;
    out.add(`${cat}:${mapLegacyPart(cat, id)}`);
  }
  return [...out];
}
