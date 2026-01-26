'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, ArrowLeft, Sparkles, FastForward, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
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
  onSkipAll: () => void;
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
  onSkipAll,
  onBack,
}: BuzzReadyScreenProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { enabled: showImages } = useDailyBuzzImages(user?.id);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const isRTL = language === 'he';

  // Extract unique trending topics from the actual challenges
  const challengeTrends = React.useMemo(() => {
    const trendSet = new Set<string>();
    challengeData.challenges.forEach(challenge => {
      if (challenge.trendTopic) {
        trendSet.add(challenge.trendTopic);
      }
    });
    return Array.from(trendSet).slice(0, 3);
  }, [challengeData.challenges]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-start p-4 pb-8 overflow-y-auto relative"
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 20px,
              currentColor 20px,
              currentColor 21px
            )`,
          }}
        />
      </div>

      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-2xl mb-4"
      >
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
          {t('daily.home')}
        </Button>
      </motion.div>

      {/* Main content */}
      <div className="max-w-2xl w-full space-y-5 relative z-10">
        {/* Breaking News Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="text-center"
        >
          {/* Breaking badge with pulse */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-pink opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-neo-pink" />
            </span>
            <span className="px-3 py-1 bg-neo-pink text-neo-black text-xs font-black uppercase tracking-widest border-2 border-neo-black shadow-hard-sm">
              {t('buzz.breaking')}
            </span>
          </motion.div>

          {/* Main title with dramatic entrance */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring' }}
            className="text-4xl sm:text-5xl md:text-6xl font-neo-display font-black text-neo-yellow leading-tight"
          >
            {t('buzz.title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-slate-400 text-base sm:text-lg mt-2 font-medium"
          >
            {t('buzz.subtitle')}
          </motion.p>
        </motion.div>

        {/* Hero Image - Full Size Display (admin-only via feature flag) */}
        {challengeData.imageUrl && showImages && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative w-full max-w-md mx-auto aspect-square rounded-neo-lg overflow-hidden border-4 border-neo-black shadow-hard-lg"
          >
            <Image
              src={challengeData.imageUrl}
              alt={challengeData.trendingSummary}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 448px"
              className="object-cover"
            />
            {/* Neo-brutalist corner accents */}
            <div className="absolute top-0 start-0 w-10 h-10 bg-neo-yellow border-e-3 border-b-3 border-neo-black" />
            <div className="absolute bottom-0 end-0 w-10 h-10 bg-neo-pink border-s-3 border-t-3 border-neo-black" />
            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-neo-navy/60 via-transparent to-transparent" />
            {/* Beta badge */}
            <div className="absolute top-3 end-3 px-3 py-1 bg-neo-pink/95 rounded-neo border-2 border-neo-black shadow-hard-sm">
              <span className="text-xs font-black text-neo-black">
                {t('buzz.betaPreview')}
              </span>
            </div>
          </motion.div>
        )}

        {/* Trending Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative bg-neo-navy-light rounded-neo-lg border-3 border-neo-black p-5 shadow-hard overflow-hidden"
        >
          {/* Decorative corner */}
          <div className="absolute top-0 end-0 w-16 h-16 bg-neo-cyan/10 -translate-y-1/2 translate-x-1/2 rotate-45" />

          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-neo-cyan/20 rounded-neo border-2 border-neo-cyan/40">
              <Sparkles className="w-4 h-4 text-neo-cyan" />
            </div>
            <h2 className="font-black text-neo-cyan uppercase tracking-wide text-sm">
              {t('buzz.preview.title')}
            </h2>
          </div>
          <p className="text-white text-lg font-medium leading-relaxed">
            {challengeData.trendingSummary}
          </p>
        </motion.div>

        {/* Trending Topics Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 text-sm text-slate-400 font-bold uppercase tracking-wide">
            <TrendingUp className="w-4 h-4" />
            {t('buzz.preview.subtitle')}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {challengeTrends.map((trendTopic, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.08, type: 'spring', stiffness: 200 }}
                className="group flex items-center gap-3 px-4 py-3 bg-slate-900/80 rounded-neo-lg border-2 border-slate-700 hover:border-neo-yellow/50 transition-colors"
              >
                {/* Topic icon with glow effect */}
                <div className="relative">
                  <div className="text-2xl transition-transform group-hover:scale-110">
                    {getCategoryIcon(trendTopic)}
                  </div>
                  <div className="absolute inset-0 bg-neo-yellow/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate group-hover:text-neo-yellow transition-colors">
                    {trendTopic}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t('buzz.challengeTrend')}
                  </div>
                </div>

                {/* Rank indicator */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                  <span className="text-xs font-black text-slate-400">#{i + 1}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Challenge Info Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-2"
        >
          {/* Static color classes for Tailwind to detect at compile time */}
          {[
            {
              value: challengeData.challenges.length,
              label: t('buzz.challenges'),
              colorClass: 'text-neo-yellow',
            },
            {
              value: '∞',
              label: t('buzz.noTimeLimit'),
              colorClass: 'text-neo-cyan',
            },
            {
              value: '100',
              label: t('buzz.maxScore'),
              colorClass: 'text-neo-lime',
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.65 + i * 0.05 }}
              className="text-center p-3 sm:p-4 bg-slate-900/60 rounded-neo-lg border-2 border-slate-700"
            >
              <div className={`text-2xl sm:text-3xl font-black ${stat.colorClass}`}>
                {stat.value}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Already Played Message */}
        {hasPlayedToday && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="px-4 py-3 bg-neo-cyan/10 border-3 border-neo-cyan rounded-neo-lg text-center"
          >
            <p className="text-sm text-neo-cyan font-bold">
              {t('buzz.alreadyPlayed')}
            </p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="space-y-3 pt-2"
        >
          {/* Primary CTA */}
          <Button
            onClick={onStart}
            disabled={hasPlayedToday}
            className="group relative w-full max-w-btn py-5 sm:py-6 text-lg sm:text-xl font-black uppercase bg-neo-yellow text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-hard-lg overflow-hidden"
          >
            {/* Animated shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <Play className="w-5 h-5 sm:w-6 sm:h-6 me-2" />
            {hasPlayedToday
              ? t('buzz.viewResults')
              : t('buzz.preview.play')}
          </Button>

          {/* Skip to Answers */}
          {!hasPlayedToday && (
            <Button
              onClick={() => setShowSkipConfirm(true)}
              variant="ghost"
              className="w-full max-w-btn py-3 text-sm font-bold text-slate-400 hover:text-neo-pink border-2 border-slate-700 hover:border-neo-pink/50 rounded-neo transition-all"
            >
              <FastForward className="w-4 h-4 me-2" />
              {t('buzz.skipToAnswers')}
            </Button>
          )}
        </motion.div>

        {/* Skip Confirmation Dialog */}
        <ConfirmationDialog
          open={showSkipConfirm}
          onOpenChange={setShowSkipConfirm}
          title={t('buzz.skipConfirmTitle')}
          description={t('buzz.skipConfirmMessage')}
          confirmText={t('buzz.skipConfirm')}
          cancelText={t('common.cancel')}
          onConfirm={onSkipAll}
          variant="warning"
        />

        {/* Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-xs text-slate-500 leading-relaxed pb-4"
        >
          {t('buzz.helpText')}
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
