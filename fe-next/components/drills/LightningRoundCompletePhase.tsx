'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Trophy, Target, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import DrillCompleteActions from './DrillCompleteActions';

interface LightningRoundCompletePhaseProps {
  score: number;
  wordsFoundCount: number;
  wordsPerMinute: number;
  onPlayAgain: () => void;
  onExit?: () => void;
}

/** Extracted to keep LightningRound under the 500-line cap (audit P2). */
export default function LightningRoundCompletePhase({
  score,
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
      <AdaptiveMotion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, delay: 0.2 }}
      >
        <Trophy className="w-14 h-14 sm:w-20 sm:h-20 mx-auto text-neo-lime" />
      </AdaptiveMotion.div>
      <AdaptiveMotion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-black text-neo-white"
      >
        {t('brain.drills.complete')}
      </AdaptiveMotion.h2>
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-4 rounded-neo border-3 border-neo-black space-y-3 bg-neo-navy-light"
      >
        <AdaptiveMotion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, type: 'spring' }}
          className="text-3xl font-black text-neo-lime"
        >
          <AdaptiveMotion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {score}
          </AdaptiveMotion.span>{' '}
          {t('brain.drills.points')}
        </AdaptiveMotion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <AdaptiveMotion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="p-3 rounded-neo border-2 border-neo-black bg-neo-navy-elevated"
          >
            <Target className="w-6 h-6 mx-auto text-neo-green mb-1" />
            <p className="text-2xl font-black text-neo-white">{wordsFoundCount}</p>
            <p className="text-xs text-neo-white">{t('brain.drills.wordsFound')}</p>
          </AdaptiveMotion.div>
          <AdaptiveMotion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className="p-3 rounded-neo border-2 border-neo-black bg-neo-navy-elevated"
          >
            <Zap className="w-6 h-6 mx-auto text-neo-lime mb-1" />
            <p className="text-2xl font-black text-neo-cyan">{wordsPerMinute}</p>
            <p className="text-xs text-neo-white">{t('brain.drills.wpm')}</p>
          </AdaptiveMotion.div>
        </div>
      </AdaptiveMotion.div>
      <DrillCompleteActions
        currentDrillId="lightning-round"
        onPlayAgain={onPlayAgain}
        onExit={onExit}
      />
    </AdaptiveMotion.div>
  );
}
