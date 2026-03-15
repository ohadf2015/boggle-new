'use client';

import { Heart, Clock, Skull, Shield, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';

export interface WordHuntPlayerResult {
  username: string;
  score: number;
  survived: boolean;
  lifeRemaining: number;
}

interface WordHuntResultsSummaryProps {
  targetWord: string;
  foundTarget: boolean;
  isFirstFinder: boolean;
  survivalTime: number;
  discoveryWords: number;
  playerResults?: WordHuntPlayerResult[];
  currentUsername?: string;
}

export default function WordHuntResultsSummary({
  targetWord,
  foundTarget,
  isFirstFinder,
  survivalTime,
  discoveryWords,
  playerResults,
  currentUsername,
}: WordHuntResultsSummaryProps) {
  const { t, language } = useLanguage();

  // Apply Hebrew final letters for display (e.g., כ→ך at end of word)
  const displayTargetWord = language === 'he' ? applyHebrewFinalLetters(targetWord) : targetWord;

  const survivors = playerResults
    ?.filter((p) => p.survived)
    .sort((a, b) => b.score - a.score);
  const eliminated = playerResults
    ?.filter((p) => !p.survived)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-3">
      {/* Target word reveal — prominent hero display */}
      <div className="flex flex-col items-center gap-2 p-4 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard border-t-4 border-t-purple-500">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-neo-yellow" />
          <span className="text-sm font-bold text-neo-cream/70 uppercase tracking-wide">{t('wordHunt.multiplayer.targetWord')}</span>
        </div>
        <span className="text-3xl font-black text-neo-white tracking-widest font-neo-display uppercase">
          {displayTargetWord}
        </span>
        {foundTarget ? (
          isFirstFinder ? (
            <span className="px-3 py-1 text-xs font-bold bg-neo-yellow text-neo-black rounded-neo border-2 border-neo-black shadow-hard-sm">
              {t('wordHunt.multiplayer.firstFinder')}
            </span>
          ) : (
            <span className="px-3 py-1 text-xs font-bold bg-green-500 text-neo-black rounded-neo border-2 border-neo-black shadow-hard-sm">
              {t('wordHunt.multiplayer.found')}
            </span>
          )
        ) : (
          <span className="px-3 py-1 text-xs font-bold bg-red-500 text-neo-white rounded-neo border-2 border-neo-black shadow-hard-sm">
            {t('wordHunt.multiplayer.notFound')}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm">
          <Clock className="w-5 h-5 text-neo-orange" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-neo-white">{survivalTime}s</span>
            <span className="text-xs text-neo-cream/70">{t('wordHunt.multiplayer.survivalTime')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm">
          <Heart className="w-5 h-5 text-neo-pink" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-neo-white">{discoveryWords}</span>
            <span className="text-xs text-neo-cream/70">{t('wordHunt.multiplayer.discoveryWords')}</span>
          </div>
        </div>
      </div>

      {/* Survivors section */}
      {survivors && survivors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-green-400 font-neo-display">
              {t('wordHunt.results.survivors')}
            </span>
          </div>
          <div className="space-y-1">
            {survivors.map((player) => (
              <PlayerRow
                key={player.username}
                player={player}
                isCurrentUser={player.username === currentUsername}
                variant="survivor"
              />
            ))}
          </div>
        </div>
      )}

      {/* Eliminated section */}
      {eliminated && eliminated.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-red-400 font-neo-display">
              {t('wordHunt.results.eliminated')}
            </span>
          </div>
          <div className="space-y-1">
            {eliminated.map((player) => (
              <PlayerRow
                key={player.username}
                player={player}
                isCurrentUser={player.username === currentUsername}
                variant="eliminated"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerRow({
  player,
  isCurrentUser,
  variant,
}: {
  player: WordHuntPlayerResult;
  isCurrentUser: boolean;
  variant: 'survivor' | 'eliminated';
}) {
  const isSurvivor = variant === 'survivor';

  return (
    <div
      data-testid={`player-row-${player.username}`}
      className={`flex items-center justify-between p-2 rounded-neo border-3 border-neo-black shadow-hard-sm ${
        isCurrentUser
          ? 'bg-neo-yellow/20 border-neo-yellow'
          : isSurvivor
          ? 'bg-green-900/30'
          : 'bg-red-900/20 opacity-70'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!isSurvivor && <Skull className="w-4 h-4 text-red-400 flex-shrink-0" />}
        <span
          className={`text-sm font-bold truncate ${
            isCurrentUser ? 'text-neo-yellow' : 'text-neo-white'
          }`}
        >
          {player.username}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {isSurvivor && (
          <div
            role="progressbar"
            aria-valuenow={player.lifeRemaining}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-16 h-2 bg-neo-black/50 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-green-400 rounded-full"
              style={{ width: `${player.lifeRemaining}%` }}
            />
          </div>
        )}
        <span className="text-sm font-bold text-neo-white">{player.score}</span>
      </div>
    </div>
  );
}
