'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Shuffle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import DrillCompleteActions from './DrillCompleteActions';
import DrillEarningsBreakdown from '@/components/brain/DrillEarningsBreakdown';
import { calculateForgivingDrillScore } from '@/shared/utils/drillScoring';

interface PatternSwitcherCompletePhaseProps {
  score: number;
  patternsCompleted: number;
  wordsFoundCount: number;
  lives: number;
  level?: number;
  maxLives?: number;
  onPlayAgain: () => void;
  onExit?: () => void;
}

/** Extracted to keep PatternSwitcher under the 500-line cap (audit P2). */
export default function PatternSwitcherCompletePhase({
  score,
  patternsCompleted,
  wordsFoundCount,
  lives,
  level = 1,
  maxLives = 3,
  onPlayAgain,
  onExit,
}: PatternSwitcherCompletePhaseProps) {
  const { t } = useLanguage();

  // Forgive the DISPLAY: the player always sees an earned number + colored badge.
  // The honest `score` keeps flowing to the backend untouched.
  const forgiving = calculateForgivingDrillScore({
    level,
    rawScore: score,
    wordsFound: wordsFoundCount,
    target: Math.max(wordsFoundCount, maxLives),
    setbacks: Math.max(0, maxLives - lives),
    maxSetbacks: maxLives,
  });

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <DrillEarningsBreakdown
        drillId="pattern-switcher"
        badge={forgiving.badge}
        displayScore={forgiving.displayScore}
        participation={forgiving.participation}
        performance={forgiving.performance}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xs mx-auto">
        <AdaptiveMotion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="p-3 rounded-neo border-2 border-neo-black bg-neo-navy-elevated"
        >
          <Shuffle className="w-6 h-6 mx-auto text-neo-cyan mb-1" />
          <p className="text-2xl font-black text-neo-white">{patternsCompleted}</p>
          <p className="text-xs text-neo-white">{t('brain.drills.patterns')}</p>
        </AdaptiveMotion.div>
        <AdaptiveMotion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="p-3 rounded-neo border-2 border-neo-black bg-neo-navy-elevated"
        >
          <Target className="w-6 h-6 mx-auto text-neo-green mb-1" />
          <p className="text-2xl font-black text-neo-white">{wordsFoundCount}</p>
          <p className="text-xs text-neo-white">{t('brain.drills.wordsFound')}</p>
        </AdaptiveMotion.div>
      </div>

      <DrillCompleteActions
        currentDrillId="pattern-switcher"
        onPlayAgain={onPlayAgain}
        onExit={onExit}
      />
    </AdaptiveMotion.div>
  );
}
