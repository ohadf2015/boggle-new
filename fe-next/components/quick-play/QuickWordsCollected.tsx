'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { QuickWordsDetailDialog } from './QuickWordsDetailDialog';

export interface CollectedWord {
  word: string;
  score: number;
  /** First time this player has ever found it. */
  isNew: boolean;
}

interface QuickWordsCollectedProps {
  words: CollectedWord[];
  /** Distinct words this player has ever collected, after this round. */
  collectionTotal: number;
}

/** Rows of chips shown before the list collapses behind "show all". */
const PREVIEW = 12;

/**
 * The words you just found — and which of them you had never found before.
 *
 * Quick Play used to end with a percentage and nothing else: the eighteen words
 * you actually typed vanished at the buzzer. The best word of a round is the
 * thing players want to see, and "new to your collection" turns a one-off round
 * into something that accumulates.
 */
export function QuickWordsCollected({ words, collectionTotal }: QuickWordsCollectedProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  if (words.length === 0) return null;

  const sorted = [...words].sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
  const shown = expanded ? sorted : sorted.slice(0, PREVIEW);
  const newCount = words.filter((w) => w.isNew).length;
  const best = sorted[0];

  return (
    <div
      className="rounded-2xl border-neo-thick border-black bg-neo-navy-elevated p-3 shadow-hard"
      data-testid="quick-words-collected"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-neo-display text-[10px] uppercase tracking-[0.18em] text-neo-white/55">
          {t('quickPlay.solo.wordsCollected', '{count} words', { count: String(words.length) })}
        </span>
        <span className="truncate text-[11px] text-neo-white/55">
          {newCount > 0 && (
            <b className="mr-2 font-neo-display text-neo-lime" data-testid="quick-words-new-count">
              {t('quickPlay.solo.wordsNew', '{count} new', { count: String(newCount) })}
            </b>
          )}
          {t('quickPlay.solo.wordsTotal', '{count} collected', { count: String(collectionTotal) })}
        </span>
      </div>

      <div className="mb-2">
        <QuickWordsDetailDialog words={words} />
      </div>

      <div className="mb-2 flex items-baseline gap-2 rounded-lg border-2 border-black bg-neo-abyss/60 px-2.5 py-1.5">
        <span className="font-neo-display text-[10px] uppercase tracking-widest text-neo-white/45">
          {t('quickPlay.solo.bestWord', 'Best')}
        </span>
        <b className="font-neo-display tracking-wide text-neo-yellow" data-testid="quick-best-word">
          {best.word.toUpperCase()}
        </b>
        <span className="ml-auto font-neo-display text-xs tabular-nums text-neo-white/60">+{best.score}</span>
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {shown.map((w) => (
          <li
            key={w.word}
            data-testid={w.isNew ? 'quick-word-chip-new' : 'quick-word-chip'}
            className={`rounded-lg border-2 px-2 py-0.5 font-neo-display text-xs tracking-wide ${
              w.isNew
                ? 'border-neo-lime bg-neo-lime/15 text-neo-lime'
                : 'border-black bg-neo-abyss/60 text-neo-cream/80'
            }`}
          >
            {w.isNew && <span aria-hidden="true">★ </span>}
            {w.word.toUpperCase()}
          </li>
        ))}
      </ul>

      {sorted.length > PREVIEW && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          data-testid="quick-words-expand"
          className="mt-2 h-[36px] w-full rounded-lg text-xs font-bold tracking-wide text-neo-cyan"
        >
          {t('quickPlay.solo.wordsShowAll', 'Show all {count}', { count: String(sorted.length) })}
        </button>
      )}
    </div>
  );
}
