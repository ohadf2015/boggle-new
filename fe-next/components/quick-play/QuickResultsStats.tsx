'use client';

import { BookOpen, Target, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

import { ResultsStatCards, STAT_COUNT_MS, statTiming } from '@/components/results/stage/ResultsStatCards';

/** Ms after mount: each card lands, then counts, before the next one arrives. */
export const STAT_TIMELINE = {
  score: statTiming(0),
  perfect: statTiming(1),
  words: statTiming(2),
} as const;
export { STAT_COUNT_MS };

interface QuickResultsStatsProps {
  score: number;
  scorePct: number;
  wordsFound: number;
  animate: boolean;
  /** Mode accent for the % card, e.g. bg-neo-purple / text-neo-purple. */
  modeBand?: string;
  modeInk?: string;
}

export function QuickResultsStats({
  score,
  scorePct,
  wordsFound,
  animate,
  modeBand = 'bg-neo-purple',
  modeInk = 'text-neo-purple',
}: QuickResultsStatsProps) {
  const { t } = useLanguage();
  return (
    <ResultsStatCards
      testId="quick-stats"
      animate={animate}
      items={[
        {
          key: 'score',
          testId: 'quick-stat-score',
          label: t('quickPlay.solo.statScore', 'Score'),
          value: score,
          icon: <Zap className="h-5 w-5 fill-current" strokeWidth={2.5} />,
          tone: 'yellow',
        },
        {
          key: 'perfect',
          testId: 'quick-stat-perfect',
          valueTestId: 'quick-hero-percentage',
          label: t('quickPlay.solo.ofPerfect'),
          value: scorePct,
          suffix: '%',
          icon: <Target className="h-5 w-5" strokeWidth={2.75} />,
          band: modeBand,
          ink: modeInk,
        },
        {
          key: 'words',
          testId: 'quick-stat-words',
          label: t('quickPlay.solo.statWords', 'Words'),
          value: wordsFound,
          icon: <BookOpen className="h-5 w-5" strokeWidth={2.75} />,
          tone: 'cyan',
        },
      ]}
    />
  );
}
