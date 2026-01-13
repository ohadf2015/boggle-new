'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Play, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyBuzzImages } from '@/hooks/useFeatureFlag';

interface BuzzReadyScreenProps {
  challengeData: {
    puzzleDate: string;
    trendingSummary: string;
    trendingTopics: Array<{
      query: string;
      volume?: number;
    }>;
    challenges: any[];
    imageUrl?: string;
  };
  hasPlayedToday: boolean;
  onStart: () => void;
  onBack: () => void;
}

/**
 * BuzzReadyScreen - Pre-game screen showing trending topics preview
 * Shows what's buzzing today without spoiling the puzzles
 */
export default function BuzzReadyScreen({
  challengeData,
  hasPlayedToday,
  onStart,
  onBack,
}: BuzzReadyScreenProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { enabled: showImages } = useDailyBuzzImages(user?.id);

  // Icon for Hebrew RTL: 🔥📰 (reversed)
  const icon = language === 'he' ? '🔥📰' : '📰🔥';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto"
    >
      {/* Back button */}
      <motion.div className="absolute top-24 sm:top-28 start-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
          {t('daily.home') || 'Home'}
        </Button>
      </motion.div>

      {/* Main content */}
      <div className="max-w-2xl w-full space-y-6">
        {/* Header with icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="text-center space-y-3"
        >
          <div className="text-7xl mb-2">{icon}</div>
          <h1 className="text-5xl font-neo-display font-black text-neo-yellow">
            {t('buzz.title') || 'Daily Buzz'}
          </h1>
          <p className="text-slate-400 text-lg">
            {t('buzz.subtitle') || "What's Buzzing Today?"}
          </p>
        </motion.div>

        {/* Hero Image (admin-only via feature flag) */}
        {challengeData.imageUrl && showImages && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative rounded-xl overflow-hidden border-4 border-neo-black shadow-hard-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={challengeData.imageUrl}
              alt={challengeData.trendingSummary}
              className="w-full h-64 object-cover"
            />
            {/* Beta badge for admin preview */}
            <div className="absolute top-3 end-3 px-3 py-1 bg-neo-pink/90 backdrop-blur-sm rounded-full border-2 border-neo-black">
              <span className="text-xs font-black text-neo-white">
                {t('buzz.betaPreview') || '✨ BETA'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Trending Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-neo-yellow" />
            <h2 className="font-bold text-neo-yellow uppercase tracking-wide">
              {t('buzz.preview.title') || "TODAY'S TOPICS"}
            </h2>
          </div>
          <p className="text-white text-lg font-medium leading-relaxed">
            {challengeData.trendingSummary}
          </p>
        </motion.div>

        {/* Trending Topics Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wide">
            {t('buzz.preview.subtitle') || 'Challenges feature...'}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {challengeData.trendingTopics.slice(0, 3).map((topic, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-lg border border-slate-700"
              >
                <div className="text-2xl">{getCategoryIcon(topic.query)}</div>
                <div className="flex-1">
                  <div className="font-bold text-white">{topic.query}</div>
                  {topic.volume && (
                    <div className="text-xs text-slate-400">
                      {formatVolume(topic.volume)}{' '}
                      {t('buzz.searches') || 'searches'}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Challenge Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="text-center p-4 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="text-3xl font-black text-neo-yellow">
              {challengeData.challenges.length}
            </div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {t('buzz.challenges') || 'Challenges'}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="text-3xl font-black text-neo-cyan">∞</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {t('buzz.noTimeLimit') || 'No Timer'}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="text-3xl font-black text-neo-lime">100</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {t('buzz.maxScore') || 'Max Score'}
            </div>
          </div>
        </motion.div>

        {/* Already Played Message */}
        {hasPlayedToday && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="px-4 py-3 bg-neo-cyan/10 border-2 border-neo-cyan rounded-lg text-center"
          >
            <p className="text-sm text-neo-cyan font-medium">
              {t('buzz.alreadyPlayed') || "You've already completed today's Buzz!"}
            </p>
          </motion.div>
        )}

        {/* Play Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Button
            onClick={onStart}
            disabled={hasPlayedToday}
            className="w-full py-6 text-xl font-black uppercase bg-neo-yellow text-neo-black border-4 border-neo-black rounded-xl shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-6 h-6 me-2" />
            {hasPlayedToday
              ? t('buzz.viewResults') || 'VIEW RESULTS'
              : t('buzz.preview.play') || 'START BUZZ'}
          </Button>
        </motion.div>

        {/* Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-xs text-slate-500 leading-relaxed"
        >
          {t('buzz.helpText') ||
            "Solve word challenges based on what's trending today. No time pressure!"}
        </motion.p>
      </div>
    </motion.div>
  );
}

// Helper: Get category icon for trending topic
function getCategoryIcon(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes('sport') || lower.includes('game') || lower.includes('champion')) {
    return '⚽';
  }
  if (lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('stock')) {
    return '💰';
  }
  if (lower.includes('movie') || lower.includes('music') || lower.includes('oscar')) {
    return '🎬';
  }
  if (lower.includes('weather') || lower.includes('storm') || lower.includes('hurricane')) {
    return '⛈️';
  }
  if (lower.includes('tech') || lower.includes('ai') || lower.includes('space')) {
    return '🚀';
  }
  if (lower.includes('politics') || lower.includes('election') || lower.includes('president')) {
    return '🏛️';
  }
  return '📰';
}

// Helper: Format search volume
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
}
