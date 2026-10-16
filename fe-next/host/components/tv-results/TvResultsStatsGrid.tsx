'use client';

import React, { memo, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Hash, Ruler, Zap, Flame, Target, Trophy, type LucideIcon } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { cn } from '../../../lib/utils';
import type { Avatar as AvatarType } from '@/shared/types/game';

// Extended WordDetail with timing info (available in final scores)
interface WordDetailWithTiming {
  word: string;
  score: number;
  validated: boolean;
  isDuplicate: boolean;
  comboBonus?: number;
  comboLevel?: number;
  fireRoundBonus?: number;
  fireRoundMultiplier?: number;
  timeSinceStart?: number;
  timestamp?: number;
}

interface PlayerData {
  username: string;
  score: number;
  avatar?: AvatarType | null;
  allWords?: WordDetailWithTiming[];
}

interface GameStat {
  id: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  player?: {
    username: string;
    avatar?: AvatarType | null;
  };
  color: string;
}

interface TvResultsStatsGridProps {
  players: PlayerData[];
  visible: boolean;
  /** Cards that fit; when trimming, the room-wide word count goes first since it names nobody. */
  max?: number;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * TvResultsStatsGrid - Game-wide statistics display
 * Shows collective achievements like total words, longest word, etc.
 */
const TvResultsStatsGrid = memo<TvResultsStatsGridProps>(({
  players,
  visible,
  max = 4,
  t,
}) => {
  // Calculate game stats from player data
  const stats = useMemo((): GameStat[] => {
    if (!players || players.length === 0) return [];

    const allWords: { word: string; player: PlayerData; detail: WordDetailWithTiming }[] = [];
    const uniqueWords = new Set<string>();

    // Collect all words from all players
    players.forEach(player => {
      player.allWords?.forEach(word => {
        if (word.validated) {
          allWords.push({ word: word.word, player, detail: word });
          uniqueWords.add(word.word.toLowerCase());
        }
      });
    });

    const calculatedStats: GameStat[] = [];

    // 1. Total Words Found
    calculatedStats.push({
      id: 'total-words',
      icon: Hash,
      label: t('tvResults.wordsFound'),
      value: uniqueWords.size,
      subValue: uniqueWords.size > 100 ? t('tvResults.legendary') : uniqueWords.size > 50 ? t('tvResults.amazing') : '',
      color: 'bg-neo-cyan',
    });

    // 2. Longest Word
    let longestWord = { word: '', player: null as PlayerData | null };
    allWords.forEach(({ word, player }) => {
      if (word.length > longestWord.word.length) {
        longestWord = { word, player };
      }
    });
    if (longestWord.word) {
      calculatedStats.push({
        id: 'longest-word',
        icon: Ruler,
        label: t('tvResults.longestWord'),
        value: longestWord.word.toUpperCase(),
        subValue: `${longestWord.word.length} ${t('tvResults.letters')}`,
        player: longestWord.player ? {
          username: longestWord.player.username,
          avatar: longestWord.player.avatar,
        } : undefined,
        color: 'bg-neo-purple',
      });
    }

    // 3. First Strike (first word found - needs timestamp)
    const wordsWithTime = allWords
      .filter(w => w.detail.timeSinceStart !== undefined)
      .sort((a, b) => (a.detail.timeSinceStart || 0) - (b.detail.timeSinceStart || 0));

    if (wordsWithTime.length > 0) {
      const firstWord = wordsWithTime[0];
      const seconds = firstWord.detail.timeSinceStart || 0;
      calculatedStats.push({
        id: 'first-strike',
        icon: Zap,
        label: t('tvResults.firstStrike'),
        value: firstWord.word.toUpperCase(),
        subValue: `${seconds.toFixed(1)}s`,
        player: {
          username: firstWord.player.username,
          avatar: firstWord.player.avatar,
        },
        color: 'bg-neo-yellow',
      });
    }

    // 4. Best Combo
    let bestCombo = { level: 0, player: null as PlayerData | null };
    allWords.forEach(({ player, detail }) => {
      if (detail.comboLevel && detail.comboLevel > bestCombo.level) {
        bestCombo = { level: detail.comboLevel, player };
      }
    });
    if (bestCombo.level > 0) {
      calculatedStats.push({
        id: 'best-combo',
        icon: Flame,
        label: t('tvResults.bestCombo'),
        value: `${bestCombo.level}x`,
        subValue: bestCombo.level >= 10 ? t('tvResults.onFire') : '',
        player: bestCombo.player ? {
          username: bestCombo.player.username,
          avatar: bestCombo.player.avatar,
        } : undefined,
        color: 'bg-neo-orange',
      });
    }

    // 5. Photo Finish (if top 2 within 10 points)
    if (players.length >= 2) {
      const sortedByScore = [...players].sort((a, b) => b.score - a.score);
      const scoreDiff = sortedByScore[0].score - sortedByScore[1].score;
      if (scoreDiff <= 10 && scoreDiff >= 0) {
        calculatedStats.push({
          id: 'photo-finish',
          icon: Target,
          label: t('tvResults.photoFinish'),
          value: `${scoreDiff}`,
          subValue: t('tvResults.pointsApart'),
          color: 'bg-neo-pink',
        });
      }
    }

    // 6. Fire Round Hero (if any fire round bonuses)
    const fireRoundStats = players.map(player => {
      const fireBonus = player.allWords?.reduce((sum, w) => sum + (w.fireRoundBonus || 0), 0) || 0;
      return { player, fireBonus };
    }).filter(s => s.fireBonus > 0).sort((a, b) => b.fireBonus - a.fireBonus);

    if (fireRoundStats.length > 0) {
      const hero = fireRoundStats[0];
      calculatedStats.push({
        id: 'fire-hero',
        icon: Trophy,
        label: t('tvResults.fireRoundHero'),
        value: `+${hero.fireBonus}`,
        subValue: t('tvResults.bonusPts'),
        player: {
          username: hero.player.username,
          avatar: hero.player.avatar,
        },
        color: 'bg-neo-lime',
      });
    }

    const ordered = max < calculatedStats.length ? calculatedStats.filter(s => s.id !== 'total-words') : calculatedStats;
    return ordered.slice(0, max);
  }, [players, t, max]);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ y: 24 }}
          animate={{ y: 0 }}
          exit={{ y: 24 }}
          className="grid grid-cols-2 gap-4"
        >
          {stats.map((stat, index) => (
            <m.div
              key={stat.id}
              data-testid={`stat-card-${stat.id}`}
              initial={{ y: 30, rotateX: -20 }}
              animate={{ y: 0, rotateX: 0 }}
              transition={{ delay: index * 0.15, type: 'spring', stiffness: 300, damping: 20 }}
              className={cn(
                'flex min-w-0 flex-col gap-1 rounded-neo border-4 border-neo-black px-4 py-3 shadow-hard-lg',
                stats.length % 2 === 1 && index === 0 && 'col-span-2',
                stat.color
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-3 border-neo-black bg-neo-cream">
                  <stat.icon className="h-4 w-4 text-neo-black" />
                </span>
                <p className="text-[clamp(0.75rem,1.5vh,1rem)] font-black uppercase leading-tight tracking-wide text-neo-black/75">
                  {stat.label}
                </p>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3">
                <p
                  data-testid={`stat-value-${stat.id}`}
                  className="font-neo-display text-[clamp(1.6rem,3.6vh,2.75rem)] font-black leading-none text-neo-black [overflow-wrap:anywhere]"
                >
                  {stat.value}
                </p>
                {stat.subValue && (
                  <p className="text-[clamp(0.8rem,1.5vh,1rem)] font-bold text-neo-black/70">
                    {stat.subValue}
                  </p>
                )}
              </div>

              {stat.player && (
                <div className="mt-auto flex items-center gap-2 border-t-2 border-neo-black/20 pt-1.5">
                  <Avatar
                    avatarImage={stat.player.avatar?.avatarImage}
                    customAvatar={stat.player.avatar?.customAvatar}
                    size="md"
                    className="shrink-0 border-2 border-neo-black"
                  />
                  <span
                    data-testid={`stat-player-${stat.id}`}
                    className="min-w-0 text-[clamp(0.85rem,1.6vh,1.1rem)] font-black leading-tight text-neo-black [overflow-wrap:anywhere]"
                  >
                    {stat.player.username}
                  </span>
                </div>
              )}
            </m.div>
          ))}
        </m.div>
      )}
    </AnimatePresence>
  );
});

TvResultsStatsGrid.displayName = 'TvResultsStatsGrid';

export default TvResultsStatsGrid;
