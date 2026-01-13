'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { hasPlayedToday } from '@/utils/dailyChallenge/storage';
import type { Language } from '@/types';
import { cn } from '@/lib/utils';
import { useMascotImageAnimation, type MascotAnimationPreset } from '@/hooks/useMascotImageAnimation';

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
 * DailyChallengeLanding - Compact dual challenge selection screen
 * Mobile-first design with mascot images, no scrolling required
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

  // Check completion status for both challenges
  useEffect(() => {
    const checkStatus = async () => {
      const wordHuntPlayed = hasPlayedToday(currentLanguage);

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

  const bothCompleted = status.wordHunt === 'done' && status.buzz === 'done';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center px-3 py-4 sm:p-6 max-w-2xl mx-auto w-full"
    >
      {/* Compact Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 sm:mb-6"
      >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-display font-black text-neo-lime">
          {t('daily.chooseQuest')}
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mt-1">
          {t('daily.chooseChallengeHint')}
        </p>
      </motion.div>

      {/* Challenge Cards - Compact Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
        {/* Word Hunt Card */}
        <CompactChallengeCard
          mascotSrc="/mascot/lexi-word-hunt.png"
          mascotAlt="Lexi running with stopwatch"
          title={t('daily.wordHunt')}
          subtitle={t('daily.wordHunt.subtitle')}
          tagline={t('daily.wordHunt.desc')}
          color="orange"
          status={status.wordHunt}
          onPlay={onSelectWordHunt}
          buttonText={
            status.wordHunt === 'done'
              ? t('daily.viewResults')
              : status.wordHunt === 'loading'
                ? t('common.loading')
                : t('daily.play')
          }
          delay={0.1}
          initialAnimation="bounce"
          animationCycle={['bounce', 'hop', 'float', 'pulse', 'sway']}
        />

        {/* Daily Buzz Card */}
        <CompactChallengeCard
          mascotSrc="/mascot/lexi-daily-buzz.png"
          mascotAlt="Lexi showing trending news"
          title={t('buzz.title')}
          subtitle={t('buzz.subtitle')}
          tagline={t('buzz.tagline')}
          color="yellow"
          status={status.buzz}
          onPlay={onSelectBuzz}
          badge={t('buzz.badge')}
          buttonText={
            status.buzz === 'done'
              ? t('daily.viewResults')
              : status.buzz === 'loading'
                ? t('common.loading')
                : t('daily.play')
          }
          delay={0.2}
          initialAnimation="wiggle"
          animationCycle={['wiggle', 'dance', 'nod', 'pulse', 'sway']}
        />
      </div>

      {/* Daily Double Achievement - Compact */}
      {bothCompleted && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
          className="mt-4 px-4 py-2 bg-neo-lime/10 border-2 border-neo-lime rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neo-lime" />
            <span className="font-black text-neo-lime text-sm">
              {t('achievement.dailyDouble')}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Compact Challenge Card Component
interface CompactChallengeCardProps {
  mascotSrc: string;
  mascotAlt: string;
  title: string;
  subtitle: string;
  tagline: string;
  color: 'orange' | 'yellow';
  status: 'new' | 'done' | 'loading';
  onPlay: () => void;
  buttonText: string;
  badge?: string;
  delay?: number;
  /** Initial animation preset for variety */
  initialAnimation?: MascotAnimationPreset;
  /** Animation presets to cycle through */
  animationCycle?: MascotAnimationPreset[];
}

function CompactChallengeCard({
  mascotSrc,
  mascotAlt,
  title,
  subtitle,
  tagline,
  color,
  status,
  onPlay,
  buttonText,
  badge,
  delay = 0,
  initialAnimation = 'bounce',
  animationCycle = ['bounce', 'wiggle', 'float', 'pulse', 'sway', 'hop', 'dance', 'nod'],
}: CompactChallengeCardProps) {
  const { animate, transition } = useMascotImageAnimation({
    initialPreset: initialAnimation,
    presets: animationCycle,
    minInterval: 6000,
    maxInterval: 12000,
  });

  const colorStyles = {
    orange: {
      bg: 'bg-neo-orange',
      text: 'text-neo-orange',
      border: 'border-neo-orange/30',
      glow: 'hover:shadow-[0_0_20px_rgba(255,107,53,0.3)]',
    },
    yellow: {
      bg: 'bg-neo-yellow',
      text: 'text-neo-yellow',
      border: 'border-neo-yellow/30',
      glow: 'hover:shadow-[0_0_20px_rgba(255,225,53,0.3)]',
    },
  };

  const styles = colorStyles[color];

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onPlay}
      disabled={status === 'loading'}
      className={cn(
        'relative w-full bg-slate-900/90 rounded-xl border-3 border-neo-black p-3 sm:p-4',
        'shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all duration-200',
        'flex flex-col items-center text-center cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        styles.glow,
        status === 'done' && 'opacity-80'
      )}
    >
      {/* Status Badge - Top Right */}
      <div className="absolute top-2 end-2">
        {status === 'done' ? (
          <span className="text-xs font-bold bg-neo-lime/20 text-neo-lime px-2 py-0.5 rounded-full border border-neo-lime/40">
            ✓
          </span>
        ) : badge ? (
          <span className="text-xs font-bold bg-neo-pink/20 text-neo-pink px-2 py-0.5 rounded-full border border-neo-pink/30">
            {badge}
          </span>
        ) : null}
      </div>

      {/* Mascot Image with Cycling Animations */}
      <motion.div
        className="relative w-20 h-20 sm:w-24 sm:h-24 mb-2"
        animate={animate}
        transition={transition}
      >
        <Image
          src={mascotSrc}
          alt={mascotAlt}
          fill
          className="object-contain"
          priority
        />
      </motion.div>

      {/* Title & Subtitle */}
      <h2 className={cn('text-xl sm:text-2xl font-neo-display font-black', styles.text)}>
        {title}
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 font-medium mb-1">
        {subtitle}
      </p>

      {/* Tagline - Single line */}
      <p className="text-xs text-slate-500 mb-3 line-clamp-2 px-2">
        {tagline}
      </p>

      {/* Play Button */}
      <div
        className={cn(
          'w-full py-2 sm:py-2.5 text-sm sm:text-base font-black uppercase rounded-lg',
          styles.bg,
          'text-neo-black border-2 border-neo-black shadow-hard-sm',
          'group-hover:shadow-hard transition-all'
        )}
      >
        {buttonText}
      </div>
    </motion.button>
  );
}
