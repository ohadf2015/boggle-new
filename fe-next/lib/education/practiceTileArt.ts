/**
 * practiceTileArt — which picture goes on which practice tile.
 *
 * The picker used to be thirteen identical cream cards separated only by a
 * 20px lucide glyph and a coloured strip. Nothing about it said "these are
 * games", and a student scanning it had to *read* all thirteen to choose. The
 * poster grid replaces that with a picture per tile, because a picture is the
 * only thing a 12-year-old parses at a glance.
 *
 * Two kinds of art, deliberately:
 *
 *  - **`poster`** — illustrated art drawn for that specific mode
 *    (`public/mascot/teacher/practice-*-sky.webp`), each on a flat pink, cyan
 *    or yellow field so it reads on the cream tile.
 *  - **`chip`** — a transparent mascot floated on the tile's accent colour, for
 *    every mode that has no bespoke poster yet.
 *
 * Keeping this a data table rather than inline JSX means adding a newly drawn
 * poster is a one-line change here, and a mode can never render art-less: the
 * resolver falls back through chip art to a guaranteed-present mascot.
 *
 * Only `-nobg` mascot files are eligible as chips. The rest of the library is
 * baked onto an opaque dark or white rectangle, which on a lime tile reads as a
 * bug rather than a mascot.
 */

/**
 * Modes with bespoke poster art. `field` is the colour baked into the image, not a theme token:
 * the cosy theme remaps the neo accents, and a remapped frame would show a seam around the poster.
 */
const POSTER_ART: Record<string, { src: string; field: string }> = {
  blitz: { src: '/mascot/teacher/practice-blitz-sky.webp', field: '#ff1493' },
  flashcard: { src: '/mascot/teacher/practice-flashcard-sky.webp', field: '#00ffff' },
  spelling: { src: '/mascot/teacher/practice-spelling-sky.webp', field: '#ffe135' },
};

/** Transparent mascot per tile for everything without a poster. */
const CHIP_ART: Record<string, string> = {
  solo_board: '/mascot/explorer-nobg.webp',
  word_tower: '/mascot/powerup-nobg.webp',
  warmup: '/mascot/streak-spark-nobg.webp',
  matching: '/mascot/mindblown-nobg.webp',
  word_list: '/mascot/bored-nobg.webp',
  'vocab_focus:definition': '/mascot/explorer-nobg.webp',
  'vocab_focus:synonym': '/mascot/mindblown-nobg.webp',
  'vocab_focus:antonym': '/mascot/powerup-nobg.webp',
  'vocab_focus:context': '/mascot/trophy-nobg.webp',
  'vocab_focus:multiple_meaning': '/mascot/mindblown-nobg.webp',
  'vocab_focus:roots_affixes': '/mascot/explorer-nobg.webp',
};

/** Last-resort art, so no tile can ever render empty. */
const FALLBACK_CHIP = '/mascot/trophy-nobg.webp';

/**
 * Hero art for the three modes whose bespoke poster is a tall 896x1200 plate.
 *
 * A poster works on a tile, where the frame is nearly as tall as it is wide. The
 * hero frame is landscape, so `object-cover` throws away two thirds of the
 * drawing and lands on the mascot's chin — and `object-contain` is worse, since
 * the poster's own field sitting on a different accent fill reads as a failed
 * image load. The hero therefore always floats a transparent
 * mascot on the accent, which cannot crop wrong at any size.
 */
const HERO_CHIP: Record<string, string> = {
  blitz: '/mascot/onfire-nobg.webp',
  spelling: '/mascot/powerup-nobg.webp',
  flashcard: '/mascot/mindblown-nobg.webp',
};

export type PracticeArtKind = 'poster' | 'chip';

export interface PracticeTileArt {
  src: string;
  kind: PracticeArtKind;
  /** Poster only: the poster's own field colour, so the frame letterboxes it without a seam. */
  field?: string;
}

/** Resolve the art for a picker tile id (`blitz`, `vocab_focus:synonym`, …). */
export function practiceTileArt(tileId: string): PracticeTileArt {
  const poster = POSTER_ART[tileId];
  if (poster) return { ...poster, kind: 'poster' };
  return { src: CHIP_ART[tileId] ?? FALLBACK_CHIP, kind: 'chip' };
}

/**
 * Transparent mascot for the recommended-practice hero.
 *
 * Only `-nobg` art is eligible: everything else in the library is baked onto an
 * opaque dark or white rectangle, which on a lime or pink fill reads as a bug
 * rather than a mascot.
 */
export function practiceHeroArt(tileId: string): string {
  return HERO_CHIP[tileId] ?? CHIP_ART[tileId] ?? FALLBACK_CHIP;
}

/**
 * Tile accent colour. Electric and mode-coded, per the brand: lime/pink/cyan/
 * purple only. neo-yellow is reserved for celebration and gold, neo-orange for
 * streak and fire, so neither appears here.
 */
export const PRACTICE_TILE_ACCENT: Record<string, string> = {
  solo_board: 'bg-neo-cyan',
  word_tower: 'bg-neo-purple',
  warmup: 'bg-neo-pink',
  blitz: 'bg-neo-pink',
  matching: 'bg-neo-lime',
  spelling: 'bg-neo-purple',
  flashcard: 'bg-neo-cyan',
  word_list: 'bg-neo-lime',
  'vocab_focus:definition': 'bg-neo-cyan',
  'vocab_focus:synonym': 'bg-neo-lime',
  'vocab_focus:antonym': 'bg-neo-pink',
  'vocab_focus:context': 'bg-neo-purple',
  'vocab_focus:multiple_meaning': 'bg-neo-purple',
  'vocab_focus:roots_affixes': 'bg-neo-cyan',
};

export function practiceTileAccent(tileId: string): string {
  return PRACTICE_TILE_ACCENT[tileId] ?? 'bg-neo-cyan';
}
