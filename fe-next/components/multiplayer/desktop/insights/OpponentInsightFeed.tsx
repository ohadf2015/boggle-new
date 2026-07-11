import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemedPanel } from '../ThemedPanel';
import type { MpDesktopMode } from '../types';

export interface OpponentWord {
  word?: string;
  wordLength: number;
  firstLetter: string;
  lastLetter: string;
  score: number;
  ts: number;
  byUsername: string;
}

interface OpponentInsightFeedProps {
  opponentWords: OpponentWord[];
  mode: MpDesktopMode;
  maxItems?: number;
}

export function maskWord(w: { word?: string; wordLength: number; firstLetter: string; lastLetter: string }): string {
  if (w.word && w.word.length === w.wordLength) return w.word;
  const middle = Math.max(0, w.wordLength - 2);
  return `${w.firstLetter}${'·'.repeat(middle)}${w.lastLetter}`;
}

export function OpponentInsightFeed({ opponentWords, mode, maxItems = 3 }: OpponentInsightFeedProps) {
  const { t } = useLanguage();
  const recent = useMemo(() => {
    return [...opponentWords]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, maxItems);
  }, [opponentWords, maxItems]);

  if (recent.length === 0) {
    return (
      <ThemedPanel
        mode={mode}
        variant="flat"
        header={t('mp.insights.opponentInsightHeader')}
        testId="opponent-insight-feed"
      >
        <div className="text-xs opacity-70 text-center py-2" data-testid="opponent-feed-empty">
          {t('mp.insights.opponentInsightEmpty')}
        </div>
      </ThemedPanel>
    );
  }

  return (
    <ThemedPanel
      mode={mode}
      variant="flat"
      header={t('mp.insights.opponentInsightHeader')}
      testId="opponent-insight-feed"
    >
      <ul className="flex flex-col gap-1" aria-live="polite">
        {recent.map((w, idx) => {
          const display = maskWord(w);
          return (
            <li
              key={`${w.byUsername}-${w.ts}`}
              data-testid={`opponent-row-${display}`}
              data-fresh={idx === 0 ? 'true' : 'false'}
              className={`flex items-center justify-between text-xs px-2 py-1 rounded bg-foreground/5 ${idx === 0 ? 'animate-ladder-bump font-bold' : ''}`}
            >
              <span className="font-mono truncate">⚡ {display}</span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="opacity-70 truncate max-w-[80px]">{w.byUsername}</span>
                <span className="tabular-nums font-bold">+{w.score}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </ThemedPanel>
  );
}
