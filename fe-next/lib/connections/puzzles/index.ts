import type { ConnectionPuzzle, PuzzleLocale } from '../types';
import { inferTheme } from '../theme';
import { EN_PUZZLES } from './generated/en.generated';
import { HE_PUZZLES } from './generated/he.generated';
import { ES_PUZZLES } from './generated/es.generated';
import { SV_PUZZLES } from './generated/sv.generated';
import { JA_PUZZLES } from './generated/ja.generated';

/**
 * Locales with a materialized native pool. Authored in the DB
 * (public.connections_puzzles), materialized to static .ts via
 * scripts/connections/materialize-puzzles.mjs. A locale with no entry here
 * falls back to 'en' via resolveLocale, exactly as before. ('ja' uses the
 * device IME — see localeNeedsIME / PuzzleCard.)
 */
const PUZZLES_BY_LOCALE: Partial<Record<PuzzleLocale, ConnectionPuzzle[]>> = {
  en: EN_PUZZLES,
  he: HE_PUZZLES,
  es: ES_PUZZLES,
  sv: SV_PUZZLES,
  ja: JA_PUZZLES,
};

/**
 * Deterministic greedy that spreads consecutive puzzles apart on four axes, in
 * priority order: exact bridge (hard), coarse semantic theme (soft), and the
 * word1 / word2 stems (soft). Players complained about "many similar riddles in
 * a row" even when the bridge varied — sometimes the surrounding words matched
 * (כוס+חלב then כוס+קפה: different bridges, identical word1), and sometimes the
 * puzzles merely shared a *feel* (two food-ish, two nature-ish back-to-back).
 * The theme axis (see ../theme) is what catches the latter.
 *
 * For each slot we score every remaining item by a penalty against the previous
 * pick and take the lowest. The bridge penalty dominates, so the same bridge is
 * never placed adjacently unless every remaining item shares it (truly forced).
 * Theme and stem penalties are soft nudges. A tiny "drain the biggest remaining
 * bridge bucket first" term breaks ties, so a dominant bridge can't pile up at
 * the end and force a run of repeats. Pure + deterministic (id-sorted base,
 * integer/rational penalties) — required for reproducible level numbering.
 */
const BRIDGE_PENALTY = 10000;
const THEME_PENALTY = 100;
const STEM_PENALTY = 30;

function interleaveByBridge(items: ConnectionPuzzle[]): ConnectionPuzzle[] {
  // Stable, deterministic base order; greedy reorders from here.
  const remaining = [...items].sort((a, b) => a.id.localeCompare(b.id));
  const themeOf = new Map(remaining.map((p) => [p.id, inferTheme(p)] as const));

  const out: ConnectionPuzzle[] = [];
  let lastBridge: string | null = null;
  let lastTheme: string | null = null;
  let lastWord1: string | null = null;
  let lastWord2: string | null = null;

  while (remaining.length > 0) {
    // Remaining count per bridge — used only as a tie-break toward draining the
    // dominant bucket first (scaled tiny so it never overrides a real penalty).
    const bridgeCount = new Map<string, number>();
    for (const p of remaining) bridgeCount.set(p.bridge, (bridgeCount.get(p.bridge) ?? 0) + 1);

    let bestIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i];
      let penalty = 0;
      if (p.bridge === lastBridge) penalty += BRIDGE_PENALTY;
      const th = themeOf.get(p.id)!;
      if (th !== 'misc' && th === lastTheme) penalty += THEME_PENALTY;
      if (p.word1 === lastWord1) penalty += STEM_PENALTY;
      if (p.word2 === lastWord2) penalty += STEM_PENALTY;
      // Prefer draining the largest remaining bridge bucket (tiny weight → pure
      // tie-break). Among equal penalties the lowest index (id-sorted) wins.
      penalty -= (bridgeCount.get(p.bridge) ?? 0) * 0.001;
      if (penalty < bestScore) {
        bestScore = penalty;
        bestIdx = i;
      }
    }

    const picked = remaining.splice(bestIdx, 1)[0];
    out.push(picked);
    lastBridge = picked.bridge;
    lastTheme = themeOf.get(picked.id)!;
    lastWord1 = picked.word1;
    lastWord2 = picked.word2;
  }
  return out;
}

/**
 * Hand-vetted opening for the level path. A new player walks
 * getPuzzleForLevel(1), (2), … — and the raw easy band led with the most
 * generic compounding morphemes (DRAW·BACK·FIRE, SNOW·BALL·ROOM), so the first
 * impression was "too easy / too obvious." The pool already contained
 * approachable-but-delightful "aha" easy puzzles (JIG·SAW·DUST, RAIN·BOW·TIE);
 * they were just buried by id/source ordering. This list pulls the charmers to
 * the front, verbatim, then the rest of the easy band interleaves as before.
 *
 * Picked to (a) be gettable yet have a satisfying twist, (b) be concrete/visual,
 * (c) disperse bridge + stems so no two openers feel alike. Ids must be `easy`
 * in the pool (asserted in openingCuration.test.ts); an unknown/typo'd id is
 * silently skipped — it can't break the level path.
 *
 * Locales not listed here (sv/es/ja) fall through to the plain interleave,
 * byte-for-byte unchanged. `he` is authored from the meaning-pivot puzzles
 * (the bridge flips sense between the two phrases: כאב·ראש·ממשלה — "head"ache /
 * "head" of state) and is flagged for native review.
 */
export const CURATED_OPENING: Partial<Record<PuzzleLocale, readonly string[]>> = {
  en: [
    'en-v-038', // RAIN · BOW · TIE       — rainbow / bow tie
    'en-v-035', // PINE · APPLE · SAUCE   — pineapple / applesauce
    'en-v-040', // SEA · HORSE · POWER    — seahorse / horsepower
    'en-v-036', // BUTTER · CUP · CAKE    — buttercup / cupcake
    'en-v-008', // JIG · SAW · DUST       — jigsaw / sawdust
    'en-v-053', // POT · BELLY · LAUGH    — potbelly / belly laugh
    'en-v-037', // COW · BOY · FRIEND     — cowboy / boyfriend
    'en-v-010', // FINGER · NAIL · POLISH — fingernail / nail polish
  ],
  he: [
    'he-e-034', // כאב · ראש · ממשלה     — כאב ראש (headache) / ראש ממשלה (PM)
    'he-h-028', // שלט · רחוק · מאוד     — שלט רחוק (remote) / רחוק מאוד (far)
    'he-h-020', // בית · ספר · תורה      — בית ספר (school) / ספר תורה (scroll)
    'he-e-081', // אמצע · יום · הולדת    — אמצע יום (midday) / יום הולדת (birthday)
    'he-h-022', // מי · ברז · מים        — מי ברז (tap water) / ברז מים
    'he-e-016', // גלידת · שמנת · חמוצה  — גלידת שמנת (cream) / שמנת חמוצה (sour cream)
    'he-e-070', // טחנת · רוח · קלה      — טחנת רוח (windmill) / רוח קלה (light breeze)
    'he-h-041', // מכונת · כביסה · ידנית — מכונת כביסה (machine) / כביסה ידנית (hand-wash)
  ],
};

/**
 * Difficulty-ramped order: easy → medium → hard. Within each difficulty, bridges
 * are interleaved so the same category does not appear back-to-back. The curated
 * opening (if any) is pinned to the front of the easy band verbatim; the rest of
 * the easy band, plus medium and hard, interleave as before. Built once at module
 * load — pools are import-time constants.
 */
const ORDERED_BY_LOCALE: Partial<Record<PuzzleLocale, ConnectionPuzzle[]>> = (() => {
  const out: Partial<Record<PuzzleLocale, ConnectionPuzzle[]>> = {};
  for (const locale of Object.keys(PUZZLES_BY_LOCALE) as PuzzleLocale[]) {
    const all = PUZZLES_BY_LOCALE[locale] ?? [];
    const easyAll = all.filter((p) => p.difficulty === 'easy');

    // Pin curated openers to the front (verbatim, in listed order), keeping only
    // ids that resolve to an actual easy puzzle. Everything else interleaves.
    const byId = new Map(easyAll.map((p) => [p.id, p] as const));
    const opening = (CURATED_OPENING[locale] ?? [])
      .map((id) => byId.get(id))
      .filter((p): p is ConnectionPuzzle => !!p);
    const openSet = new Set(opening.map((p) => p.id));
    const easyRest = easyAll.filter((p) => !openSet.has(p.id));

    out[locale] = [
      ...opening,
      ...interleaveByBridge(easyRest),
      ...interleaveByBridge(all.filter((p) => p.difficulty === 'medium')),
      ...interleaveByBridge(all.filter((p) => p.difficulty === 'hard')),
    ];
  }
  return out;
})();

/** Map a UI locale to a locale we have a native pool for; otherwise fall back to 'en'. */
function resolveLocale(locale: string): PuzzleLocale {
  return locale in PUZZLES_BY_LOCALE ? (locale as PuzzleLocale) : 'en';
}

export function getPuzzlesForLocale(locale: string): ConnectionPuzzle[] {
  return PUZZLES_BY_LOCALE[resolveLocale(locale)] ?? PUZZLES_BY_LOCALE.en ?? [];
}

function activeOrdered(locale: PuzzleLocale, banned?: ReadonlySet<string>): ConnectionPuzzle[] {
  const ordered = ORDERED_BY_LOCALE[locale] ?? ORDERED_BY_LOCALE.en ?? [];
  if (!banned || banned.size === 0) return ordered;
  return ordered.filter((p) => !banned.has(p.id));
}

export function getTotalLevels(locale: string, banned?: ReadonlySet<string>): number {
  return activeOrdered(resolveLocale(locale), banned).length;
}

/**
 * Returns the puzzle for a given level number (1-based). Cycles through the
 * ordered pool when level exceeds total — keeps the game playable at high levels.
 *
 * `banned` is the auto-ban set from `v_connections_banned_puzzles` (≥3 distinct
 * authenticated players flagged dislike+gave_up). Filtered out before
 * indexing so level numbers always map to a *playable* puzzle.
 */
export function getPuzzleForLevel(
  locale: string,
  level: number,
  banned?: ReadonlySet<string>,
): ConnectionPuzzle | null {
  const ordered = activeOrdered(resolveLocale(locale), banned);
  if (ordered.length === 0) return null;
  const lvl = Math.max(1, Math.floor(level));
  const idx = (lvl - 1) % ordered.length;
  return ordered[idx];
}

/** @deprecated kept for any legacy callers; new code should use getPuzzleForLevel */
export function getShuffledPuzzles(locale: string, count = 20): ConnectionPuzzle[] {
  const all = getPuzzlesForLocale(locale);
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  const easy = shuffled.filter((p) => p.difficulty === 'easy').slice(0, Math.floor(count * 0.4));
  const medium = shuffled.filter((p) => p.difficulty === 'medium').slice(0, Math.floor(count * 0.4));
  const hard = shuffled.filter((p) => p.difficulty === 'hard').slice(0, Math.floor(count * 0.2));
  return [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5);
}
