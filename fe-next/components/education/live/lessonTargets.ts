import { isWordOnBoard } from '@/utils/utils';
import { normalizeWord } from '@/shared/utils/wordNormalization';
import type { Language, LetterGrid } from '@/shared/types/game';
import type { LessonClaimAvatar, LessonClaimsView } from '@/shared/types/lessonClaims';

export interface LessonTarget {
  word: string;
  found: boolean;
}

export interface LessonTargetsInput {
  words: readonly string[];
  foundWords: ReadonlyArray<{ word: string; isValid?: boolean | null }>;
  grid: LetterGrid | null | undefined;
  language: string;
  gameMode: string | null | undefined;
  gameModeConfirmed: boolean;
}

// Only Classic shows the very grid the server checked the lesson words against; the other modes
// redraw it, clear it or already show their own target.
const TARGET_MODES = new Set(['classic']);

export function buildLessonTargets(input: LessonTargetsInput): LessonTarget[] | null {
  const { words, foundWords, grid, gameMode, gameModeConfirmed } = input;
  if (!gameModeConfirmed || !gameMode || !TARGET_MODES.has(gameMode)) return null;
  if (!grid || grid.length === 0 || words.length === 0) return null;
  const language = input.language as Language;
  const key = (w: string) => normalizeWord(w.trim(), language).toLowerCase();

  const found = new Set(foundWords.filter((fw) => fw.isValid === true).map((fw) => key(fw.word)));
  const seen = new Set<string>();
  const targets: LessonTarget[] = [];
  for (const word of words) {
    const k = key(word);
    // The lobby emit carries the whole lesson until the post-deal refresh lands; never send a
    // student after a word the board cannot spell.
    if (!k || seen.has(k) || !isWordOnBoard(word, grid, language)) continue;
    seen.add(k);
    targets.push({ word, found: found.has(k) });
  }
  return targets.length > 0 ? targets : null;
}

export function maskLessonWord(word: string): { first: string; rest: number } {
  const chars = Array.from(word.trim());
  return { first: (chars[0] ?? '').toUpperCase(), rest: Math.max(0, chars.length - 1) };
}

export type StripSlotState = 'hidden' | 'mine' | 'taken';

export interface StripSlot {
  key: string;
  first: string;
  rest: number;
  state: StripSlotState;
  word?: string;
  by?: string;
  avatar?: LessonClaimAvatar | null;
}

export function targetsToSlots(targets: readonly LessonTarget[]): StripSlot[] {
  return targets.map(({ word, found }): StripSlot => {
    const { first, rest } = maskLessonWord(word);
    return found ? { key: word, first, rest, state: 'mine', word } : { key: word, first, rest, state: 'hidden' };
  });
}

/** The server's race list as strip slots; claims are matched to me case-insensitively, like seat names. */
export function buildRaceSlots(view: LessonClaimsView, me: string): StripSlot[] {
  const mine = me.toLowerCase();
  return view.slots.map(({ index, first, length, claim }): StripSlot => {
    const base = { key: String(index), first, rest: Math.max(0, length - 1) };
    if (claim) {
      return claim.username.toLowerCase() === mine
        ? { ...base, state: 'mine', word: claim.word }
        : { ...base, state: 'taken', word: claim.word, by: claim.username, avatar: claim.avatar };
    }
    return { ...base, state: 'hidden' };
  });
}
