'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { TrendingUp, Target, ArrowUp, Swords, Zap, LucideIcon } from 'lucide-react';
import { getAllSessionFacts, type SessionFact } from '../../utils/sessionStatsCalculator';
import { cn } from '../../lib/utils';

interface StandingWithScores {
  username: string;
  totalScore: number;
  roundScores?: number[];
}

interface SessionStatsCardProps {
  standings: StandingWithScores[];
  currentRound: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  Target,
  ArrowUp,
  Swords,
  Zap,
};

const TYPE_STYLES: Record<SessionFact['type'], { bg: string; border: string; iconBg: string }> = {
  improvement: {
    bg: 'bg-neo-lime/20',
    border: 'border-neo-lime',
    iconBg: 'bg-neo-lime text-neo-black',
  },
  consistency: {
    bg: 'bg-neo-cyan/20',
    border: 'border-neo-cyan',
    iconBg: 'bg-neo-cyan text-neo-black',
  },
  comeback: {
    bg: 'bg-neo-orange/20',
    border: 'border-neo-orange',
    iconBg: 'bg-neo-orange text-neo-black',
  },
  rivalry: {
    bg: 'bg-neo-pink/20',
    border: 'border-neo-pink',
    iconBg: 'bg-neo-pink text-neo-black',
  },
  record: {
    bg: 'bg-neo-yellow/20',
    border: 'border-neo-yellow',
    iconBg: 'bg-neo-yellow text-neo-black',
  },
};

const SessionStatsCard: React.FC<SessionStatsCardProps> = ({
  standings,
  currentRound,
  t,
}) => {
  const facts = useMemo(() => getAllSessionFacts(standings), [standings]);

  // Need at least 2 rounds for meaningful stats
  if (currentRound < 2 || facts.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <h3 className="text-sm font-bold text-neo-white uppercase tracking-wider text-center">
        {t('results.sessionStats.title')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {facts.map((fact, index) => {
          const IconComponent = ICON_MAP[fact.icon] || Zap;
          const styles = TYPE_STYLES[fact.type];

          return (
            <m.div
              key={fact.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-neo border-3 shadow-hard-sm',
                styles.bg,
                styles.border
              )}
            >
              <div
                className={cn(
                  'shrink-0 w-9 h-9 rounded-neo flex items-center justify-center border-2 border-neo-black',
                  styles.iconBg
                )}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-neo-white truncate">
                  {fact.playerName}
                  {fact.playerName2 && (
                    <span className="font-bold text-neo-white">
                      {' '}
                      vs {fact.playerName2}
                    </span>
                  )}
                </p>
                <p className="text-xs text-neo-white">
                  {t(fact.translationKey, fact.translationParams)}
                </p>
              </div>
              <m.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 0.2, type: 'spring', stiffness: 400 }}
                className="shrink-0 text-lg font-black text-neo-white"
              >
                {fact.type === 'improvement' ? `+${fact.value}%` : fact.value}
              </m.span>
            </m.div>
          );
        })}
      </div>
    </div>
  );
};

export default SessionStatsCard;
