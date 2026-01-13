'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Timer, Hourglass } from 'lucide-react';
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

interface BuzzPreviewData {
  imageUrl?: string;
  trendingSummary?: string;
}

/**
 * DailyChallengeLanding - Compact dual challenge selection screen
 * Mobile-first design with clear differentiation between timed and relaxed modes
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
  const [buzzPreview, setBuzzPreview] = useState<BuzzPreviewData>({});

  // Check completion status for both challenges and fetch buzz preview
  useEffect(() => {
    const checkStatus = async () => {
      const wordHuntPlayed = hasPlayedToday(currentLanguage);
      const today = new Date().toISOString().split('T')[0];

      let buzzPlayed = false;
      try {
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

      // Fetch buzz preview data for image display
      try {
        const buzzResponse = await fetch(`/api/buzz/${today}/${currentLanguage}`);
        if (buzzResponse.ok) {
          const buzzData = await buzzResponse.json();
          if (buzzData.success && buzzData.data) {
            setBuzzPreview({
              imageUrl: buzzData.data.imageUrl,
              trendingSummary: buzzData.data.trendingSummary,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch buzz preview:', err);
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
        {/* Word Hunt Card - TIMED */}
        <CompactChallengeCard
          icon={<Timer className="w-8 h-8 sm:w-10 sm:h-10" />}
          title={t('daily.wordHunt.title')}
          tagline={t('daily.wordHunt.desc')}
          color="orange"
          status={status.wordHunt}
          onPlay={onSelectWordHunt}
          timeMode="timed"
          timeModeLabel={t('daily.timed90Seconds')}
          buttonText={
            status.wordHunt === 'done'
              ? t('daily.viewResults')
              : status.wordHunt === 'loading'
                ? t('common.loading')
                : t('daily.play')
          }
          delay={0.1}
        />

        {/* Daily Buzz Card - NO TIMER */}
        <CompactChallengeCard
          icon={<Hourglass className="w-8 h-8 sm:w-10 sm:h-10" />}
          title={t('buzz.title')}
          tagline={t('buzz.tagline')}
          color="yellow"
          status={status.buzz}
          onPlay={onSelectBuzz}
          timeMode="relaxed"
          timeModeLabel={t('daily.takeYourTime')}
          badge={t('buzz.badge')}
          buttonText={
            status.buzz === 'done'
              ? t('daily.viewResults')
              : status.buzz === 'loading'
                ? t('common.loading')
                : t('daily.play')
          }
          delay={0.2}
          previewImageUrl={buzzPreview.imageUrl}
          previewImageAlt={buzzPreview.trendingSummary}
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
              {t('achievement.dailyDouble.name')}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Compact Challenge Card Component
interface CompactChallengeCardProps {
  icon: ReactNode;
  title: string;
  tagline: string;
  color: 'orange' | 'yellow';
  status: 'new' | 'done' | 'loading';
  onPlay: () => void;
  buttonText: string;
  timeMode: 'timed' | 'relaxed';
  timeModeLabel: string;
  badge?: string;
  delay?: number;
  /** AI-generated preview image URL for visual appeal */
  previewImageUrl?: string;
  /** Alt text for the preview image */
  previewImageAlt?: string;
}

function CompactChallengeCard({
  icon,
  title,
  tagline,
  color,
  status,
  onPlay,
  buttonText,
  timeMode,
  timeModeLabel,
  badge,
  delay = 0,
  previewImageUrl,
  previewImageAlt,
}: CompactChallengeCardProps) {
  const [imageError, setImageError] = useState(false);

  // Show image only if URL exists and hasn't errored
  const showImage = previewImageUrl && !imageError;

  const colorStyles = {
    orange: {
      bg: 'bg-neo-orange',
      text: 'text-neo-orange',
      iconBg: 'bg-neo-orange/20',
      glow: 'hover:shadow-[0_0_20px_rgba(255,107,53,0.3)]',
    },
    yellow: {
      bg: 'bg-neo-yellow',
      text: 'text-neo-yellow',
      iconBg: 'bg-neo-yellow/20',
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
        'relative w-full bg-slate-900/90 rounded-xl border-3 border-neo-black p-4 sm:p-5',
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

      {/* Time Mode Badge - Prominent at top */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-3',
          'border-2 font-bold text-sm uppercase tracking-wide',
          timeMode === 'timed'
            ? 'bg-neo-orange/20 border-neo-orange text-neo-orange'
            : 'bg-neo-cyan/20 border-neo-cyan text-neo-cyan'
        )}
      >
        {timeMode === 'timed' ? (
          <Timer className="w-4 h-4" />
        ) : (
          <Hourglass className="w-4 h-4" />
        )}
        <span>{timeModeLabel}</span>
      </div>

      {/* Preview Image or Icon */}
      {showImage ? (
        <div className="relative w-full h-24 sm:h-32 rounded-lg overflow-hidden mb-3 border-2 border-neo-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImageUrl}
            alt={previewImageAlt || title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl mb-3',
            styles.iconBg,
            styles.text
          )}
        >
          {icon}
        </div>
      )}

      {/* Title */}
      <h2 className={cn('text-xl sm:text-2xl font-neo-display font-black mb-1', styles.text)}>
        {title}
      </h2>

      {/* Tagline */}
      <p className="text-xs sm:text-sm text-slate-400 mb-4 line-clamp-2 px-2">
        {tagline}
      </p>

      {/* Play Button */}
      <div
        className={cn(
          'w-full py-2.5 sm:py-3 text-sm sm:text-base font-black uppercase rounded-lg',
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
