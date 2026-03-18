'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Play, Swords, Star, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { GameModeSelector, type GameModeOption } from '@/components/GameModeSelector';

interface StickyReadyBarProps {
  isHost: boolean;
  isCurrentPlayerReady: boolean;
  currentPlayerRank: number;
  winnerUsername?: string;
  readyCount: number;
  totalPlayers: number;
  readyUsernames?: string[];
  onStartGame: () => void;
  onMarkReady: () => void;
  selectedGameMode?: GameModeOption;
  onSelectGameMode?: (mode: GameModeOption) => void;
}

function makeBreathingPulse(dir: 'ltr' | 'rtl') {
  const x = dir === 'rtl' ? '-4px' : '4px';
  const xLg = dir === 'rtl' ? '-6px' : '6px';
  return {
    scale: [1, 1.02, 1],
    boxShadow: [
      `${x} 4px 0px black`,
      `${xLg} 6px 0px black`,
      `${x} 4px 0px black`,
    ],
  };
}

export default function StickyReadyBar({
  isHost,
  isCurrentPlayerReady,
  currentPlayerRank,
  winnerUsername,
  readyCount,
  totalPlayers,
  onStartGame,
  onMarkReady,
  selectedGameMode,
  onSelectGameMode,
  readyUsernames = [],
}: StickyReadyBarProps) {
  const { t, dir } = useLanguage();
  const reducedMotion = useReducedMotion();
  const breathingPulse = makeBreathingPulse(dir);

  const isRevenge = currentPlayerRank > 1 && !!winnerUsername;
  const mascotSrc = isRevenge ? '/mascot/flexing-nobg.gif' : '/mascot/trophy-nobg.gif';

  return (
    <motion.div
      initial={reducedMotion ? undefined : { y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="bg-neo-navy/95 backdrop-blur-sm border-t-2 border-white/10 px-3 py-2"
    >
      <div className="max-w-lg mx-auto flex items-center gap-3">
        {/* Mascot GIF — small, adds personality */}
        {!isCurrentPlayerReady && (
          <motion.div
            className="shrink-0"
            animate={!reducedMotion ? { y: [0, -4, 0], scale: [1, 1.03, 1] } : undefined}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mascotSrc} alt="" width={40} height={40} className="object-contain" loading="eager" />
          </motion.div>
        )}

        <div className="flex-1 min-w-0">
          {isHost ? (
            <div className="space-y-1.5">
              {selectedGameMode !== undefined && onSelectGameMode && (
                <GameModeSelector
                  selectedMode={selectedGameMode}
                  onSelectMode={onSelectGameMode}
                  t={t}
                  showRandom
                  compact
                />
              )}
              <motion.button
                onClick={onStartGame}
                whileTap={{ scale: 0.92 }}
                animate={!reducedMotion ? breathingPulse : undefined}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full bg-emerald-500 text-white font-black text-base px-4 py-3 min-h-[44px] uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                {t('results.playAgain')}
              </motion.button>
            </div>
          ) : isCurrentPlayerReady ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="font-black text-sm uppercase text-emerald-400">{t('results.youAreReady')}</span>
              <span className="text-xs text-neo-cream/50">— {t('results.waitingForHostToStart')}</span>
            </div>
          ) : isRevenge ? (
            <motion.button
              onClick={onMarkReady}
              whileTap={{ scale: 0.92 }}
              animate={!reducedMotion ? breathingPulse : undefined}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full bg-neo-pink text-white font-black text-base px-4 py-3 min-h-[44px] uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
            >
              <Swords className="w-5 h-5" />
              {t('results.revengeRematch', { player: winnerUsername })}
            </motion.button>
          ) : (
            <motion.button
              onClick={onMarkReady}
              whileTap={{ scale: 0.92 }}
              animate={!reducedMotion ? breathingPulse : undefined}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full bg-neo-lime text-neo-black font-black text-base px-4 py-3 min-h-[44px] uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
            >
              <Star className="w-5 h-5" />
              {t('results.imReady')}
            </motion.button>
          )}
        </div>
      </div>

      {/* Ready status — host sees names, players see count */}
      {(readyCount > 0 || isHost) && (
        <div className="text-center mt-1" aria-live="polite">
          {isHost && readyUsernames.length > 0 ? (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {readyUsernames.slice(0, 5).map(name => (
                <span key={name} className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <Check className="w-2.5 h-2.5" />
                  {name}
                </span>
              ))}
              {readyUsernames.length > 5 && (
                <span className="text-[10px] text-neo-cream/50">+{readyUsernames.length - 5}</span>
              )}
              <span className="text-[10px] text-neo-cream/40 ms-1">
                ({readyCount}/{totalPlayers})
              </span>
            </div>
          ) : readyCount > 0 ? (
            <p className="text-[10px] text-neo-cream/50">
              {t('results.playersReady', { count: readyCount, total: totalPlayers })}
            </p>
          ) : isHost ? (
            <p className="text-[10px] text-neo-cream/40">
              {t('results.waitingForPlayers')}
            </p>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}
