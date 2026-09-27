/**
 * Miss-gap homework — the game the student actually plays.
 *
 * The async homework link used to open a static list of missed words with a
 * "mark complete" button: nothing to do, nothing to verify. This module turns
 * the same word list into a 2-3 minute tappable round set.
 *
 * Round kinds, best first:
 *   meaning  — 4 definitions, tap the one that matches the word. Only buildable
 *              when the teacher's definitions travelled with the assignment.
 *   spelling — 4 spellings of the word, three of them plausible misspellings.
 *              Always buildable, and it is the right task for a word the class
 *              just got WRONG: recognise it before you produce it.
 *   spell    — tap letter tiles in order. Production, one step harder.
 *
 * Everything here is pure and seeded: the same assignment gives every student
 * the same rounds in the same order, so "I got the hard one" is never true.
 */

/** Rounds per session — tuned so a phone session lands at 2-3 minutes. */
export const MISS_GAP_MAX_ROUNDS = 8;

/** Seconds on the clock per round kind. Generous: this is practice, not a race. */
const SECONDS_BY_KIND = { meaning: 20, spelling: 15, spell: 25 } as const;

const DECOY_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VOWELS = 'aeiou';
const VOWEL_SWAP: Record<string, string> = {
  a: 'e', e: 'a', i: 'e', o: 'u', u: 'o',
};

export type MissGapRoundKind = 'meaning' | 'spelling' | 'spell';

export interface MissGapChoice {
  id: string;
  label: string;
  correct: boolean;
}

export interface MissGapRound {
  id: string;
  kind: MissGapRoundKind;
  word: string;
  /** Definition shown above a `spell` round when we have one, else ''. */
  hint: string;
  choices: MissGapChoice[];
  /** Upper-case letter tiles — `spell` rounds only. */
  tiles: string[];
  seconds: number;
}

export interface BuildMissGapRoundsArgs {
  words: string[];
  /** word (any case) → teacher definition. Unlocks `meaning` rounds. */
  definitions?: Record<string, string>;
  seed?: number | string;
  maxRounds?: number;
}

/** Small deterministic PRNG (mulberry32) so a seed always replays the same set. */
function makeRng(seed: number | string): () => number {
  let h = 2166136261;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function cleanWords(words: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of words || []) {
    const word = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= max) break;
  }
  return out;
}

function lowerKeyed(definitions: Record<string, string> | undefined) {
  const map = new Map<string, string>();
  for (const [word, definition] of Object.entries(definitions || {})) {
    const text = String(definition || '').replace(/\s+/g, ' ').trim();
    if (text) map.set(String(word).toLowerCase(), text);
  }
  return map;
}

/**
 * Plausible misspellings: swap two neighbours, double a letter, drop a letter,
 * swap a vowel. Ordered most-confusable first so short words still fill four
 * distinct options.
 */
export function makeMisspellings(word: string, rng: () => number): string[] {
  const lower = word.toLowerCase();
  const candidates: string[] = [];
  const push = (value: string) => {
    if (value && value.toLowerCase() !== lower && !candidates.includes(value)) {
      candidates.push(value);
    }
  };

  for (let i = 0; i < word.length - 1; i += 1) {
    if (word[i].toLowerCase() === word[i + 1].toLowerCase()) continue;
    push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  }
  for (let i = 0; i < word.length; i += 1) {
    const letter = word[i].toLowerCase();
    if (VOWEL_SWAP[letter]) {
      push(word.slice(0, i) + VOWEL_SWAP[letter] + word.slice(i + 1));
    }
  }
  for (let i = 1; i < word.length; i += 1) {
    push(word.slice(0, i) + word[i] + word.slice(i));
  }
  for (let i = 1; i < word.length; i += 1) {
    push(word.slice(0, i) + word.slice(i + 1));
  }
  // Last resort for 2-letter words: append a doubled final letter.
  push(`${word}${word[word.length - 1] || 'e'}`);
  push(`${word}e`);

  return shuffle(candidates, rng);
}

/** Letter tiles for a tap-to-spell round: every letter of the word plus decoys. */
export function buildSpellTiles(word: string, rng: () => number): string[] {
  const letters = word.toUpperCase().replace(/[^A-ZÀ-ɏ֐-׿]/g, '').split('');
  const base = letters.length > 0 ? letters : word.toUpperCase().split('');
  const decoyCount = base.length <= 4 ? 2 : 3;
  const decoys: string[] = [];
  for (let i = 0; i < decoyCount; i += 1) {
    decoys.push(DECOY_LETTERS[Math.floor(rng() * DECOY_LETTERS.length)]);
  }
  return shuffle([...base, ...decoys], rng);
}

function choicesFrom(
  correct: string,
  wrong: string[],
  rng: () => number,
): MissGapChoice[] {
  const labels = [correct];
  for (const option of wrong) {
    if (labels.length >= 4) break;
    if (!labels.some((l) => l.toLowerCase() === option.toLowerCase())) labels.push(option);
  }
  return shuffle(labels, rng).map((label, index) => ({
    id: `c${index}`,
    label,
    correct: label === correct,
  }));
}

export function buildMissGapRounds(args: BuildMissGapRoundsArgs): MissGapRound[] {
  const max = Math.max(1, args.maxRounds ?? MISS_GAP_MAX_ROUNDS);
  const words = cleanWords(args.words, max);
  const defs = lowerKeyed(args.definitions);
  const rng = makeRng(args.seed ?? 'miss-gap');
  const allDefinitions = [...new Set(defs.values())];

  return words.map((word, index) => {
    const hint = defs.get(word.toLowerCase()) || '';
    const wantsChoice = index % 2 === 0;

    if (wantsChoice && hint && allDefinitions.length >= 4) {
      const distractors = shuffle(
        allDefinitions.filter((d) => d !== hint),
        rng,
      );
      return {
        id: `r${index}-${word.toLowerCase()}`,
        kind: 'meaning' as const,
        word,
        hint: '',
        choices: choicesFrom(hint, distractors, rng),
        tiles: [],
        seconds: SECONDS_BY_KIND.meaning,
      };
    }

    if (wantsChoice) {
      const wrong = makeMisspellings(word, rng);
      if (wrong.length >= 3) {
        return {
          id: `r${index}-${word.toLowerCase()}`,
          kind: 'spelling' as const,
          word,
          hint,
          choices: choicesFrom(word, wrong, rng),
          tiles: [],
          seconds: SECONDS_BY_KIND.spelling,
        };
      }
    }

    return {
      id: `r${index}-${word.toLowerCase()}`,
      kind: 'spell' as const,
      word,
      hint,
      choices: [],
      tiles: buildSpellTiles(word, rng),
      seconds: SECONDS_BY_KIND.spell,
    };
  });
}

export interface MissGapAnswer {
  roundId: string;
  correct: boolean;
  msTaken: number;
}

export interface MissGapRunScore {
  total: number;
  correct: number;
  /** 0-100, rounded. */
  accuracy: number;
  /** 1-3. Finishing always earns at least one. */
  stars: number;
  bestStreak: number;
  durationMs: number;
}

/** Accuracy → stars. Finishing the homework is worth a star on its own. */
export function starsForAccuracy(accuracy: number): number {
  if (accuracy >= 90) return 3;
  if (accuracy >= 70) return 2;
  return 1;
}

export function scoreMissGapRun(
  rounds: MissGapRound[],
  answers: MissGapAnswer[],
): MissGapRunScore {
  const total = rounds.length;
  let correct = 0;
  let bestStreak = 0;
  let run = 0;
  let durationMs = 0;

  for (const answer of answers) {
    durationMs += Math.max(0, answer.msTaken || 0);
    if (answer.correct) {
      correct += 1;
      run += 1;
      if (run > bestStreak) bestStreak = run;
    } else {
      run = 0;
    }
  }

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { total, correct, accuracy, stars: starsForAccuracy(accuracy), bestStreak, durationMs };
}
