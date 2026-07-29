'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Target, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import DrillCompleteActions from './DrillCompleteActions';
import DrillEarningsBreakdown from '@/components/brain/DrillEarningsBreakdown';
import type { ForgivingScoreResult } from '@/shared/utils/drillScoring';

interface LightningRoundCompletePhaseProps {
  level: number;
  forgivingScore: ForgivingScoreResult;
  wordsFoundCount: number;
  wordsPerMinute: number;
  onPlayAgain: () => void;
  onExit?: () => void;
}

/** Extracted to keep LightningRound under the 500-line cap (audit P2). */
export default function LightningRoundCompletePhase({
  level,
  forgivingScore,
  wordsFoundCount,
  wordsPerMinute,
  onPlayAgain,
  onExit,
}: LightningRoundCompletePhaseProps) {
  const { t } = useLanguage();

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <DrillEarningsBreakdown
        drillId="lightning-round"
        badge={forgivingScore.badge}
        displayScore={forgivingScore.displayScore}
        participation={forgivingScore.participation}
        performance={forgivingScore.performance}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xs mx-auto">
        <AdaptiveMotion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="p-3 rounded-neo border-2 border-neo-black bg-neo-navy-elevated"
        >
          <Target className="w-6 h-6 mx-auto text-neo-green mb-1" />
          <p className="text-2xl font-black text-neo-white">{wordsFoundCount}</p>
          <p className="text-xs text-neo-white">{t('brain.drills.wordsFound')}</p>
        </AdaptiveMotion.div>
        <AdaptiveMotion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="p-3 rounded-neo border-2 border-neo-black bg-neo-navy-elevated"
        >
          <Zap className="w-6 h-6 mx-auto text-neo-lime mb-1" />
          <p className="text-2xl font-black text-neo-cyan">{wordsPerMinute}</p>
          <p className="text-xs text-neo-white">{t('brain.drills.wpm')}</p>
        </AdaptiveMotion.div>
      </div>

      <DrillCompleteActions
        currentDrillId="lightning-round"
        onPlayAgain={onPlayAgain}
        onExit={onExit}
      />
    </AdaptiveMotion.div>
  );
}
