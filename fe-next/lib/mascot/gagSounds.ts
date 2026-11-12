/** Manifest id in public/sounds/mascot-gags/manifest.json → SOUND_EFFECTS key. */
export const GAG_SOUND_KEYS = {
  bonk: 'gagBonk',
  'dizzy-stars': 'gagDizzyStars',
  'faceplant-thud': 'gagFaceplantThud',
  'glass-squeak': 'gagGlassSqueak',
  'rubber-stamp': 'gagRubberStamp',
  'book-slam': 'gagBookSlam',
  'tape-measure': 'gagTapeMeasure',
  'tile-stack-wobble': 'gagTileStackWobble',
  'tile-stack-crash': 'gagTileStackCrash',
  'tiny-whimper': 'gagTinyWhimper',
  crumple: 'gagCrumple',
  'drumroll-short': 'gagDrumrollShort',
  'mascot-cry': 'gagMascotCry',
  'slow-clap': 'gagSlowClap',
} as const;

export type MascotGagSound = (typeof GAG_SOUND_KEYS)[keyof typeof GAG_SOUND_KEYS];

const DEFAULT_VOLUME = 0.6;

// These were mastered 3-6 LUFS under the rest (mostly transients), so they get the gain back here.
const VOLUME: Partial<Record<MascotGagSound, number>> = {
  gagCrumple: 1,
  gagSlowClap: 0.95,
  gagFaceplantThud: 0.85,
};

const GAG_SOUNDS: ReadonlySet<string> = new Set(Object.values(GAG_SOUND_KEYS));

export function gagSoundVolume(sound: string): number | undefined {
  if (!GAG_SOUNDS.has(sound)) return undefined;
  return VOLUME[sound as MascotGagSound] ?? DEFAULT_VOLUME;
}
