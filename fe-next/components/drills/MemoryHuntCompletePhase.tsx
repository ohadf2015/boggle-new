import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, delay: 0.2 }}
      >
        <Trophy className={cn(
          'w-20 h-20 mx-auto',
          results.wordsFound > 0 ? 'text-neo-lime' : 'text-gray-400'
        )} />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn('text-2xl font-black', isDarkMode ? 'text-neo-white' : 'text-neo-black')}
      >
        {lives > 0 ? t('brain.drills.complete') : t('brain.drills.gameOver')}
      </motion.h2>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={cn('p-4 rounded-neo border-3 border-neo-black space-y-3', isDarkMode ? 'bg-slate-800' : 'bg-white')}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, type: 'spring' }}
          className="text-3xl font-black text-neo-purple"
        >
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            {results.score}
          </motion.span> {t('brain.drills.points')}
        </motion.div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className={cn('p-3 rounded-neo border-2 border-neo-black', isDarkMode ? 'bg-slate-700' : 'bg-neo-cream')}
          >
            <Target className="w-6 h-6 mx-auto text-neo-green mb-1" />
            <p className={cn('text-2xl font-black', isDarkMode ? 'text-neo-white' : 'text-neo-black')}>
              {results.wordsFound}/{results.totalWords}
            </p>
            <p className={cn('text-xs', isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70')}>
              {t('brain.drills.wordsFound')}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className={cn('p-3 rounded-neo border-2 border-neo-black', isDarkMode ? 'bg-slate-700' : 'bg-neo-cream')}
          >
            <Clock className="w-6 h-6 mx-auto text-neo-cyan mb-1" />
            <p className={cn('text-2xl font-black', isDarkMode ? 'text-neo-cyan' : 'text-neo-purple')}>
              {results.timeSpent}s
            </p>
            <p className={cn('text-xs', isDarkMode ? 'text-neo-white/70' : 'text-neo-black/70')}>
              {t('brain.drills.timeSpent')}
            </p>
          </motion.div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex gap-3 justify-center"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard',
            'font-bold uppercase transition-all hover:translate-y-[-2px]',
            isDarkMode ? 'bg-slate-700 text-neo-white' : 'bg-white text-neo-black'
          )}
        >
          <RotateCcw className="w-5 h-5" />
          {t('brain.drills.playAgain')}
        </motion.button>
        {onExit && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onExit}
            className={cn(
              'px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard',
              'font-bold uppercase transition-all hover:translate-y-[-2px]',
              'bg-neo-purple text-neo-white'
            )}
          >
            {t('brain.drills.exit')}
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
