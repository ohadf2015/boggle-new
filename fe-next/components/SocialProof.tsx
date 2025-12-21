'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers, FaFire, FaGamepad, FaTrophy } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSocket } from '@/utils/SocketContext';
import { cn } from '@/lib/utils';

interface SocialProofProps {
  className?: string;
  variant?: 'banner' | 'compact' | 'inline';
}

/**
 * SocialProof - Displays live player activity to create urgency and social validation
 * Shows: active players, games in progress, recent high scores
 */
const SocialProof: React.FC<SocialProofProps> = ({
  className,
  variant = 'banner',
}) => {
  const { t } = useLanguage();
  const { socket, isConnected } = useSocket();

  // Player activity stats (can be populated from backend)
  const [stats, setStats] = useState({
    playersOnline: 0,
    gamesActive: 0,
    recentHighScore: null as { username: string; score: number } | null,
  });

  // Listen for global stats updates from backend
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleGlobalStats = (data: {
      playersOnline?: number;
      gamesActive?: number;
      recentHighScore?: { username: string; score: number };
    }) => {
      setStats((prev) => ({
        playersOnline: data.playersOnline ?? prev.playersOnline,
        gamesActive: data.gamesActive ?? prev.gamesActive,
        recentHighScore: data.recentHighScore ?? prev.recentHighScore,
      }));
    };

    socket.on('globalStats', handleGlobalStats);

    // Request initial stats
    socket.emit('requestGlobalStats');

    return () => {
      socket.off('globalStats', handleGlobalStats);
    };
  }, [socket, isConnected]);

  // Show placeholder values when not connected (creates FOMO effect)
  const displayStats = {
    playersOnline: stats.playersOnline || Math.floor(Math.random() * 50) + 20,
    gamesActive: stats.gamesActive || Math.floor(Math.random() * 10) + 3,
    recentHighScore: stats.recentHighScore,
  };

  // Don't render if nothing to show
  if (!isConnected && variant === 'compact') {
    return null;
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5",
          "bg-neo-lime/20 border-2 border-neo-lime rounded-neo",
          "text-neo-lime font-bold text-sm",
          className
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-lime opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-neo-lime" />
        </span>
        <FaUsers className="w-3 h-3" />
        <span>{displayStats.playersOnline} {t('social.online') || 'online'}</span>
      </motion.div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-4 text-sm", className)}>
        <div className="flex items-center gap-1.5 text-neo-lime">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-lime opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neo-lime" />
          </span>
          <FaUsers className="w-3.5 h-3.5" />
          <span className="font-bold">{displayStats.playersOnline}</span>
        </div>
        <div className="flex items-center gap-1.5 text-neo-orange">
          <FaGamepad className="w-3.5 h-3.5" />
          <span className="font-bold">{displayStats.gamesActive}</span>
          <span className="text-neo-white/60">{t('social.games') || 'games'}</span>
        </div>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden",
        "bg-gradient-to-r from-neo-purple via-neo-purple-light to-neo-purple",
        "border-y-3 border-neo-black",
        className
      )}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle,_var(--neo-white)_1px,_transparent_1px)] bg-[size:20px_20px]" />
      </div>

      <div className="relative flex items-center justify-center gap-6 py-2 px-4">
        {/* Players Online */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="flex items-center gap-2"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-lime opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-neo-lime border border-neo-black" />
          </span>
          <FaUsers className="text-neo-yellow w-4 h-4" />
          <span className="font-black text-neo-white">
            {displayStats.playersOnline}
          </span>
          <span className="text-neo-white/80 font-bold text-sm hidden sm:inline">
            {t('social.playersOnline') || 'players online'}
          </span>
        </motion.div>

        {/* Separator */}
        <div className="w-1 h-4 bg-neo-white/20 rounded-full" />

        {/* Games in Progress */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="flex items-center gap-2"
        >
          <FaFire className="text-neo-orange w-4 h-4 animate-pulse" />
          <span className="font-black text-neo-white">
            {displayStats.gamesActive}
          </span>
          <span className="text-neo-white/80 font-bold text-sm hidden sm:inline">
            {t('social.gamesNow') || 'games happening now'}
          </span>
        </motion.div>

        {/* Recent High Score (if available) */}
        <AnimatePresence>
          {displayStats.recentHighScore && (
            <>
              <div className="w-1 h-4 bg-neo-white/20 rounded-full hidden md:block" />
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="hidden md:flex items-center gap-2"
              >
                <FaTrophy className="text-neo-yellow w-4 h-4" />
                <span className="text-neo-white/80 font-bold text-sm">
                  {t('social.newRecord') || 'New record:'}
                </span>
                <span className="font-black text-neo-yellow">
                  {displayStats.recentHighScore.score}
                </span>
                <span className="text-neo-white/60 text-sm">
                  by @{displayStats.recentHighScore.username}
                </span>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SocialProof;
