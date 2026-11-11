import { stripEmoji } from '@/lib/share/stripEmoji';
import type { QuickMode } from './types';

export const LTR_ISOLATE = '⁦';
export const POP_ISOLATE = '⁩';

const LONG_WORD_LETTERS = 7;

type Translate = (key: string, params?: Record<string, string>) => string;

export interface WordSummary {
  count: number;
  longest: number;
  long: number;
}

export function summarizeWords(words: ReadonlyArray<{ word: string }>): WordSummary {
  let longest = 0;
  let long = 0;
  for (const { word } of words) {
    const letters = Array.from(word).length;
    if (letters > longest) longest = letters;
    if (letters >= LONG_WORD_LETTERS) long += 1;
  }
  return { count: words.length, longest, long };
}

// Isolated so a Hebrew line can't reorder "420" and "73%" around its words.
const num = (n: number) => `${LTR_ISOLATE}${n}${POP_ISOLATE}`;

export interface QuickShareInput {
  mode: QuickMode;
  score: number;
  scorePct: number;
  words: ReadonlyArray<{ word: string }>;
  targetWordFound?: boolean;
  dayStreak: number;
  t: Translate;
}

/** Spoiler-free recap: counts and lengths only, never a found word. */
export function buildQuickShareText({
  mode,
  score,
  scorePct,
  words,
  targetWordFound,
  dayStreak,
  t,
}: QuickShareInput): string {
  const summary = summarizeWords(words);
  const lines = [
    t('quickPlay.solo.recap.header', { mode: t(`quickPlay.solo.mode.${mode}`) }),
    t('quickPlay.solo.recap.score', { score: num(score), pct: num(scorePct) }),
  ];

  if (summary.count === 0) lines.push(t('quickPlay.solo.recap.noWords'));
  else if (summary.count === 1) lines.push(t('quickPlay.solo.recap.wordsOne', { longest: num(summary.longest) }));
  else lines.push(t('quickPlay.solo.recap.words', { count: num(summary.count), longest: num(summary.longest) }));

  if (summary.long > 0) lines.push(t('quickPlay.solo.recap.longWords', { count: num(summary.long) }));

  if (mode === 'word-hunt' && typeof targetWordFound === 'boolean') {
    lines.push(t(targetWordFound ? 'quickPlay.solo.recap.targetFound' : 'quickPlay.solo.recap.targetMissed'));
  }

  if (dayStreak > 1) lines.push(t('quickPlay.solo.recap.streak', { days: num(dayStreak) }));

  lines.push(t('quickPlay.solo.recap.cta'));
  return stripEmoji(lines.join('\n'));
}
