'use client';

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Target, BookOpen, Crown, Star, Dumbbell, type LucideIcon } from 'lucide-react';
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

interface Award {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  recipient: {
    username: string;
    avatar?: AvatarType | null;
  };
  value: string | number;
  color: string;
}

interface TvResultsAwardsProps {
  players: PlayerData[];
  visible: boolean;
  gameDuration?: number; // in seconds
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * TvResultsAwards - Fun awards section
 * Recognizes players for special achievements beyond just winning
 */
const TvResultsAwards = memo<TvResultsAwardsProps>(({
  players,
  visible,
  gameDuration = 180,
  t,
}) => {
  // Calculate awards based on player data
  const awards = useMemo((): Award[] => {
    if (!players || players.length === 0) return [];

    const calculatedAwards: Award[] = [];
    const winners = new Set<string>(); // Track who already got top 3

    // Mark top 3 as already having awards
    const sortedByScore = [...players].sort((a, b) => b.score - a.score);
    sortedByScore.slice(0, 3).forEach(p => winners.add(p.username));

    // Helper to find eligible players (prefer those not in top 3)
    const findBestCandidate = (
      candidates: { player: PlayerData; value: number }[]
    ): { player: PlayerData; value: number } | null => {
      // Sort by value descending
      const sorted = [...candidates].sort((a, b) => b.value - a.value);

      // Prefer non-winners
      const nonWinner = sorted.find(c => !winners.has(c.player.username));
      if (nonWinner) return nonWinner;

      // Fall back to highest value
      return sorted[0] || null;
    };

    // 1. Lightning Fingers - Fastest first word
    const firstWords = players
      .map(player => {
        const firstWord = player.allWords
          ?.filter(w => w.validated && w.timeSinceStart !== undefined)
          .sort((a, b) => (a.timeSinceStart || 999) - (b.timeSinceStart || 999))[0];
        return {
          player,
          value: firstWord?.timeSinceStart || 999,
        };
      })
      .filter(p => p.value < 999)
      .sort((a, b) => a.value - b.value);

    if (firstWords.length > 0) {
      const winner = firstWords[0];
      calculatedAwards.push({
        id: 'lightning-fingers',
        icon: Zap,
        title: t('tvResults.lightningFingers'),
        description: t('tvResults.fastestFirstWord'),
        recipient: {
          username: winner.player.username,
          avatar: winner.player.avatar,
        },
        value: `${winner.value.toFixed(1)}s`,
        color: 'bg-neo-yellow',
      });
    }

    // 2. Sharp Shooter - Highest accuracy (min 5 words)
    const accuracyStats = players
      .map(player => {
        const validWords = player.allWords?.filter(w => w.validated).length || 0;
        const totalWords = player.allWords?.length || 0;
        const accuracy = totalWords >= 5 ? (validWords / totalWords) * 100 : 0;
        return { player, value: accuracy };
      })
      .filter(p => p.value > 0);

    const accuracyWinner = findBestCandidate(accuracyStats);
    if (accuracyWinner && accuracyWinner.value >= 50) {
      calculatedAwards.push({
        id: 'sharp-shooter',
        icon: Target,
        title: t('tvResults.sharpShooter'),
        description: t('tvResults.highestAccuracy'),
        recipient: {
          username: accuracyWinner.player.username,
          avatar: accuracyWinner.player.avatar,
        },
        value: `${Math.round(accuracyWinner.value)}%`,
        color: 'bg-neo-lime',
      });
    }

    // 3. Word Wizard - Most 6+ letter words
    const longWordStats = players.map(player => {
      const longWords = player.allWords?.filter(w => w.validated && w.word.length >= 6).length || 0;
      return { player, value: longWords };
    });

    const wordWizard = findBestCandidate(longWordStats);
    if (wordWizard && wordWizard.value >= 3) {
      calculatedAwards.push({
        id: 'word-wizard',
        icon: BookOpen,
        title: t('tvResults.wordWizard'),
        description: t('tvResults.mostLongWords'),
        recipient: {
          username: wordWizard.player.username,
          avatar: wordWizard.player.avatar,
        },
        value: wordWizard.value,
        color: 'bg-neo-purple',
      });
    }

    // 4. Combo King/Queen - Highest combo streak
    const comboStats = players.map(player => {
      const maxCombo = player.allWords?.reduce((max, w) => Math.max(max, w.comboLevel || 0), 0) || 0;
      return { player, value: maxCombo };
    });

    const comboKing = findBestCandidate(comboStats);
    if (comboKing && comboKing.value >= 5) {
      calculatedAwards.push({
        id: 'combo-king',
        icon: Crown,
        title: t('tvResults.comboKing'),
        description: t('tvResults.bestComboStreak'),
        recipient: {
          username: comboKing.player.username,
          avatar: comboKing.player.avatar,
        },
        value: `${comboKing.value}x`,
        color: 'bg-neo-orange',
      });
    }

    // 5. Lone Wolf - Most unique words (words only they found)
    const wordCounts = new Map<string, number>();
    players.forEach(player => {
      player.allWords?.forEach(w => {
        if (w.validated) {
          const word = w.word.toLowerCase();
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });
    });

    const uniqueWordStats = players.map(player => {
      const uniqueCount = player.allWords?.filter(w => {
        if (!w.validated) return false;
        const word = w.word.toLowerCase();
        return wordCounts.get(word) === 1;
      }).length || 0;
      return { player, value: uniqueCount };
    });

    const loneWolf = findBestCandidate(uniqueWordStats);
    if (loneWolf && loneWolf.value >= 3) {
      calculatedAwards.push({
        id: 'lone-wolf',
        icon: Star,
        title: t('tvResults.loneWolf'),
        description: t('tvResults.mostUniqueFinds'),
        recipient: {
          username: loneWolf.player.username,
          avatar: loneWolf.player.avatar,
        },
        value: loneWolf.value,
        color: 'bg-neo-cyan',
      });
    }

    // 6. Clutch Player - Most words in final 30 seconds
    const clutchStats = players.map(player => {
      const clutchThreshold = Math.max(0, gameDuration - 30);
      const clutchWords = player.allWords?.filter(w => {
        if (!w.validated || w.timeSinceStart === undefined) return false;
        return w.timeSinceStart >= clutchThreshold;
      }).length || 0;
      return { player, value: clutchWords };
    });

    const clutchPlayer = findBestCandidate(clutchStats);
    if (clutchPlayer && clutchPlayer.value >= 3) {
      calculatedAwards.push({
        id: 'clutch-player',
        icon: Dumbbell,
        title: t('tvResults.clutchPlayer'),
        description: t('tvResults.strongFinisher'),
        recipient: {
          username: clutchPlayer.player.username,
          avatar: clutchPlayer.player.avatar,
        },
        value: `${clutchPlayer.value} ${t('tvResults.words')}`,
        color: 'bg-neo-pink',
      });
    }

    return calculatedAwards.slice(0, 6); // Max 6 awards
  }, [players, gameDuration, t]);

  if (awards.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-4"
        >
          <motion.h3
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-xl font-black uppercase tracking-wide text-neo-cream"
          >
            {t('tvResults.specialAwards')}
          </motion.h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {awards.map((award, index) => (
              <motion.div
                key={award.id}
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.2,
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  'relative p-4 rounded-neo border-4 border-neo-black shadow-hard',
                  award.color
                )}
              >
                {/* Icon Badge */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.2 + 0.3, type: 'spring' }}
                  className="absolute -top-4 -right-4 w-12 h-12 bg-neo-cream rounded-full border-3 border-neo-black flex items-center justify-center shadow-hard"
                >
                  <award.icon className="w-6 h-6 text-neo-black" />
                </motion.div>

                {/* Award Title */}
                <h4 className="font-black text-lg uppercase text-neo-black mb-1 pr-8">
                  {award.title}
                </h4>

                {/* Description */}
                <p className="text-sm font-bold text-neo-black/60 mb-3">
                  {award.description}
                </p>

                {/* Recipient */}
                <div className="flex items-center gap-3">
                  <Avatar
                    profilePictureUrl={award.recipient.avatar?.profilePictureUrl ?? undefined}
                    avatarImage={award.recipient.avatar?.avatarImage}
                    size="md"
                    className="border-3 border-neo-black shadow-hard-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-neo-black truncate">
                      {award.recipient.username}
                    </p>
                    <p className="font-black text-lg text-neo-black/80">
                      {award.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

TvResultsAwards.displayName = 'TvResultsAwards';

export default TvResultsAwards;
