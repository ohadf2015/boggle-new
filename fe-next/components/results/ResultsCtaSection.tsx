'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Star, Play, Check, Swords } from 'lucide-react';
import type { Player } from '@/components/results/types';
import NextStepPrompt from '@/components/results/NextStepPrompt';
import ShareButton from '@/components/results/ShareButton';
import { GameModeSelector, type GameModeOption } from '@/components/GameModeSelector';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import type { ShareParams } from '@/shared/utils/shareResultGenerator';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface ResultsCtaSectionProps {
  sortedScores: Player[];
  currentPlayerData: Player | null;
  currentPlayerRank: number;
  currentPlayerValidWords: Array<{ word: string; score: number }>;
  hasZeroScore: boolean;
  isHost: boolean;
  onStartGame: () => void;
  onMarkReady: () => void;
  onExit: () => void;
  isBotsOnlyGame: boolean;
  isCurrentPlayerReady: boolean;
  normalizeUsername: (name: string | undefined | null) => string;
  username: string | undefined;
  selectedGameMode?: GameModeOption;
  onSelectGameMode?: (mode: GameModeOption) => void;
  breathingShadow: string[];
  reducedMotion: boolean | null;
  ctaDelay: number;
  t: TFunction;
}

export const ResultsCtaSection: React.FC<ResultsCtaSectionProps> = ({
  sortedScores,
  currentPlayerData,
  currentPlayerRank,
  currentPlayerValidWords,
  hasZeroScore,
  isHost,
  onStartGame,
  onMarkReady,
  onExit,
  isBotsOnlyGame,
  isCurrentPlayerReady,
  normalizeUsername,
  username,
  selectedGameMode,
  onSelectGameMode,
  breathingShadow,
  reducedMotion,
  ctaDelay,
  t,
}) => {
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  // On CrazyGames the only published mode is multiplayer, so the
  // bots-only NextStepPrompt (which suggests Daily Challenge) would
  // navigate the player off-mode. Fall through to the normal ready/back UI.
  const showBotsOnlyNextStep = isBotsOnlyGame && !isHost && !isOnCrazyGamesPlatform;

  return (
    <m.div
      initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: ctaDelay }}
    >
      {showBotsOnlyNextStep ? (
        <NextStepPrompt
          currentMode="multiplayer-bots"
          onBackToLobby={onExit}
          variant="mobile"
          className="mt-2"
        />
      ) : (
        <>
          <div className="mt-2">
            {isHost ? (
              <div className="space-y-2">
                {selectedGameMode !== undefined && onSelectGameMode && (
                  <div className="bg-neo-navy/60 border-2 border-slate-700/40 rounded-neo p-2.5">
                    <p className="text-[9px] font-black uppercase text-neo-white tracking-[0.2em] mb-1.5">
                      {t('gameModes.nextMode')}
                    </p>
                    <GameModeSelector
                      selectedMode={selectedGameMode}
                      onSelectMode={onSelectGameMode}
                      t={t}
                      showRandom
                      compact
                    />
                  </div>
                )}
                <m.button
                  onClick={onStartGame}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.93 }}
                  animate={!reducedMotion ? {
                    scale: [1, 1.02, 1],
                    boxShadow: breathingShadow,
                  } : undefined}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-full bg-emerald-500 text-white font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
                >
                  <Play className="w-6 h-6" />
                  {t('results.playAgain')}
                </m.button>
              </div>
            ) : isCurrentPlayerReady ? (
              <div className="bg-emerald-500 text-white border-3 border-neo-black rounded-neo p-3 shadow-hard">
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  <span className="font-black uppercase">{t('results.youAreReady')}</span>
                </div>
                <p className="text-center text-sm text-white mt-1">
                  {t('results.waitingForHostToStart')}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {currentPlayerRank > 1 && sortedScores.length > 1 && sortedScores[0]?.username ? (
                  <m.button
                    onClick={onMarkReady}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    animate={!reducedMotion ? {
                      scale: [1, 1.02, 1],
                      boxShadow: breathingShadow,
                    } : undefined}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-full bg-neo-pink text-white font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
                  >
                    <Swords className="w-6 h-6" />
                    {t('results.revengeRematch', { player: sortedScores[0].username })}
                  </m.button>
                ) : (
                  <m.button
                    onClick={onMarkReady}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    animate={!reducedMotion ? {
                      scale: [1, 1.02, 1],
                      boxShadow: breathingShadow,
                    } : undefined}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-full bg-neo-lime text-neo-black font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
                  >
                    <Star className="w-6 h-6" />
                    {t('results.imReady')}
                  </m.button>
                )}
                <p className="text-center text-xs text-neo-white">
                  {t('results.readyExplanation')}
                </p>
              </div>
            )}
          </div>

          {/* Share Button with narrative preview */}
          {currentPlayerData && !hasZeroScore && (currentPlayerData.score || 0) >= 10 && (
            <div className="space-y-1.5">
              {currentPlayerValidWords.length > 0 && (
                <p className="text-[10px] text-neo-white text-center italic px-2">
                  {currentPlayerRank === 1
                    ? t('results.shareNarrativeWin', {
                        word: currentPlayerValidWords.reduce((a, b) => a.word.length >= b.word.length ? a : b).word.toUpperCase(),
                        score: currentPlayerData.score || 0,
                      })
                    : t('results.shareNarrativeLoss', {
                        words: currentPlayerValidWords.length,
                        score: currentPlayerData.score || 0,
                      })
                  }
                </p>
              )}
              <ShareButton
                params={{
                  gameMode: 'multiplayer',
                  score: currentPlayerData.score || 0,
                  wordsFound: currentPlayerValidWords.length,
                  longestWord: currentPlayerValidWords.length > 0
                    ? currentPlayerValidWords.reduce((a, b) => a.word.length >= b.word.length ? a : b).word
                    : undefined,
                  won: currentPlayerRank === 1,
                  opponentScore: sortedScores.length > 1
                    ? sortedScores.find(p => normalizeUsername(p.username) !== normalizeUsername(username))?.score
                    : undefined,
                } satisfies ShareParams}
                t={t}
                className="w-full"
              />
            </div>
          )}
        </>
      )}
    </m.div>
  );
};

export default ResultsCtaSection;
