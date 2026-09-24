/**
 * Split out of customAvatar.ts (file-size rule). Re-exported from there, so
 * every existing import of HIDDEN_PARTS keeps working.
 */
// Parts that look broken or read wrong — hidden from picker + random generation,
// but kept in the schema enum so existing saved configs still validate and render.
// Bar for hiding: clearly looks bad AND isn't stylized/funny enough to redeem.
// Stylized-but-unusual parts (cyclops, hypno, geometric bases) stay visible.
export const HIDDEN_PARTS = {
  // 2026-09 art redraw: ids without their own drawing. They render as their
  // closest same-rarity sibling via lib/avatar/legacyMap.ts (kept in sync by
  // lib/avatar/__tests__/legacyMap.test.ts).
  base: ['hexagon', 'rectangular', 'blob', 'oblong', 'triangle', 'shield', 'starBase', 'moonBase'],
  eyes: [
    'none', 'relaxed', 'crossEyed', 'squint', 'focused', 'catPupils', 'doe', 'crying', 'determined',
    'smokyEye', 'wingedLiner', 'money', 'alien', 'pixelEyes', 'targetEyes', 'catEye', 'sleepyEye',
    'laserEye', 'glitchEyes', 'rainbowEyes', 'diamondEye', 'cyberEye', 'gemEye', 'moonEye',
  ],
  eyebrows: ['short', 'feathered'],
  noseStyle: ['snub', 'roman', 'dot'],
  mouth: [
    'none', 'whistle', 'gap', 'buckTeeth', 'sideSmile', 'lipGloss', 'closedSmile', 'thinLips', 'drool',
    'mustache', 'pipe', 'rainbowTongue', 'tongueOut', 'grimace', 'zen', 'diamond', 'openLaugh', 'toothyGrind',
  ],
  facialHair: ['soulPatch', 'muttonChops', 'pencilMustache', 'fuManchu', 'rainbowBeard'],
  hair: [
    'topknot', 'sideshave', 'bangs', 'mullet', 'combover', 'frizzle', 'durag', 'locsShort', 'fade',
    'wolfCut', 'curtainBangs', 'halfUp', 'himecut', 'frenchBob', 'shag', 'flatTop', 'lob',
    'fingerWaves', 'curlyBangs', 'quiff', 'heartBuns', 'sideBow', 'milkmaidBraids', 'butterflyClips',
    'lowPigtailsBow', 'princessBraid', 'sideBraidBow', 'ramen', 'fadeCurly', 'twinTails', 'bobCut',
    'pompadour', 'slickBack', 'neon', 'iceSpikes',
  ],
  accessory: [
    'butterflyClip', 'keffiyeh', 'mustacheGlasses', 'fez', 'hat', 'pearls', 'antenna', 'clownNose',
    'bowtie', 'turban', 'cucumberFace', 'monkeyEars', 'chefHat', 'noseRing', 'choker', 'plunger',
    'devilHorns', 'monocle', 'mask', 'sombrero', 'gamerHeadset', 'graduationCap', 'tinfoilHat',
    'earrings', 'ninjaScarf', 'cape', 'wings',
  ],
  bodyStyle: [],
} as const;
