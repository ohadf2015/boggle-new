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
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * TvResultsStatsGrid - Game-wide statistics display
 * Shows collective achievements like total words, longest word, etc.
 */
const TvResultsStatsGrid = memo<TvResultsStatsGridProps>(({
  players,
  visible,
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
        color: 'bg-linear-to-r from-neo-orange to-neo-red',
      });
    }

    return calculatedStats.slice(0, 6); // Max 6 stats
  }, [players, t]);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {stats.map((stat, index) => (
            <m.div
              key={stat.id}
              initial={{ y: 30, opacity: 0, rotateX: -20 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              transition={{
                delay: index * 0.15,
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              className={cn(
                'relative p-4 rounded-neo border-4 border-neo-black shadow-hard-lg',
                stat.color
              )}
            >
              {/* Icon */}
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-neo-cream text-neo-black rounded-full border-3 border-neo-black flex items-center justify-center shadow-hard-sm">
                <stat.icon className="w-5 h-5 text-neo-black" />
              </div>

              {/* Label */}
              <p className="text-sm font-bold uppercase tracking-wide text-neo-black/70 mt-2 mb-1">
                {stat.label}
              </p>

              {/* Value */}
              <p className="font-black text-2xl md:text-3xl text-neo-black truncate">
                {stat.value}
              </p>

              {/* Sub Value */}
              {stat.subValue && (
                <p className="text-sm font-bold text-neo-black/60">
                  {stat.subValue}
                </p>
              )}

              {/* Player Attribution */}
              {stat.player && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t-2 border-neo-black/20">
                  <Avatar

                    avatarImage={stat.player.avatar?.avatarImage}
                    customAvatar={stat.player.avatar?.customAvatar}
                    size="sm"
                    className="border-2 border-neo-black"
                  />
                  <span className="font-bold text-sm text-neo-black truncate">
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
