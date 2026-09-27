'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Flame, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import DrillCompleteActions from './DrillCompleteActions';
import DrillEarningsBreakdown from '@/components/brain/DrillEarningsBreakdown';
import { calculateForgivingDrillScore } from '@/shared/utils/drillScoring';

interface ComboMasterCompletePhaseProps {
  score: number;
  maxCombo: number;
  wordsFoundCount: number;
  targetCombo: number;
  comboBreaks: number;
  level?: number;
  onPlayAgain: () => void;
  onExit?: () => void;
}

/** Extracted to keep ComboMaster under the 500-line cap (audit P2). */
export default function ComboMasterCompletePhase({
  score,
  maxCombo,
  wordsFoundCount,
  targetCombo,
  comboBreaks,
  level = 1,
  onPlayAgain,
  onExit,
}: ComboMasterCompletePhaseProps) {
  const { t } = useLanguage();
  const MAX_COMBO_BREAKS = 3;

  // Forgive the DISPLAY: the player always sees an earned number + colored
  // badge. The honest `score` keeps flowing to the backend untouched.
  const forgiving = calculateForgivingDrillScore({
    level,
    rawScore: score,
    wordsFound: maxCombo,
    target: targetCombo,
    setbacks: comboBreaks,
    maxSetbacks: MAX_COMBO_BREAKS,
  });

  return (
    <AdaptiveMotion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="text-center space-y-6 animate-in fade-in-0 duration-300"
    >
      <DrillEarningsBreakdown
        drillId="combo-master"
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
          className={cn('p-3 rounded-neo border-2 border-neo-black', 'bg-neo-navy-elevated')}
        >
          <Flame className="w-6 h-6 mx-auto text-neo-orange mb-1" />
          <p className="text-2xl font-black text-neo-cyan">x{maxCombo}</p>
          <p className="text-xs text-neo-white">{t('brain.drills.maxCombo')}</p>
        </AdaptiveMotion.div>
        <AdaptiveMotion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className={cn('p-3 rounded-neo border-2 border-neo-black', 'bg-neo-navy-elevated')}
        >
          <Target className="w-6 h-6 mx-auto text-neo-green mb-1" />
          <p className="text-2xl font-black text-neo-white">{wordsFoundCount}</p>
          <p className="text-xs text-neo-white">{t('brain.drills.wordsFound')}</p>
        </AdaptiveMotion.div>
      </div>

      <DrillCompleteActions
        currentDrillId="combo-master"
        onPlayAgain={onPlayAgain}
        onExit={onExit}
      />
    </AdaptiveMotion.div>
  );
}
