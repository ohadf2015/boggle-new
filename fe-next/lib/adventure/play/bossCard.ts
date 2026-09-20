/**
 * The boss-defeat share card's fields — the ONE place a share card's text is
 * resolved, used by the OG route that draws it and by the button that links it.
 *
 * Why it exists: the route used to parse its own params with
 * `Math.max(1, Math.min(10, parseInt(raw)))`, which is NaN for junk input, and
 * then indexed its name tables with that NaN. A captured share read
 * "Unknown Boss / UNKNOWN WORLD · WORLD NAN / VICTORY" — a silent wrong-art
 * render (Class 4 in .claude/rules/60-recurring-pitfalls.md), and the worst
 * possible instance of one, because a share image is the artifact that unfurls
 * in someone else's chat.
 *
 * The rule here: the card never asserts anything the caller did not supply.
 * A field either resolves to something true or comes back `null`, and the art
 * DROPS that element instead of printing a placeholder. The boss is resolved
 * from the WORLD (one source of truth) rather than from the boss id alone, so
 * an unrecognised id can no longer produce "Unknown Boss".
 */
import { WORLDS_COUNT } from '@/lib/adventure/constants';
import { getWorldConfig } from '@/lib/adventure/worldConfig';

/** English display names for the OG art (the card is not localised). */
export const BOSS_DISPLAY_NAMES: Record<string, string> = {
  msGrammar: 'Ms. Grammar',
  spellingBee: 'Spelling Bee',
  professorThesaurus: 'Professor Thesaurus',
  captainMetaphor: 'Captain Metaphor',
  baronBuildaword: 'Baron Buildaword',
  puzzleMaster: 'Puzzle Master',
  reflectionKing: 'Reflection King',
  cosmicWordsmith: 'Cosmic Wordsmith',
  linguistSage: 'Linguist Sage',
  lexiconDragon: 'Lexicon Dragon',
};

export const WORLD_DISPLAY_NAMES: Record<number, string> = {
  1: 'Alphabet Meadows',
  2: 'Synonym Springs',
  3: 'Root Caverns',
  4: 'Idiom Archipelago',
  5: 'Compound Canyon',
  6: 'Anagram Labyrinth',
  7: 'Mirror Palace',
  8: 'Neologism Nebula',
  9: 'Polyglot Peaks',
  10: 'Lexicon Throne',
};

/**
 * An integer, or null. `parseInt` alone answers NaN for junk and Infinity for
 * `1e999`; both survive `Math.min`/`Math.max` and reach the art, which is
 * exactly how "WORLD NAN" got rasterized.
 */
export function finiteInt(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const n = Number.parseFloat(String(raw).trim());
  return Number.isFinite(n) ? Math.floor(n) : null;
}

/** Drop pictographs, emoji modifiers and ZWJ joiners; collapse the leftover space. */
export const stripEmoji = (s: string): string =>
  s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

export const MAX_CARD_TEXT = 24;

export interface BossCardParams {
  world?: string | null;
  boss?: string | null;
  word?: string | null;
  player?: string | null;
  stars?: string | null;
}

export interface BossCardFields {
  /** null = the request never said which world, so the card says nothing about one. */
  world: number | null;
  worldName: string | null;
  bossName: string | null;
  /** null = no killing word was supplied; the slab is dropped, never filled with a placeholder. */
  word: string | null;
  /** null = no star count was supplied; the row is dropped rather than asserting zero or three. */
  stars: number | null;
  player: string;
}

export function bossCardFields(p: BossCardParams): BossCardFields {
  const n = finiteInt(p.world);
  const world = n != null && n >= 1 && n <= WORLDS_COUNT ? n : null;

  // The world names the boss. The `boss` id is only honoured when it is a name
  // we actually know, so no id can put "Unknown Boss" on a share image.
  const idFromWorld = world != null ? getWorldConfig(world).bossName : null;
  const id = p.boss && BOSS_DISPLAY_NAMES[p.boss] ? p.boss : idFromWorld;
  const bossName = id ? BOSS_DISPLAY_NAMES[id] ?? null : null;

  const rawWord = stripEmoji(String(p.word ?? '')).toUpperCase();
  const rawPlayer = stripEmoji(String(p.player ?? ''));
  const s = finiteInt(p.stars);

  return {
    world,
    worldName: world != null ? WORLD_DISPLAY_NAMES[world] ?? null : null,
    bossName,
    word: rawWord ? rawWord.slice(0, MAX_CARD_TEXT) : null,
    stars: s == null ? null : Math.max(0, Math.min(3, s)),
    player: (rawPlayer || 'Adventurer').slice(0, MAX_CARD_TEXT),
  };
}
