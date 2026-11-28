/**
 * practiceTileArt — which sticker goes on which practice tile and on the hero.
 *
 * One transparent cube-mascot sticker per tile id, each holding the prop that says
 * what the mode is. Transparent art floats on any fill (tile surface or hero
 * accent) at any size, so tiles and hero share it.
 */

/** Unknown ids (a mode added later) still get a picture. */
const FALLBACK_ID = 'word_list';

const KNOWN_IDS = new Set([
  'solo_board', 'word_tower', 'warmup', 'blitz', 'matching', 'spelling', 'flashcard', 'word_list',
  'vocab_focus:definition', 'vocab_focus:synonym', 'vocab_focus:antonym', 'vocab_focus:context',
  'vocab_focus:multiple_meaning', 'vocab_focus:roots_affixes',
  'produce:definition', 'produce:context', 'produce:synonym', 'produce:antonym',
]);

/** Resolve the sticker for a picker tile id (`blitz`, `vocab_focus:synonym`, `produce:context`, …). */
export function practiceTileArt(tileId: string): string {
  const id = KNOWN_IDS.has(tileId) ? tileId : FALLBACK_ID;
  return `/mascot/teacher/practice/${id.replace(':', '-')}.webp`;
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
