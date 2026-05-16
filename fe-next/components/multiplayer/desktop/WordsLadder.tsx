import { memo, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface LadderWord {
  word: string;
  score: number;
  ts: number;
  userId: string;
  stolenFrom?: string;
  inputMethod?: 'kb' | 'drag';
}

interface WordsLadderProps {
  words: LadderWord[];
  meId?: string;
}

/**
 * Live-updating found-words ladder for the desktop shell's right rail.
 * - Newest first (sorted by ts desc)
 * - Mine vs opponent tinted (own words full opacity, opponent dimmed)
 * - Stolen words shown with strike-through
 * - Top entry pulses (`animate-ladder-bump`) on insert; reduced-motion no-ops it
 * - aria-live="polite" so screen readers announce new words
 *
 * Memoized: parent re-renders on every timer tick (1Hz). Without memo + sort
 * memoization the entire ladder re-sorted + re-rendered every second even with
 * no new word, causing visible jank on word accept.
 */
function WordsLadderImpl({ words, meId }: WordsLadderProps) {
  const { t } = useLanguage();
  const sorted = useMemo(() => [...words].sort((a, b) => b.ts - a.ts), [words]);

  if (sorted.length === 0) {
    return (
      <div data-testid="ladder-empty" className="p-4 text-center opacity-50 text-sm">
        {t('mp.ladder.empty')}
      </div>
    );
  }

  return (
    <ul
      className="flex flex-col gap-1 p-2 overflow-y-auto"
      data-component="words-ladder"
      aria-live="polite"
    >
      {sorted.map((w, idx) => {
        const mine = !!meId && w.userId === meId;
        const stolen = !!w.stolenFrom;
        return (
          <li
            key={`${w.word}-${w.ts}`}
            data-testid={`ladder-row-${w.word}`}
            data-row="true"
            data-mine={String(mine)}
            data-stolen={String(stolen)}
            data-bump={idx === 0 ? 'true' : 'false'}
            className={`flex justify-between items-center text-sm px-2 py-1 rounded ${mine ? 'text-foreground' : 'text-foreground/60'} ${stolen ? 'line-through decoration-red-500' : ''} ${idx === 0 ? 'animate-ladder-bump font-bold' : ''}`}
          >
            <span className="font-mono">{w.word}</span>
            {w.inputMethod === 'kb' && (
              <span
                data-testid={`ladder-kb-chip-${w.word}`}
                className="text-xs px-1 rounded bg-neo-cyan text-foreground"
                aria-label="keyboard bonus"
                title="+10% keyboard bonus"
              >
                ⌨️ +10%
              </span>
            )}
            <span className="tabular-nums">{w.score}</span>
          </li>
        );
      })}
    </ul>
  );
}

export const WordsLadder = memo(WordsLadderImpl);
