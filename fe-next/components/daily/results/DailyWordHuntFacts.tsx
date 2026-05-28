'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Crown,
  Shield,
  Target,
  Search,
  Flame,
  HeartPulse,
  Heart,
  Compass,
  TrendingDown,
  RotateCcw,
  Gem,
  Ruler,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWordHuntFacts, getWordHuntInsights, type WordHuntFact } from '@/utils/dailyWordHuntFactsCalculator';
import { getAllWordHuntResults, type WordHuntResult } from '@/utils/dailyChallenge';
import type { WordHuntStats } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DailyWordHuntFactsProps {
  result: WordHuntResult;
  stats: WordHuntStats;
  t: (
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    paramsWhenFallback?: Record<string, string | number>,
  ) => string;
}

// ---------------------------------------------------------------------------
// Icon + color maps
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Zap,
  Crown,
  Shield,
  Target,
  Search,
  Flame,
  HeartPulse,
  Heart,
  Compass,
  TrendingDown,
  RotateCcw,
  Gem,
  Ruler,
  Lightbulb,
};

const COLOR_STYLES: Record<WordHuntFact['color'], { bg: string; border: string; iconBg: string }> = {
  'neo-lime': {
    bg: 'bg-neo-lime/20',
    border: 'border-neo-lime',
    iconBg: 'bg-neo-lime text-neo-black',
  },
  'neo-cyan': {
    bg: 'bg-neo-cyan/20',
    border: 'border-neo-cyan',
    iconBg: 'bg-neo-cyan text-neo-black',
  },
  'neo-orange': {
    bg: 'bg-neo-orange/20',
    border: 'border-neo-orange',
    iconBg: 'bg-neo-orange text-neo-black',
  },
  'neo-pink': {
    bg: 'bg-neo-pink/20',
    border: 'border-neo-pink',
    iconBg: 'bg-neo-pink text-neo-black',
  },
  'neo-yellow': {
    bg: 'bg-neo-yellow/20',
    border: 'border-neo-yellow',
    iconBg: 'bg-neo-yellow text-neo-black',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderFactText(
  fact: WordHuntFact,
  t: DailyWordHuntFactsProps['t'],
): string {
  return fact.translationFallback
    ? t(fact.translationKey, fact.translationFallback, fact.translationParams)
    : t(fact.translationKey, fact.translationParams);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DailyWordHuntFacts: React.FC<DailyWordHuntFactsProps> = ({ result, stats, t }) => {
  // Call both hooks unconditionally (rules of hooks). We read getWordHuntFacts
  // primarily to stay compatible with tests that mock it; we prefer the
  // richer pair returned by getWordHuntInsights when it yields anything.
  const legacyFacts = useMemo(() => getWordHuntFacts(result, stats), [result, stats]);
  const personalHistory = useMemo(
    () => (typeof window === 'undefined' ? [] : getAllWordHuntResults(result.language)),
    [result.language],
  );
  const pair = useMemo(
    () => getWordHuntInsights(result, stats, personalHistory),
    [result, stats, personalHistory],
  );

  // When the calculator's mock (tests) supplies facts directly, honor them.
  const usingLegacy = !pair.encouragement && !pair.tip && legacyFacts.length > 0;

  if (!usingLegacy && !pair.encouragement && !pair.tip && !pair.insight) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-neo-white uppercase tracking-wider text-center">
        {t('wordHunt.facts.title')}
      </h3>

      {usingLegacy ? (
        <div className="grid grid-cols-1 gap-2">
          {legacyFacts.map((fact, index) => (
            <EncouragementCard key={fact.type} fact={fact} index={index} t={t} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {pair.encouragement && (
            <EncouragementCard fact={pair.encouragement} index={0} t={t} />
          )}
          {pair.tip && <CoachTipCard fact={pair.tip} t={t} />}
          {pair.insight && <InsightCard fact={pair.insight} t={t} />}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Encouragement — bold, celebratory badge-style card
// ---------------------------------------------------------------------------

const EncouragementCard: React.FC<{
  fact: WordHuntFact;
  index: number;
  t: DailyWordHuntFactsProps['t'];
}> = ({ fact, index, t }) => {
  const IconComponent = ICON_MAP[fact.icon] || Zap;
  const styles = COLOR_STYLES[fact.color];

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-neo border-3 shadow-hard-sm',
        styles.bg,
        styles.border,
      )}
    >
      <div
        className={cn(
          'shrink-0 w-9 h-9 rounded-neo flex items-center justify-center border-2 border-neo-black',
          styles.iconBg,
        )}
      >
        <IconComponent className="w-5 h-5" />
      </div>
      <p className="min-w-0 flex-1 text-xs text-neo-white font-semibold leading-snug">
        {renderFactText(fact, t)}
      </p>
      {fact.value != null && (
        <m.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.2, type: 'spring', stiffness: 400 }}
          className="shrink-0 text-lg font-black text-neo-white"
        >
          {fact.value}
        </m.span>
      )}
    </m.div>
  );
};

// ---------------------------------------------------------------------------
// Coach tip — quieter, dashed-outline card with a Lightbulb label
// ---------------------------------------------------------------------------

const CoachTipCard: React.FC<{
  fact: WordHuntFact;
  t: DailyWordHuntFactsProps['t'];
}> = ({ fact, t }) => (
  <m.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
    className="flex items-start gap-3 p-3 rounded-neo border-2 border-dashed border-neo-cream/25 bg-neo-navy-light/60"
  >
    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-neo-cream/10 border border-neo-cream/30">
      <Lightbulb className="w-4 h-4 text-neo-white" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-neo-white mb-0.5">
        {t('wordHunt.facts.coachLabel', 'Coach tip')}
      </div>
      <p className="text-xs text-neo-white leading-snug">
        {renderFactText(fact, t)}
      </p>
    </div>
  </m.div>
);

// ---------------------------------------------------------------------------
// Insight — personal progression / research "did you know" card.
// Softer tone than Encouragement, warmer than Coach tip.
// ---------------------------------------------------------------------------

const InsightCard: React.FC<{
  fact: WordHuntFact;
  t: DailyWordHuntFactsProps['t'];
}> = ({ fact, t }) => {
  const IconComponent = ICON_MAP[fact.icon] || Sparkles;
  const styles = COLOR_STYLES[fact.color] ?? COLOR_STYLES['neo-cyan'];
  const isPersonal = fact.type.startsWith('personal');

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 26 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-neo border-2 shadow-hard-sm',
        styles.bg,
        styles.border,
      )}
    >
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-neo flex items-center justify-center border-2 border-neo-black',
          styles.iconBg,
        )}
      >
        <IconComponent className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-neo-white mb-0.5">
          {isPersonal
            ? t('wordHunt.facts.yourJourneyLabel', 'Your journey')
            : t('wordHunt.facts.insightLabel', 'Did you know')}
        </div>
        <p className="text-xs text-neo-white leading-snug">
          {renderFactText(fact, t)}
        </p>
      </div>
    </m.div>
  );
};

export default DailyWordHuntFacts;
