import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameEmojiShareCard } from '@/components/shared/GameEmojiShareCard';
import DrillCompleteActions from './DrillCompleteActions';
import DrillEarningsBreakdown from '@/components/brain/DrillEarningsBreakdown';
import { MemoryInsightsCard } from '@/components/brain/MemoryInsightsCard';
import { calculateForgivingDrillScore } from '@/shared/utils/drillScoring';

interface MemoryHuntCompletePhaseProps {
  isDarkMode: boolean;
  results: { score: number; wordsFound: number; totalWords: number; timeSpent: number };
  lives: number;
  /** Drill level (for the forgiving-score floor). */
  level?: number;
  /** Lives the player started with (denominator for the setback ratio). */
  maxLives?: number;
  t: (key: string) => string;
  onPlayAgain: () => void;
  onExit?: () => void;
}

export function MemoryHuntCompletePhase({
  isDarkMode, results, lives, level = 1, maxLives = 3, t, onPlayAgain, onExit,
}: MemoryHuntCompletePhaseProps) {
  // Forgive the DISPLAY: the player always sees an earned number + colored
  // badge. The honest `results.score` keeps flowing to the backend untouched.
  const forgiving = calculateForgivingDrillScore({
    level,
    rawScore: results.score,
    wordsFound: results.wordsFound,
    target: results.totalWords || 1,
    setbacks: Math.max(0, maxLives - lives),
    maxSetbacks: maxLives,
  });

  return (
    <AdaptiveMotion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="text-center space-y-6 animate-in fade-in-0 duration-300"
    >
      <DrillEarningsBreakdown
        drillId="memory-hunt"
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
          transition={{ delay: 0.6 }}
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

      {/* Real week-over-week memory progress (signed-in players only). */}
      <MemoryInsightsCard t={t} />

      {results.wordsFound > 0 && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GameEmojiShareCard
            data={{
              mode: 'drill',
              drillType: t('brain.drills.memory-hunt.name'),
              score: forgiving.displayScore,
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
