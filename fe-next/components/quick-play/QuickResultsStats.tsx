'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

/** Ms after the screen mounts; each card counts up after the one before it. */
export const STAT_DELAYS = { score: 200, words: 500 } as const;

interface QuickResultsStatsProps {
  score: number;
  wordsFound: number;
}

export function QuickResultsStats({ score, wordsFound }: QuickResultsStatsProps) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="quick-stats">
      <div
        className="flex flex-col items-center gap-0.5 rounded-2xl border-neo-thick border-black bg-neo-navy-elevated px-3 py-2 shadow-hard"
        data-testid="quick-stat-score"
        data-delay={STAT_DELAYS.score}
        data-value={score}
      >
        <span className="text-[10px] font-bold tracking-widest text-neo-white/60">
          {t('quickPlay.solo.statScore', 'SCORE')}
        </span>
        <AnimatedCounter value={score} delay={STAT_DELAYS.score} size="lg" variant="gold" />
      </div>
      <div
        className="flex flex-col items-center gap-0.5 rounded-2xl border-neo-thick border-black bg-neo-navy-elevated px-3 py-2 shadow-hard"
        data-testid="quick-stat-words"
        data-delay={STAT_DELAYS.words}
        data-value={wordsFound}
      >
        <span className="text-[10px] font-bold tracking-widest text-neo-white/60">
          {t('quickPlay.solo.statWords', 'WORDS')}
        </span>
        <AnimatedCounter value={wordsFound} delay={STAT_DELAYS.words} size="lg" variant="default" />
      </div>
    </div>
  );
}
