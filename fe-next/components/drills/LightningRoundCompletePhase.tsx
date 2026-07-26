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
  topMissedWords?: { word: string; pts: number }[];
  onPlayAgain: () => void;
  onExit?: () => void;
}

/** Extracted to keep LightningRound under the 500-line cap (audit P2). */
export default function LightningRoundCompletePhase({
  level: _level,
  forgivingScore,
  wordsFoundCount,
  wordsPerMinute,
  topMissedWords,
  onPlayAgain,
  onExit,
}: LightningRoundCompletePhaseProps) {
  const { t } = useLanguage();

  return (
    <AdaptiveMotion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="text-center space-y-6 animate-in fade-in-0 duration-300"
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

      {topMissedWords && topMissedWords.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-neo-white/50 text-center">
            {t('brain.drills.missedWords')}
          </p>
          <div className="space-y-2">
            {topMissedWords.map((item, wordIdx) => {
              const wordDelay = 1.2 + wordIdx * 1.5;
              return (
                <div key={item.word} className="flex items-center justify-center gap-1">
                  {item.word.split('').map((letter, letterIdx) => (
                    <AdaptiveMotion.span
                      key={letterIdx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: wordDelay + letterIdx * 0.08 }}
                      className="w-8 h-8 flex items-center justify-center rounded-sm border-2 border-neo-purple/50 bg-neo-navy text-lg font-black text-neo-purple"
                    >
                      {letter}
                    </AdaptiveMotion.span>
                  ))}
                  <AdaptiveMotion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: wordDelay + item.word.length * 0.08 + 0.15 }}
                    className="ml-1 px-1.5 py-0.5 rounded-sm border border-neo-yellow bg-neo-yellow/10 text-neo-yellow text-xs font-bold tabular-nums"
                  >
                    +{item.pts}
                  </AdaptiveMotion.span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <DrillCompleteActions
        currentDrillId="lightning-round"
        onPlayAgain={onPlayAgain}
        onExit={onExit}
      />
    </AdaptiveMotion.div>
  );
}
