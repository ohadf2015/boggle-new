'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Trophy, Timer, Hourglass, Bell, Check, Loader2, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { hasPlayedToday } from '@/utils/dailyChallenge/storage';
import { getGuestFingerprint } from '@/utils/guestManager';
import { getSecondsUntilNextDaily, formatCountdown } from '@/utils/dailyChallenge';
import type { Language } from '@/types';
import { cn } from '@/lib/utils';

interface DailyChallengeLandingProps {
  onSelectWordHunt: () => void;
  onSelectBuzz: () => void;
  currentLanguage: Language;
}

interface ChallengeStatus {
  wordHunt: 'new' | 'done' | 'loading';
  buzz: 'new' | 'done' | 'loading' | 'unavailable';
}

interface BuzzPreviewData {
  imageUrl?: string;
  trendingSummary?: string;
  available?: boolean;
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
  const { user } = useAuth();
  const [status, setStatus] = useState<ChallengeStatus>({
    wordHunt: 'loading',
    buzz: 'loading',
  });
  const [buzzPreview, setBuzzPreview] = useState<BuzzPreviewData>({});
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [countdown, setCountdown] = useState<string>('');

  // Update countdown timer every second
  useEffect(() => {
    const updateCountdown = () => {
      const seconds = getSecondsUntilNextDaily();
      setCountdown(formatCountdown(seconds));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check completion status for both challenges and fetch buzz preview
  useEffect(() => {
    const checkStatus = async () => {
      const wordHuntPlayed = hasPlayedToday(currentLanguage);
      const today = new Date().toISOString().split('T')[0];

      // First check if buzz challenge is available for this language
      let buzzAvailable = true;
      try {
        const availabilityResponse = await fetch(
          `/api/buzz/check-availability/${currentLanguage}`
        );
        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json();
          buzzAvailable = availabilityData.available;
        }
      } catch (err) {
        console.error('Failed to check buzz availability:', err);
      }

      // If not available, set status and skip further checks
      if (!buzzAvailable) {
        setStatus({
          wordHunt: wordHuntPlayed ? 'done' : 'new',
          buzz: 'unavailable',
        });
        setBuzzPreview({ available: false });
        return;
      }

      let buzzPlayed = false;
      try {
        // Build query params for user identification
        const checkParams = new URLSearchParams();
        if (user?.id) {
          checkParams.set('player_id', user.id);
        } else {
          const fingerprint = getGuestFingerprint();
          if (fingerprint) {
            checkParams.set('guest_fingerprint', fingerprint);
          }
        }

        if (checkParams.toString()) {
          const response = await fetch(
            `/api/buzz/check-played/${today}/${currentLanguage}?${checkParams.toString()}`
          );
          if (response.ok) {
            const data = await response.json();
            buzzPlayed = data.data?.played || false;
          }
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
              available: true,
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
    // Reset request state when language changes
    setRequestState('idle');
  }, [currentLanguage, user?.id]);

  // Handle requesting a buzz challenge
  const handleRequestChallenge = async () => {
    if (requestState !== 'idle') return;

    setRequestState('loading');
    try {
      const response = await fetch('/api/buzz/request-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: currentLanguage,
          player_id: user?.id || null,
          guest_fingerprint: !user?.id ? getGuestFingerprint() : null,
        }),
      });

      if (response.ok) {
        setRequestState('sent');
      } else {
        setRequestState('idle');
        console.error('Failed to request challenge');
      }
    } catch (err) {
      setRequestState('idle');
      console.error('Error requesting challenge:', err);
    }
  };

  const bothCompleted = status.wordHunt === 'done' && status.buzz === 'done';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center px-3 py-4 sm:p-6 max-w-2xl mx-auto w-full"
    >
      {/* Urgency Countdown Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-3 sm:mb-4"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-neo-navy-light border-2 border-neo-lime/40 rounded-neo shadow-hard-sm">
          <Clock className="w-4 h-4 text-neo-lime animate-pulse" />
          <span className="text-xs sm:text-sm font-bold text-neo-lime/80">
            {t('daily.nextPuzzleIn')}:
          </span>
          <span className="text-sm sm:text-base font-black text-neo-lime tabular-nums min-w-[5em]">
            {countdown}
          </span>
        </div>
      </motion.div>

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
          tagline={status.buzz === 'unavailable'
            ? t('buzz.unavailableTagline') || 'Not available for this language yet'
            : t('buzz.tagline')
          }
          color="yellow"
          status={status.buzz}
          onPlay={onSelectBuzz}
          timeMode="relaxed"
          timeModeLabel={t('daily.takeYourTime')}
          badge={status.buzz !== 'unavailable' ? t('buzz.badge') : undefined}
          buttonText={
            status.buzz === 'done'
              ? t('daily.viewResults')
              : status.buzz === 'loading'
                ? t('common.loading')
                : status.buzz === 'unavailable'
                  ? t('buzz.requestChallenge') || 'Request Challenge'
                  : t('daily.play')
          }
          delay={0.2}
          previewImageUrl={buzzPreview.imageUrl}
          previewImageAlt={buzzPreview.trendingSummary}
          onRequestChallenge={handleRequestChallenge}
          requestState={requestState}
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
  status: 'new' | 'done' | 'loading' | 'unavailable';
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
  /** Handler for requesting a challenge when unavailable */
  onRequestChallenge?: () => void;
  /** State of the request (for UI feedback) */
  requestState?: 'idle' | 'loading' | 'sent';
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
  onRequestChallenge,
  requestState = 'idle',
}: CompactChallengeCardProps) {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);

  // Show image only if URL exists and hasn't errored
  const showImage = previewImageUrl && !imageError;
  const isUnavailable = status === 'unavailable';

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

  // Handle click based on status
  const handleClick = () => {
    if (isUnavailable && onRequestChallenge) {
      onRequestChallenge();
    } else if (!isUnavailable) {
      onPlay();
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={handleClick}
      disabled={status === 'loading' || requestState === 'loading'}
      className={cn(
        'relative w-full bg-slate-900/90 rounded-xl border-3 border-neo-black p-4 sm:p-5',
        'shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all duration-200',
        'flex flex-col items-center text-center cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        styles.glow,
        status === 'done' && 'opacity-80',
        isUnavailable && 'opacity-60'
      )}
    >
      {/* Status Badge - Top Right */}
      <div className="absolute top-2 end-2">
        {status === 'done' ? (
          <span className="text-xs font-bold bg-neo-lime/20 text-neo-lime px-2 py-0.5 rounded-full border border-neo-lime/40">
            ✓
          </span>
        ) : isUnavailable ? (
          <span className="text-xs font-bold bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full border border-slate-600/40">
            {t('buzz.notAvailable') || 'Not Available'}
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
        <div className="relative w-full aspect-square max-h-48 sm:max-h-56 rounded-xl overflow-hidden mb-3 border-3 border-neo-black shadow-hard">
          <Image
            src={previewImageUrl}
            alt={previewImageAlt || title}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
            onError={() => setImageError(true)}
            priority
          />
          {/* Neo-brutalist corner accents */}
          <div className="absolute top-0 start-0 w-6 h-6 bg-neo-yellow border-e-2 border-b-2 border-neo-black" />
          <div className="absolute bottom-0 end-0 w-6 h-6 bg-neo-pink border-s-2 border-t-2 border-neo-black" />
          {/* Subtle gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
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

      {/* Play/Request Button */}
      {isUnavailable ? (
        <div
          className={cn(
            'w-full py-2.5 sm:py-3 text-sm sm:text-base font-black uppercase rounded-lg',
            'flex items-center justify-center gap-2',
            requestState === 'sent'
              ? 'bg-neo-lime/20 text-neo-lime border-2 border-neo-lime'
              : 'bg-slate-700 text-slate-200 border-2 border-slate-600',
            'shadow-hard-sm transition-all'
          )}
        >
          {requestState === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('common.loading') || 'Loading...'}
            </>
          ) : requestState === 'sent' ? (
            <>
              <Check className="w-4 h-4" />
              {t('buzz.requestSent') || 'Request Sent!'}
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              {t('buzz.requestChallenge') || 'Request Challenge'}
            </>
          )}
        </div>
      ) : (
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
      )}
    </motion.button>
  );
}
