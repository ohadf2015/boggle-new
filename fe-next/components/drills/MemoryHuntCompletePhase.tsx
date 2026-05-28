import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Trophy, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameEmojiShareCard } from '@/components/shared/GameEmojiShareCard';
import DrillCompleteActions from './DrillCompleteActions';

interface MemoryHuntCompletePhaseProps {
  isDarkMode: boolean;
  results: { score: number; wordsFound: number; totalWords: number; timeSpent: number };
  lives: number;
  t: (key: string) => string;
  onPlayAgain: () => void;
  onExit?: () => void;
}

export function MemoryHuntCompletePhase({
  isDarkMode, results, lives, t, onPlayAgain, onExit,
}: MemoryHuntCompletePhaseProps) {
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
        <Trophy className={cn(
          'w-14 h-14 sm:w-20 sm:h-20 mx-auto',
          results.wordsFound > 0 ? 'text-neo-lime' : 'text-gray-400'
        )} />
      </AdaptiveMotion.div>
      <AdaptiveMotion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn('text-2xl font-black', isDarkMode ? 'text-neo-white' : 'text-neo-black')}
      >
        {lives > 0 ? t('brain.drills.complete') : t('brain.drills.gameOver')}
      </AdaptiveMotion.h2>
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={cn('p-4 rounded-neo border-3 border-neo-black space-y-3', isDarkMode ? 'bg-neo-navy-light' : 'bg-white')}
      >
        <AdaptiveMotion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, type: 'spring' }}
          className="text-3xl font-black text-neo-purple"
        >
          <AdaptiveMotion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            {results.score}
          </AdaptiveMotion.span> {t('brain.drills.points')}
        </AdaptiveMotion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <AdaptiveMotion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className={cn('p-3 rounded-neo border-2 border-neo-black', isDarkMode ? 'bg-neo-navy-elevated' : 'bg-neo-cream')}
          >
            <Target className="w-6 h-6 mx-auto text-neo-green mb-1" />
            <p className={cn('text-2xl font-black', isDarkMode ? 'text-neo-white' : 'text-neo-black')}>
              {results.wordsFound}/{results.totalWords}
            </p>
            <p className={cn('text-xs', isDarkMode ? 'text-neo-white' : 'text-neo-black/70')}>
              {t('brain.drills.wordsFound')}
            </p>
          </AdaptiveMotion.div>
          <AdaptiveMotion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className={cn('p-3 rounded-neo border-2 border-neo-black', isDarkMode ? 'bg-neo-navy-elevated' : 'bg-neo-cream')}
          >
            <Clock className="w-6 h-6 mx-auto text-neo-cyan mb-1" />
            <p className={cn('text-2xl font-black', isDarkMode ? 'text-neo-cyan' : 'text-neo-purple')}>
              {results.timeSpent}s
            </p>
            <p className={cn('text-xs', isDarkMode ? 'text-neo-white' : 'text-neo-black/70')}>
              {t('brain.drills.timeSpent')}
            </p>
          </AdaptiveMotion.div>
        </div>
      </AdaptiveMotion.div>
      {results.score > 0 && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <GameEmojiShareCard
            data={{
              mode: 'drill',
              drillType: t('brain.drills.memory-hunt.name'),
              score: results.score,
              wordsFound: results.wordsFound,
              totalWords: results.totalWords,
              timeSpent: results.timeSpent,
            }}
            t={t}
          />
        </AdaptiveMotion.div>
      )}
      <DrillCompleteActions
        currentDrillId="memory-hunt"
        onPlayAgain={onPlayAgain}
        onExit={onExit}
      />
    </AdaptiveMotion.div>
  );
}
