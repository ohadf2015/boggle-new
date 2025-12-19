'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { Trophy, Zap, Clock, Award } from 'lucide-react';
import Avatar from './Avatar';
import type { GameUser, Language } from '@/types';

/**
 * Achievement notification item
 */
interface AchievementNotification {
  key: string;
  player: string;
  achievement: {
    type: string;
    name: string;
  };
  timestamp: number;
}

/**
 * Player data for live results
 */
interface LivePlayer extends GameUser {
  score: number;
  wordCount: number;
  achievements?: Array<{
    type: string;
    name: string;
  }>;
}

/**
 * HostLiveResults Props
 */
interface HostLiveResultsProps {
  players: LivePlayer[];
  gameLanguage: Language;
  remainingTime: number;
}

const HostLiveResults: React.FC<HostLiveResultsProps> = ({ players, gameLanguage, remainingTime }) => {
  const { t } = useLanguage();
  const [recentAchievements, setRecentAchievements] = useState<AchievementNotification[]>([]);

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Track achievement notifications
  useEffect(() => {
    players.forEach(player => {
      if (player.achievements && player.achievements.length > 0) {
        player.achievements.forEach(achievement => {
          // Check if we haven't already notified about this achievement
          const achievementKey = `${player.username}-${achievement.type}`;
          if (!recentAchievements.find(a => a.key === achievementKey)) {
            // Add to recent achievements with timestamp
            setRecentAchievements(prev => [
              ...prev,
              {
                key: achievementKey,
                player: player.username,
                achievement,
                timestamp: Date.now()
              }
            ]);

            // Remove after 5 seconds
            setTimeout(() => {
              setRecentAchievements(prev => prev.filter(a => a.key !== achievementKey));
            }, 5000);
          }
        });
      }
    });
  }, [players, recentAchievements]);

  const getRankIcon = (index: number): string => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getCardStyle = (index: number): string => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-500/15 to-orange-500/15 border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.25)]';
    if (index === 1) return 'bg-gradient-to-br from-gray-400/15 to-gray-500/15 border-gray-400/40 shadow-[0_0_15px_rgba(156,163,175,0.2)]';
    if (index === 2) return 'bg-gradient-to-br from-orange-500/15 to-orange-600/15 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
    return 'bg-white/90 dark:bg-slate-800/90 border-slate-300/50 dark:border-slate-600/50';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {t('hostView.liveResults') || 'Live Results'}
        </h2>
        <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
          <Clock className="w-5 h-5" />
          <span className="text-lg font-bold">{Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}</span>
        </div>
      </motion.div>

      {/* Achievement Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        <AnimatePresence>
          {recentAchievements.map((item) => (
            <motion.div
              key={item.key}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              <Card className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/40 backdrop-blur-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {item.player}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {item.achievement.name}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Live Leaderboard */}
      <div className="space-y-3">
        {sortedPlayers.map((player, index) => (
          <motion.div
            key={player.username}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={cn(
                "p-4 sm:p-5 border-2 backdrop-blur-xl transition-all duration-300 rounded-xl shadow-lg",
                getCardStyle(index)
              )}
              style={player.avatar?.color && index > 2 ? {
                background: `linear-gradient(135deg, ${player.avatar.color}20, ${player.avatar.color}40)`,
                borderColor: `${player.avatar.color}60`
              } : {}}
            >
              <div className="flex items-center justify-between">
                {/* Rank & Name */}
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold">
                    {getRankIcon(index)}
                  </div>
                  <Avatar
                    profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
                    avatarEmoji={player.avatar?.emoji}
                    avatarColor={player.avatar?.color}
                    size="lg"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {player.username}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Zap className="w-4 h-4" />
                      <span>{player.wordCount} {t('hostView.words') || 'words'}</span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div
                  className={cn(
                    "text-4xl font-black",
                    index === 0 && "text-yellow-500",
                    index === 1 && "text-gray-400",
                    index === 2 && "text-orange-500",
                    index > 2 && "text-slate-700 dark:text-slate-300"
                  )}
                >
                  {player.score}
                </div>
              </div>

              {/* Achievements Preview */}
              {player.achievements && player.achievements.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      {player.achievements.length} {t('hostView.achievements') || 'achievements'}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 backdrop-blur-sm">
          <p className="text-center text-sm text-slate-700 dark:text-slate-300">
            ℹ️ {t('hostView.spectatingInfo') || 'Spectating mode - watch the game unfold in real-time!'}
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default HostLiveResults;
