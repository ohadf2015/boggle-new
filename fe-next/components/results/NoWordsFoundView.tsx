import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { Gamepad2, Sparkles, Target, RefreshCw, Brain } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { Mascot } from '@/components/ui/Mascot';

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
      headline: t('noWords.otherPlayer.headline'),
      message: t('noWords.otherPlayer.message'),
      tip: '',
    };
  }

  // Random encouraging messages for the current player
  const messages = [
    {
      emoji: '🌟',
      headline: t('noWords.encourage.rookie.headline'),
      message: t('noWords.encourage.rookie.message'),
      tip: t('noWords.encourage.rookie.tip'),
    },
    {
      emoji: '🎲',
      headline: t('noWords.encourage.unlucky.headline'),
      message: t('noWords.encourage.unlucky.message'),
      tip: t('noWords.encourage.unlucky.tip'),
    },
    {
      emoji: '🧠',
      headline: t('noWords.encourage.thinking.headline'),
      message: t('noWords.encourage.thinking.message'),
      tip: t('noWords.encourage.thinking.tip'),
    },
    {
      emoji: '🚀',
      headline: t('noWords.encourage.warmup.headline'),
      message: t('noWords.encourage.warmup.message'),
      tip: t('noWords.encourage.warmup.tip'),
    },
    {
      emoji: '💪',
      headline: t('noWords.encourage.comeback.headline'),
      message: t('noWords.encourage.comeback.message'),
      tip: t('noWords.encourage.comeback.tip'),
    },
  ];

  // Pick a random message (array has 5 items, always valid)
  const randomIndex = Math.floor(Math.random() * messages.length);
  const selected = messages[randomIndex];
  // Fallback to first message if somehow undefined (shouldn't happen with fixed array)
  return selected ?? {
    emoji: '🌟',
    headline: 'Keep Going!',
    message: 'Every round is a new opportunity.',
    tip: 'Tip: Start with 3-letter words.',
  };
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
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 p-4 rounded-neo border-2 border-neo-black bg-slate-100 dark:bg-neo-navy-elevated"
      >
        {/* Crying mascot — Lexi commiserates with the player */}
        <div className="flex justify-center mb-3">
          <Mascot variant="crying" size="lg" animated clipBorder="none" />
        </div>
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Target className="w-4 h-4" />
          <span className="text-sm font-bold">
            {t('noWords.noWordsThisRound')}
          </span>
        </div>
      </m.div>
    );
  }

  // Full encouraging view for current player
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }}
      className="mt-3"
    >
      {/* Main encouragement card */}
      <div
        className={cn(
          'p-5 rounded-neo-lg border-3 border-neo-black',
          'bg-linear-to-br from-neo-cyan via-neo-cyan to-neo-lime',
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
        <m.div
          initial={{ opacity: 0, rotate: -20 }}
          animate={{ opacity: 0.15, rotate: 15 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.3 }}
          className="absolute top-2 right-2"
        >
          <Gamepad2 className="w-16 h-16 text-neo-black" />
        </m.div>

        <div className="relative z-10">
          {/* Crying mascot — Lexi commiserates with the player */}
          <div className="flex justify-center mb-3">
            <Mascot variant="crying" size="lg" animated clipBorder="none" />
          </div>

          {/* Header with emoji */}
          <div className="flex items-center gap-3 mb-3">
            <m.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.2 }}
              className="w-12 h-12 rounded-neo bg-neo-lime border-3 border-neo-black shadow-hard flex items-center justify-center"
            >
              <span className="text-2xl">{encouragement.emoji}</span>
            </m.div>
            <div>
              <h3 className="text-lg font-black text-neo-black uppercase tracking-wide">
                {encouragement.headline}
              </h3>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-neo-black/75" />
                <span className="text-xs font-bold text-neo-black/75 uppercase">
                  {t('noWords.keepGoing')}
                </span>
              </div>
            </div>
          </div>

          {/* Encouraging message */}
          <m.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.3 }}
            className="text-sm font-bold text-neo-black/90 leading-relaxed mb-4"
          >
            {encouragement.message}
          </m.p>

          {/* Tip box */}
          {encouragement.tip && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.4 }}
              className="bg-neo-cream border-2 border-neo-black rounded-neo p-3 shadow-hard-sm"
            >
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-md bg-neo-purple text-white border-2 border-neo-black flex items-center justify-center shrink-0">
                  <Brain className="w-3.5 h-3.5 text-neo-white" />
                </div>
                <p className="text-xs font-bold text-neo-black leading-relaxed">
                  {encouragement.tip}
                </p>
              </div>
            </m.div>
          )}

          {/* "Next round" motivator */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.5 }}
            className="mt-4 flex items-center justify-center gap-2 text-neo-black/70"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wide">
              {t('noWords.nextRoundIsYours')}
            </span>
          </m.div>
        </div>
      </div>

      {/* Fun fact / motivation strip */}
      <m.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.6 }}
        className="mt-2 p-2 rounded-neo border-2 border-neo-black bg-neo-lime shadow-hard-sm"
      >
        <p className="text-[10px] font-black text-neo-black text-center uppercase tracking-wide">
          💡 {t('noWords.funFact')}
        </p>
      </m.div>
    </m.div>
  );
};

export default NoWordsFoundView;
