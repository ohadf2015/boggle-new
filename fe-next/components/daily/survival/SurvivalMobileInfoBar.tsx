'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Trophy, Package, Users, ChevronUp, ChevronDown, Heart, KeyRound, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { getRankDisplay } from '@/utils/rankingStyles';
import { MAX_ATTEMPTS } from './constants';
import type { WordDiscovery, TargetAttempt } from './types';
import type { Language } from '@/types';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  solved: boolean;
  playerId?: string;
  guestFingerprint?: string;

  avatar_image?: string | null;
}

export interface SurvivalMobileInfoBarProps {
  discoveredWords: WordDiscovery[];
  hintStage: number;
  attempts: TargetAttempt[];
  puzzleDate: string;
  language: Language | string;
  currentPlayerId: string | null;
  currentGuestFingerprint: string | null;
  t: (key: string) => string;
}

const POLL_INTERVAL = 30000;

/**
 * Mobile-only floating info bar showing rank + loot count.
 * Tappable to expand into a bottom sheet with Live Ranks and Loot tabs.
 */
export const SurvivalMobileInfoBar: React.FC<SurvivalMobileInfoBarProps> = ({
  discoveredWords,
  hintStage,
  attempts,
  puzzleDate,
  language,
  currentPlayerId,
  currentGuestFingerprint,
  t,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'loot' | 'ranks'>('loot');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);

  const targetAttempts = attempts.filter(a => !a.isDiscovery);
  const triesRemaining = Math.max(0, MAX_ATTEMPTS - targetAttempts.length);
  const sortedWords = [...discoveredWords].sort((a, b) => b.timestamp - a.timestamp);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const url = `/api/daily-challenge/word-hunt/leaderboard/${puzzleDate}/${language}?limit=10`;
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();
      // API returns snake_case from Supabase view — map to camelCase
      const mapped: LeaderboardEntry[] = (data.data || []).map((row: Record<string, unknown>, idx: number) => ({
        rank: (row.rank_position as number) ?? idx + 1,
        displayName: (row.display_name as string) || 'Anonymous',
        score: (row.efficiency_score as number) ?? 0,
        solved: (row.solved as boolean) ?? false,
        playerId: row.player_id as string | undefined,
        guestFingerprint: row.guest_fingerprint as string | undefined,

        avatar_image: row.avatar_image as string | null,
      }));
      setEntries(mapped);
      setTotalPlayers(data.totalPlayers || data.totalParticipants || 0);
    } catch {
      // Silently fail — leaderboard is non-critical
    }
  }, [puzzleDate, language]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const isCurrentPlayer = (entry: LeaderboardEntry) => {
    if (currentPlayerId && entry.playerId === currentPlayerId) return true;
    if (currentGuestFingerprint && entry.guestFingerprint === currentGuestFingerprint) return true;
    return false;
  };

  // Find current player's rank
  const myEntry = entries.find(isCurrentPlayer);
  const myRank = myEntry?.rank;

  return (
    <div className="w-full">
      {/* Compact bar — always visible */}
      <button
        data-testid="mobile-info-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2',
          'bg-neo-black/40 border-2 border-neo-black/30 rounded-neo',
          'transition-colors active:bg-neo-black/60',
        )}
      >
        <div className="flex items-center gap-3">
          {/* Rank indicator */}
          <div className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-neo-yellow" />
            <span className="text-xs font-bold text-neo-white">
              {myRank ? `#${myRank}` : `${totalPlayers}`}
            </span>
            {totalPlayers > 0 && (
              <span className="text-[10px] text-neo-white">
                <Users className="w-2.5 h-2.5 inline" /> {totalPlayers}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-neo-cream/20" />

          {/* Words found */}
          <div className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-neo-lime" />
            <span data-testid="mobile-info-words-count" className="text-xs font-bold text-neo-lime">
              {discoveredWords.length}
            </span>
            <span className="text-[10px] text-neo-white">
              {t('wordHunt.mobile.words')}
            </span>
          </div>
        </div>

        {/* Expand indicator */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-neo-white" />
        ) : (
          <ChevronUp className="w-4 h-4 text-neo-white" />
        )}
      </button>

      {/* Expanded panel */}
      <AdaptiveAnimatePresence>
        {isExpanded && (
          <AdaptiveMotion.div
            data-testid="mobile-info-expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-neo-black/50 border-2 border-t-0 border-neo-black/30 rounded-b-neo">
              {/* Tab switches */}
              <div className="flex border-b border-neo-black/30">
                <button
                  data-testid="mobile-info-tab-loot"
                  onClick={() => setActiveTab('loot')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold uppercase transition-colors',
                    activeTab === 'loot'
                      ? 'text-neo-lime border-b-2 border-neo-lime bg-neo-lime/5'
                      : 'text-neo-white hover:text-neo-white'
                  )}
                >
                  <Package className="w-3 h-3" />
                  {t('wordHunt.desktop.lootCollected')}
                </button>
                <button
                  data-testid="mobile-info-tab-ranks"
                  onClick={() => setActiveTab('ranks')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold uppercase transition-colors',
                    activeTab === 'ranks'
                      ? 'text-neo-yellow border-b-2 border-neo-yellow bg-neo-yellow/5'
                      : 'text-neo-white hover:text-neo-white'
                  )}
                >
                  <Trophy className="w-3 h-3" />
                  {t('wordHunt.desktop.liveRanks')}
                </button>
              </div>

              {/* Tab content */}
              <div className="max-h-[200px] overflow-y-auto p-2">
                {activeTab === 'loot' ? (
                  <LootTabContent
                    sortedWords={sortedWords}
                    hintStage={hintStage}
                    triesRemaining={triesRemaining}
                    discoveredWordsCount={discoveredWords.length}
                    t={t}
                  />
                ) : (
                  <RanksTabContent
                    entries={entries}
                    totalPlayers={totalPlayers}
                    isCurrentPlayer={isCurrentPlayer}
                  />
                )}
              </div>
            </div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
};

/** Loot tab — discovered words + stats */
const LootTabContent: React.FC<{
  sortedWords: WordDiscovery[];
  hintStage: number;
  triesRemaining: number;
  discoveredWordsCount: number;
  t: (key: string) => string;
}> = ({ sortedWords, hintStage, triesRemaining, discoveredWordsCount, t }) => (
  <div className="space-y-1">
    {sortedWords.length === 0 ? (
      <div className="flex flex-col items-center py-4 text-neo-white text-xs">
        <Package className="w-6 h-6 mb-1 opacity-50" />
        <span>{t('wordHunt.desktop.noWordsYet')}</span>
      </div>
    ) : (
      <>
        {sortedWords.map((word) => (
          <MobileLootItem key={`${word.word}-${word.timestamp}`} word={word} />
        ))}
        {/* Mini stats footer */}
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-neo-black/20 text-[10px] text-neo-white">
          <span>{discoveredWordsCount} {t('wordHunt.mobile.words')}</span>
          <span className="text-neo-cyan">{triesRemaining} tries left</span>
        </div>
      </>
    )}
  </div>
);

/** Single loot word item for mobile */
const MobileLootItem: React.FC<{ word: WordDiscovery }> = ({ word }) => {
  const lengthColor = word.word.length >= 7
    ? 'text-neo-pink'
    : word.word.length >= 5
      ? 'text-neo-cyan'
      : 'text-neo-white';

  return (
    <div className="flex items-center justify-between px-2 py-1 rounded bg-neo-black/20">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={cn('font-bold uppercase tracking-wider truncate text-xs', lengthColor)}>
          {word.word}
        </span>
        {word.word.length >= 7 && (
          <Star className="w-2.5 h-2.5 text-neo-pink shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
        {word.lifeGained > 0 && (
          <span className="text-green-400 font-bold flex items-center gap-0.5">
            +{word.lifeGained}
            <Heart className="w-2.5 h-2.5 fill-current" />
          </span>
        )}
        {word.tokensGained > 0 && (
          <span className="text-neo-yellow font-bold flex items-center gap-0.5">
            +{word.tokensGained}
            <KeyRound className="w-2.5 h-2.5" />
          </span>
        )}
      </div>
    </div>
  );
};

/** Ranks tab — live leaderboard */
const RanksTabContent: React.FC<{
  entries: LeaderboardEntry[];
  totalPlayers: number;
  isCurrentPlayer: (entry: LeaderboardEntry) => boolean;
}> = ({ entries, totalPlayers, isCurrentPlayer }) => (
  <div className="space-y-1">
    {entries.length === 0 ? (
      <div className="flex flex-col items-center py-4 text-neo-white text-xs">
        <Trophy className="w-6 h-6 mb-1 opacity-50" />
        <span>Loading ranks...</span>
      </div>
    ) : (
      <>
        {entries.map((entry) => (
          <div
            key={`${entry.rank}-${entry.displayName}`}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded text-xs',
              isCurrentPlayer(entry)
                ? 'bg-neo-cyan/10 ring-1 ring-neo-cyan/50'
                : 'bg-neo-black/20'
            )}
          >
            <span className={cn(
              'w-5 text-center font-black text-[10px] shrink-0',
              entry.rank === 1 ? 'text-neo-yellow' :
              entry.rank === 2 ? 'text-gray-300' :
              entry.rank === 3 ? 'text-amber-600' :
              'text-neo-white'
            )}>
              {getRankDisplay(entry.rank)}
            </span>
            <div className="shrink-0">
              <Avatar

                avatarImage={entry.avatar_image ?? undefined}
                size="sm"
              />
            </div>
            <span className={cn(
              'flex-1 truncate font-medium',
              isCurrentPlayer(entry) ? 'text-neo-cyan font-bold' : 'text-neo-white'
            )}>
              {entry.displayName}
            </span>
            <span className="font-black text-neo-lime shrink-0 tabular-nums">
              {entry.score}
            </span>
          </div>
        ))}
        {totalPlayers > entries.length && (
          <div className="text-center text-[10px] text-neo-white pt-1">
            +{totalPlayers - entries.length} more players
          </div>
        )}
      </>
    )}
  </div>
);

export default SurvivalMobileInfoBar;
