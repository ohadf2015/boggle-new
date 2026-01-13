'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Newspaper, Clock, Zap, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { hasPlayedToday } from '@/utils/dailyChallenge/storage';
import type { Language } from '@/types';
import { cn } from '@/lib/utils';

interface DailyChallengeLandingProps {
  onSelectWordHunt: () => void;
  onSelectBuzz: () => void;
  currentLanguage: Language;
}

interface ChallengeStatus {
  wordHunt: 'new' | 'done' | 'loading';
  buzz: 'new' | 'done' | 'loading';
}

/**
 * DailyChallengeLanding - Dual challenge selection screen
 * Shows Word Hunt Survival (time-pressured) and Daily Buzz (untimed trend-based)
 */
export function DailyChallengeLanding({
  onSelectWordHunt,
  onSelectBuzz,
  currentLanguage,
}: DailyChallengeLandingProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ChallengeStatus>({
    wordHunt: 'loading',
    buzz: 'loading',
  });
  const [wordHuntStreak, setWordHuntStreak] = useState(0);
  const [buzzStreak, setBuzzStreak] = useState(0);

  // Check completion status for both challenges
  useEffect(() => {
    const checkStatus = async () => {
      // Check Word Hunt status
      const wordHuntPlayed = hasPlayedToday(currentLanguage);

      // Check Buzz status (from API)
      let buzzPlayed = false;
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(
          `/api/buzz/check-played/${today}/${currentLanguage}`
        );
        if (response.ok) {
          const data = await response.json();
          buzzPlayed = data.played || false;
        }
      } catch (err) {
        console.error('Failed to check buzz status:', err);
      }

      setStatus({
        wordHunt: wordHuntPlayed ? 'done' : 'new',
        buzz: buzzPlayed ? 'done' : 'new',
      });
    };

    checkStatus();
  }, [currentLanguage]);

  // Fetch streaks (mock for now - integrate with backend later)
  useEffect(() => {
    // TODO: Fetch actual streaks from backend
    setWordHuntStreak(0);
    setBuzzStreak(0);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col items-center justify-center p-4 space-y-8 max-w-6xl mx-auto"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center space-y-2"
      >
        <h1 className="text-4xl md:text-5xl font-neo-display font-black text-neo-lime">
          {t('daily.chooseQuest') || 'Choose Your Daily Quest'}
        </h1>
        <p className="text-slate-400 text-lg">
          {t('daily.chooseChallengeHint') ||
            'Pick your challenge for today. Complete both for bonus XP!'}
        </p>
      </motion.div>

      {/* Challenge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Word Hunt Survival Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ChallengeCard
            icon={<Flame className="w-12 h-12" />}
            title={t('daily.wordHunt') || 'Word Hunt'}
            subtitle={t('daily.wordHunt.subtitle') || 'Survival Mode'}
            description={
              t('daily.wordHunt.desc') ||
              'Time-pressured word finding. Find as many words as you can before time runs out!'
            }
            color="neo-orange"
            status={status.wordHunt}
            streak={wordHuntStreak}
            features={[
              {
                icon: <Clock className="w-4 h-4" />,
                text: t('daily.wordHunt.feature1') || '90 seconds',
              },
              {
                icon: <Zap className="w-4 h-4" />,
                text: t('daily.wordHunt.feature2') || 'Combo system',
              },
              {
                icon: <Trophy className="w-4 h-4" />,
                text: t('daily.wordHunt.feature3') || 'Global leaderboard',
              },
            ]}
            onPlay={onSelectWordHunt}
            t={t}
          />
        </motion.div>

        {/* Daily Buzz Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ChallengeCard
            icon={<Newspaper className="w-12 h-12" />}
            title={t('buzz.title') || 'Daily Buzz'}
            subtitle={t('buzz.subtitle') || "What's Buzzing?"}
            description={
              t('buzz.tagline') ||
              "Word challenges from today's trends. No time pressure, just stay current!"
            }
            color="neo-yellow"
            status={status.buzz}
            streak={buzzStreak}
            badge={
              <span className="text-xs font-bold bg-neo-pink/20 text-neo-pink px-2 py-0.5 rounded-full border border-neo-pink/30">
                {t('buzz.badge') || '🔥 NEW'}
              </span>
            }
            features={[
              {
                icon: <span className="text-lg">📰</span>,
                text: t('buzz.feature1') || 'Real trending topics',
              },
              {
                icon: <span className="text-lg">🧩</span>,
                text: t('buzz.feature2') || '5-7 mini challenges',
              },
              {
                icon: <span className="text-lg">🌍</span>,
                text: t('buzz.feature3') || 'Localized content',
              },
            ]}
            onPlay={onSelectBuzz}
            t={t}
          />
        </motion.div>
      </div>

      {/* Dual Streak Banner */}
      {(wordHuntStreak > 0 || buzzStreak > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-6 px-6 py-3 bg-slate-800/50 rounded-xl border border-slate-700"
        >
          {wordHuntStreak > 0 && (
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-neo-orange" />
              <span className="font-bold text-neo-orange">
                {wordHuntStreak} {t('daily.dayStreak') || 'day streak'}
              </span>
            </div>
          )}
          {buzzStreak > 0 && (
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-neo-yellow" />
              <span className="font-bold text-neo-yellow">
                {buzzStreak} {t('daily.dayStreak') || 'day streak'}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Achievement: Daily Double */}
      {status.wordHunt === 'done' && status.buzz === 'done' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.5 }}
          className="px-6 py-3 bg-neo-lime/10 border-2 border-neo-lime rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-neo-lime" />
            <div>
              <div className="font-black text-neo-lime">
                {t('achievement.dailyDouble') || '🏆 DAILY DOUBLE'}
              </div>
              <div className="text-xs text-slate-400">
                {t('achievement.dailyDouble.desc') ||
                  'Completed both daily challenges!'}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ChallengeCard component
interface ChallengeCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  color: 'neo-orange' | 'neo-yellow';
  status: 'new' | 'done' | 'loading';
  streak: number;
  features: Array<{ icon: React.ReactNode; text: string }>;
  onPlay: () => void;
  badge?: React.ReactNode;
  t: (key: string) => string;
}

function ChallengeCard({
  icon,
  title,
  subtitle,
  description,
  color,
  status,
  streak,
  features,
  onPlay,
  badge,
  t,
}: ChallengeCardProps) {
  const colorClasses = {
    'neo-orange': {
      bg: 'bg-neo-orange',
      text: 'text-neo-orange',
      border: 'border-neo-orange',
      glow: 'shadow-[0_0_30px_rgba(255,107,53,0.3)]',
    },
    'neo-yellow': {
      bg: 'bg-neo-yellow',
      text: 'text-neo-yellow',
      border: 'border-neo-yellow',
      glow: 'shadow-[0_0_30px_rgba(255,225,53,0.3)]',
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      className={cn(
        'relative h-full bg-slate-900/90 rounded-xl border-4 border-neo-black p-6 shadow-hard-lg',
        'hover:shadow-hard-xl hover:-translate-y-1 transition-all duration-200',
        status === 'done' && 'opacity-75'
      )}
    >
      {/* Status Badge */}
      <div className="absolute top-4 end-4">
        {status === 'done' ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-neo-lime/20 rounded-full border border-neo-lime/40">
            <span className="text-xs font-bold text-neo-lime">
              ✓ {t('daily.completed') || 'DONE'}
            </span>
          </div>
        ) : status === 'new' ? (
          badge || (
            <div className="flex items-center gap-1 px-2 py-1 bg-neo-cyan/20 rounded-full border border-neo-cyan/40">
              <span className="text-xs font-bold text-neo-cyan">
                {t('daily.new') || 'NEW'}
              </span>
            </div>
          )
        ) : null}
      </div>

      {/* Icon with glow */}
      <div className={cn('inline-flex p-4 rounded-xl mb-4', colors.bg, colors.glow)}>
        <div className="text-neo-black">{icon}</div>
      </div>

      {/* Title */}
      <div className="space-y-1 mb-3">
        <h2 className={cn('text-3xl font-neo-display font-black', colors.text)}>
          {title}
        </h2>
        <p className="text-sm text-slate-400 font-medium">{subtitle}</p>
      </div>

      {/* Description */}
      <p className="text-slate-300 text-sm mb-4 leading-relaxed">{description}</p>

      {/* Features */}
      <div className="space-y-2 mb-6">
        {features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
            <span className={colors.text}>{feature.icon}</span>
            <span>{feature.text}</span>
          </div>
        ))}
      </div>

      {/* Play Button */}
      <Button
        onClick={onPlay}
        disabled={status === 'loading'}
        className={cn(
          'w-full py-6 text-lg font-black uppercase',
          colors.bg,
          'text-neo-black border-3 border-neo-black rounded-xl shadow-hard',
          'hover:shadow-hard-lg hover:-translate-y-1 transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {status === 'done'
          ? t('daily.viewResults') || 'VIEW RESULTS'
          : status === 'loading'
            ? t('common.loading') || 'LOADING...'
            : t('daily.play') || 'PLAY NOW'}
      </Button>

      {/* Streak indicator */}
      {streak > 0 && (
        <div className="mt-3 text-center">
          <span className={cn('text-xs font-bold', colors.text)}>
            🔥 {streak} {t('daily.dayStreak') || 'day streak'}
          </span>
        </div>
      )}
    </div>
  );
}
