'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Gem, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import DrillCompleteActions from './DrillCompleteActions';
import DrillEarningsBreakdown from '@/components/brain/DrillEarningsBreakdown';
import { calculateForgivingDrillScore } from '@/shared/utils/drillScoring';

interface RareGemsCompletePhaseProps {
  score: number;
  rareWordsFound: number;
  wordsFoundCount: number;
  targetRare: number;
  level?: number;
  onPlayAgain: () => void;
  onExit?: () => void;
}

/**
 * RareGems "complete" phase — extracted from RareGems.tsx to keep parent
 * file under the 500-line cap (audit P2). Pure presentational; receives
 * final stats and play-again/exit handlers.
 *
 * Uses forgiving-score calculation to show a warm, always-earned badge
 * alongside honest stats (rare words + total words found).
 */
export default function RareGemsCompletePhase({
  score,
  rareWordsFound,
  wordsFoundCount,
  targetRare,
  level = 1,
  onPlayAgain,
  onExit,
}: RareGemsCompletePhaseProps) {
  const { t } = useLanguage();

  // Forgive the DISPLAY: the player always sees an earned number + colored
  // badge. The honest `score` keeps flowing to the backend untouched.
  const forgiving = calculateForgivingDrillScore({
    level,
    rawScore: score,
    wordsFound: rareWordsFound,
    target: targetRare,
    setbacks: 0,
    maxSetbacks: 1,
  });

  const reachedTarget = rareWordsFound >= targetRare;

  return (
    <AdaptiveMotion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="text-center space-y-6 animate-in fade-in-0 duration-300"
    >
      <DrillEarningsBreakdown
        drillId="rare-gems"
        badge={forgiving.badge}
        displayScore={forgiving.displayScore}
        participation={forgiving.participation}
        performance={forgiving.performance}
      />

      <AdaptiveMotion.h3
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg font-bold text-neo-white"
      >
        {reachedTarget ? t('brain.drills.pouchFull') : t('brain.drills.timeUpHaul')}
      </AdaptiveMotion.h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xs mx-auto">
        <AdaptiveMotion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="p-3 rounded-neo border-2 border-neo-black bg-neo-navy-elevated"
        >
          <Gem className="w-6 h-6 mx-auto text-neo-purple mb-1" />
          <p className="text-2xl font-black text-neo-white">{rareWordsFound}</p>
          <p className="text-xs text-neo-white">{t('brain.drills.rareWords')}</p>
        </AdaptiveMotion.div>
        <AdaptiveMotion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="p-3 rounded-neo border-2 border-neo-black bg-neo-navy-elevated"
        >
          <Target className="w-6 h-6 mx-auto text-neo-cozy mb-1" />
          <p className="text-2xl font-black text-neo-white">{wordsFoundCount}</p>
          <p className="text-xs text-neo-white">{t('brain.drills.wordsFound')}</p>
        </AdaptiveMotion.div>
      </div>

      <DrillCompleteActions
        currentDrillId="rare-gems"
        onPlayAgain={onPlayAgain}
        onExit={onExit}
      />
    </AdaptiveMotion.div>
  );
}
