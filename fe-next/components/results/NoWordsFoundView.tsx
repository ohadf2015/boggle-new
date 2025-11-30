import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Sparkles, Target, RefreshCw, Brain } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface NoWordsFoundViewProps {
  isCurrentPlayer: boolean;
  playerName: string;
}

/**
 * Encouraging messages for players who didn't find any words
 * Returns a random message with emoji and encouraging text
 */
function getEncouragingMessage(isCurrentPlayer: boolean, t: (key: string) => string): {
  emoji: string;
  headline: string;
  message: string;
  tip: string;
} {
  if (!isCurrentPlayer) {
    // For other players, show a neutral message
    return {
      emoji: '🎯',
      headline: t('noWords.otherPlayer.headline') || 'Tough Round',
      message: t('noWords.otherPlayer.message') || 'The letters weren\'t kind this time.',
      tip: '',
    };
  }

  // Random encouraging messages for the current player
  const messages = [
    {
      emoji: '🌟',
      headline: t('noWords.encourage.rookie.headline') || 'First Time Jitters?',
      message: t('noWords.encourage.rookie.message') || 'Even the best word hunters start somewhere. The board was tricky!',
      tip: t('noWords.encourage.rookie.tip') || 'Tip: Start with 3-letter words and build from there.',
    },
    {
      emoji: '🎲',
      headline: t('noWords.encourage.unlucky.headline') || 'Tough Letters!',
      message: t('noWords.encourage.unlucky.message') || 'Sometimes the dice just don\'t roll your way. It happens to everyone!',
      tip: t('noWords.encourage.unlucky.tip') || 'Tip: Look for common patterns like -ING, -ED, -ER.',
    },
    {
      emoji: '🧠',
      headline: t('noWords.encourage.thinking.headline') || 'Strategic Silence',
      message: t('noWords.encourage.thinking.message') || 'Quality over quantity mindset... maybe too much quality this time!',
      tip: t('noWords.encourage.thinking.tip') || 'Tip: Submit words as you find them - no penalty for trying!',
    },
    {
      emoji: '🚀',
      headline: t('noWords.encourage.warmup.headline') || 'Warm-up Round',
      message: t('noWords.encourage.warmup.message') || 'Consider this a practice run. Your brain is just getting started!',
      tip: t('noWords.encourage.warmup.tip') || 'Tip: Scan the board quickly, then focus on high-value corners.',
    },
    {
      emoji: '💪',
      headline: t('noWords.encourage.comeback.headline') || 'Comeback Loading...',
      message: t('noWords.encourage.comeback.message') || 'The greatest players have off rounds. Next game is YOUR game!',
      tip: t('noWords.encourage.comeback.tip') || 'Tip: Try saying letters out loud to trigger word associations.',
    },
  ];

  // Pick a random message
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

/**
 * Neo-Brutalist view for players who didn't find any words
 * Shows an encouraging, friendly message with tips
 */
const NoWordsFoundView: React.FC<NoWordsFoundViewProps> = ({ isCurrentPlayer, playerName }) => {
  const { t } = useLanguage();

  // Memoize the message so it doesn't change on re-renders
  const encouragement = useMemo(() => {
    return getEncouragingMessage(isCurrentPlayer, t);
  }, [isCurrentPlayer, t]);

  if (!isCurrentPlayer) {
    // Simple view for other players
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 p-4 rounded-neo border-2 border-neo-black bg-slate-100 dark:bg-slate-700"
      >
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Target className="w-4 h-4" />
          <span className="text-sm font-bold">
            {t('noWords.noWordsThisRound') || 'No words this round'}
          </span>
        </div>
      </motion.div>
    );
  }

  // Full encouraging view for current player
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      className="mt-3"
    >
      {/* Main encouragement card */}
      <div
        className={cn(
          'p-5 rounded-neo-lg border-3 border-neo-black',
          'bg-gradient-to-br from-neo-cyan via-neo-cyan to-neo-lime',
          'shadow-hard-lg relative overflow-hidden'
        )}
      >
        {/* Decorative pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle, var(--neo-black) 1.5px, transparent 1.5px)`,
            backgroundSize: '12px 12px',
          }}
        />

        {/* Floating decorative icons */}
        <motion.div
          initial={{ opacity: 0, rotate: -20 }}
          animate={{ opacity: 0.15, rotate: 15 }}
          transition={{ delay: 0.3 }}
          className="absolute top-2 right-2"
        >
          <Gamepad2 className="w-16 h-16 text-neo-black" />
        </motion.div>

        <div className="relative z-10">
          {/* Header with emoji */}
          <div className="flex items-center gap-3 mb-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              className="w-12 h-12 rounded-neo bg-neo-yellow border-3 border-neo-black shadow-hard flex items-center justify-center"
            >
              <span className="text-2xl">{encouragement.emoji}</span>
            </motion.div>
            <div>
              <h3 className="text-lg font-black text-neo-black uppercase tracking-wide">
                {encouragement.headline}
              </h3>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-neo-black/60" />
                <span className="text-xs font-bold text-neo-black/60 uppercase">
                  {t('noWords.keepGoing') || 'Keep going!'}
                </span>
              </div>
            </div>
          </div>

          {/* Encouraging message */}
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-bold text-neo-black/90 leading-relaxed mb-4"
          >
            {encouragement.message}
          </motion.p>

          {/* Tip box */}
          {encouragement.tip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-neo-cream border-2 border-neo-black rounded-neo p-3 shadow-hard-sm"
            >
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-md bg-neo-purple border-2 border-neo-black flex items-center justify-center flex-shrink-0">
                  <Brain className="w-3.5 h-3.5 text-neo-cream" />
                </div>
                <p className="text-xs font-bold text-neo-black leading-relaxed">
                  {encouragement.tip}
                </p>
              </div>
            </motion.div>
          )}

          {/* "Next round" motivator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 flex items-center justify-center gap-2 text-neo-black/70"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wide">
              {t('noWords.nextRoundIsYours') || 'Next round is yours!'}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Fun fact / motivation strip */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-2 p-2 rounded-neo border-2 border-neo-black bg-neo-yellow shadow-hard-sm"
      >
        <p className="text-[10px] font-black text-neo-black text-center uppercase tracking-wide">
          💡 {t('noWords.funFact') || 'Fun fact: The average player misses 70% of possible words!'}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default NoWordsFoundView;
