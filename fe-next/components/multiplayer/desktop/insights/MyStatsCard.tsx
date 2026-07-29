import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemedPanel } from '../ThemedPanel';
import type { MpDesktopMode } from '../types';
import type { LadderWord } from '../WordsLadder';

interface MyStatsCardProps {
  foundWords: LadderWord[];
  meId?: string;
  mode: MpDesktopMode;
  startTimeMs?: number;
}

interface DerivedStats {
  bestWord: { word: string; score: number } | null;
  wordsPerMin: number;
  kbBonusUses: number;
  totalScore: number;
}

export function deriveStats(words: LadderWord[], startMs?: number): DerivedStats {
  if (!words.length) {
    return { bestWord: null, wordsPerMin: 0, kbBonusUses: 0, totalScore: 0 };
  }
  let best: LadderWord | null = null;
  let kb = 0;
  let total = 0;
  for (const w of words) {
    total += w.score;
    if (w.inputMethod === 'kb') kb++;
    if (!best || w.score > best.score || (w.score === best.score && w.word.length > best.word.length)) {
      best = w;
    }
  }
  const earliest = words.reduce((acc, w) => Math.min(acc, w.ts || acc), words[0]?.ts ?? 0);
  const startBase = startMs && startMs > 0 ? startMs : earliest > 0 ? earliest : Date.now();
  const elapsedMin = Math.max(0.5, (Date.now() - startBase) / 60000);
  const wpm = Math.max(0, Math.round(words.length / elapsedMin));
  return {
    bestWord: best ? { word: best.word, score: best.score } : null,
    wordsPerMin: wpm,
    kbBonusUses: kb,
    totalScore: total,
  };
}

export function MyStatsCard({ foundWords, meId, mode, startTimeMs }: MyStatsCardProps) {
  const { t } = useLanguage();
  const myWords = useMemo(
    () => (meId ? foundWords.filter(w => w.userId === meId) : foundWords),
    [foundWords, meId],
  );
  const stats = useMemo(() => deriveStats(myWords, startTimeMs), [myWords, startTimeMs]);

  return (
    <ThemedPanel
      mode={mode}
      variant="rail"
      header={t('mp.insights.myStatsHeader')}
      testId="my-stats-card"
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat
          label={t('mp.insights.bestWord')}
          value={stats.bestWord ? stats.bestWord.word : '—'}
          sub={stats.bestWord ? `+${stats.bestWord.score}` : ''}
          testId="best-word"
        />
        <Stat
          label={t('mp.insights.wordsPerMin')}
          value={String(stats.wordsPerMin)}
          sub="wpm"
          testId="wpm"
        />
        <Stat
          label={t('mp.insights.kbBonusUses')}
          value={String(stats.kbBonusUses)}
          sub="⌨️"
          testId="kb-uses"
        />
      </div>
    </ThemedPanel>
  );
}

function Stat({ label, value, sub, testId }: { label: string; value: string; sub: string; testId: string }) {
  return (
    <div className="flex flex-col items-center" data-testid={testId}>
      <span className="text-[10px] uppercase opacity-60 truncate max-w-full">{label}</span>
      <span className="text-sm font-bold tabular-nums truncate max-w-full">{value}</span>
      <span className="text-[10px] opacity-50 tabular-nums">{sub}</span>
    </div>
  );
}
