'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Trophy, Timer, Hourglass, Bell, Check, Loader2, X, Frown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getWordHuntStatusToday } from '@/utils/dailyChallenge/storage';
import { getGuestFingerprint } from '@/utils/guestManager';
import { useTiltEffect } from '@/hooks/useTiltEffect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import type { Language } from '@/types';
import { cn } from '@/lib/utils';

interface DailyChallengeLandingProps {
  onSelectWordHunt: () => void;
  onSelectBuzz: () => void;
  onShowBuzzHistory?: () => void;
  currentLanguage: Language;
}

interface ChallengeStatus {
  wordHunt: 'new' | 'won' | 'lost';
  buzz: 'new' | 'won' | 'lost' | 'unavailable';
}

// Separate loading states for status checks (shouldn't block card rendering)
interface LoadingState {
  wordHunt: boolean;
  buzz: boolean;
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
  onShowBuzzHistory,
  currentLanguage,
}: DailyChallengeLandingProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const pathname = usePathname();
  // Status is set once API calls complete - cards render immediately without waiting
  const [status, setStatus] = useState<ChallengeStatus>({
    wordHunt: 'new',
    buzz: 'new',
  });
  // Separate loading state for status checks - only affects status badge, not whole card
  const [loadingStatus, setLoadingStatus] = useState<LoadingState>({
    wordHunt: true,
    buzz: true,
  });
  const [buzzPreview, setBuzzPreview] = useState<BuzzPreviewData>({});
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'sent'>('idle');

  // Word Hunt status check - synchronous local storage check with win/loss
  const checkWordHunt = () => {
    const wordHuntStatus = getWordHuntStatusToday(currentLanguage);
    if (!wordHuntStatus) {
      setStatus(prev => ({ ...prev, wordHunt: 'new' }));
    } else {
      setStatus(prev => ({
        ...prev,
        wordHunt: wordHuntStatus.solved ? 'won' : 'lost'
      }));
    }
    setLoadingStatus(prev => ({ ...prev, wordHunt: false }));
  };

  // Buzz status check - async API calls
  const checkBuzzStatus = async () => {
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
      setStatus(prev => ({ ...prev, buzz: 'unavailable' }));
      setBuzzPreview({ available: false });
      setLoadingStatus(prev => ({ ...prev, buzz: false }));
      return;
    }

    let buzzPlayed = false;
    let buzzCompleted = false;
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
          buzzCompleted = data.data?.completed || false;
        }
      }
    } catch (err) {
      console.error('Failed to check buzz status:', err);
    }

    // Fetch buzz preview data for image display (separate from status)
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

    // Set buzz status based on played and completed flags
    if (!buzzPlayed) {
      setStatus(prev => ({ ...prev, buzz: 'new' }));
    } else {
      setStatus(prev => ({
        ...prev,
        buzz: buzzCompleted ? 'won' : 'lost'
      }));
    }
    setLoadingStatus(prev => ({ ...prev, buzz: false }));
  };

  // Check completion status for both challenges and fetch buzz preview
  // Status checks happen in the background - cards render immediately
  useEffect(() => {
    // Reset loading states when language changes
    setLoadingStatus({ wordHunt: true, buzz: true });

    // Check Word Hunt immediately (local storage is sync)
    checkWordHunt();
    // Check Buzz status in background
    checkBuzzStatus();
    // Reset request state when language changes
    setRequestState('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh status when page becomes visible (user returns from playing)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-check status when returning to page
        checkWordHunt();
        checkBuzzStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh status when user navigates back (browser back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      // Re-check status when user navigates back to this page
      checkWordHunt();
      checkBuzzStatus();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh status when pathname changes (Next.js router.push navigation)
  // This handles the case where user completes challenge and navigates back via router.push()
  // which doesn't fire popstate event but does change the pathname
  useEffect(() => {
    // Only refresh if we're actually on the daily challenges page
    if (pathname && pathname.endsWith('/daily')) {
      checkWordHunt();
      checkBuzzStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

  // "Daily Double" badge only shows if BOTH challenges were won
  const bothWon = status.wordHunt === 'won' && status.buzz === 'won';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center px-2 py-2 sm:px-4 sm:py-4 max-w-2xl mx-auto w-full"
    >
      {/* Enhanced Header with gradient - more compact on mobile */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-3 sm:mb-6"
      >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-neo-display font-black bg-gradient-to-r from-neo-lime via-neo-cyan to-neo-lime bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-flow_4s_ease_infinite]">
          {t('daily.chooseQuest')}
        </h1>
      </motion.div>

      {/* Challenge Cards - Premium Grid - tighter on mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full"
      >
        {/* Word Hunt Card - TIMED */}
        <CompactChallengeCard
          challengeId="wordHunt"
          icon={<Timer className="w-7 h-7 sm:w-10 sm:h-10" />}
          title={t('daily.wordHunt.title')}
          tagline={t('daily.wordHunt.desc')}
          details={t('daily.wordHunt.details')}
          color="orange"
          status={status.wordHunt}
          isLoadingStatus={loadingStatus.wordHunt}
          onPlay={onSelectWordHunt}
          timeMode="timed"
          timeModeLabel={t('daily.timed90Seconds')}
          customPreview="word-hunt-grid"
          currentLanguage={currentLanguage}
          buttonText={
            (status.wordHunt === 'won' || status.wordHunt === 'lost')
              ? t('daily.viewResults')
              : t('daily.play')
          }
          delay={0.2}
        />

        {/* Daily Buzz Card - NO TIMER */}
        <CompactChallengeCard
          challengeId="buzz"
          icon={<Hourglass className="w-8 h-8 sm:w-10 sm:h-10" />}
          title={t('buzz.title')}
          tagline={status.buzz === 'unavailable'
            ? t('buzz.unavailableTagline')
            : t('buzz.tagline')
          }
          details={status.buzz !== 'unavailable' ? t('buzz.details') : undefined}
          color="yellow"
          status={status.buzz}
          isLoadingStatus={loadingStatus.buzz}
          onPlay={onSelectBuzz}
          timeMode="relaxed"
          timeModeLabel={t('daily.takeYourTime')}
          badge={status.buzz !== 'unavailable' ? t('buzz.badge') : undefined}
          buttonText={
            (status.buzz === 'won' || status.buzz === 'lost')
              ? t('daily.viewResults')
              : status.buzz === 'unavailable'
                ? t('buzz.requestChallenge')
                : t('daily.play')
          }
          delay={0.3}
          previewImageUrl={buzzPreview.imageUrl}
          previewImageAlt={buzzPreview.trendingSummary}
          onRequestChallenge={handleRequestChallenge}
          requestState={requestState}
        />
      </motion.div>

      {/* Browse Past Buzz Challenges */}
      {onShowBuzzHistory && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          onClick={onShowBuzzHistory}
          className="mt-4 text-sm text-slate-400 hover:text-neo-pink transition-colors underline underline-offset-4 decoration-slate-600 hover:decoration-neo-pink"
        >
          {t('buzz.history.browse')}
        </motion.button>
      )}

      {/* Daily Double Achievement - Premium Badge */}
      {bothWon && (
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.4 }}
          className="mt-5 relative"
        >
          {/* Glow effect */}
          <motion.div
            className="absolute -inset-2 rounded-2xl blur-lg -z-10"
            animate={{
              opacity: [0.4, 0.7, 0.4],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: 'radial-gradient(circle, rgba(191,255,0,0.4) 0%, transparent 70%)' }}
          />
          <div className="px-5 py-3 bg-neo-navy-light/90 backdrop-blur-sm border-3 border-neo-lime rounded-xl shadow-hard">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Trophy className="w-6 h-6 text-neo-lime drop-shadow-[0_0_8px_rgba(191,255,0,0.6)]" />
              </motion.div>
              <span className="font-black text-neo-lime text-base tracking-wide uppercase">
                {t('achievement.dailyDouble.name')}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Language-specific preview letters for Word Hunt mini grid
// Each forms a meaningful word path when swiped in the preview
const PREVIEW_LETTERS_BY_LANG: Record<Language, string[]> = {
  en: ['W', 'O', 'R', 'D', 'H', 'U', 'N', 'T', '!'], // WORD swipe
  he: ['מ', 'י', 'ל', 'ה', 'ש', 'ח', 'ק', '!', '★'], // מילה (word) swipe
  sv: ['O', 'R', 'D', 'J', 'A', 'K', 'T', '!', '★'], // ORD (word) swipe
  ja: ['言', '葉', '探', '索', 'ゲ', 'ー', 'ム', '!', '★'], // 言葉 (word) swipe
  es: ['P', 'A', 'L', 'A', 'B', 'R', 'A', 'S', '!'], // PALA swipe (from PALABRAS)
  fr: ['M', 'O', 'T', 'S', 'J', 'E', 'U', '!', '★'], // MOTS (words) swipe
  de: ['W', 'O', 'R', 'T', 'S', 'P', 'I', 'E', 'L'], // WORT (word) swipe
};
const HIGHLIGHT_PATH = [0, 1, 2, 3]; // First 4 letters form the word

function WordHuntMiniGrid({ isHovered, language }: { isHovered: boolean; language: Language }) {
  const letters = PREVIEW_LETTERS_BY_LANG[language] || PREVIEW_LETTERS_BY_LANG.en;

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border-3 border-neo-black shadow-hard bg-neo-cream">
      {/* Animated swipe line - renders BEHIND the grid (z-0) */}
      {isHovered && (
        <svg
          className="absolute inset-1.5 sm:inset-2 w-[calc(100%-12px)] sm:w-[calc(100%-16px)] h-[calc(100%-12px)] sm:h-[calc(100%-16px)] pointer-events-none z-0"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Path connects centers of tiles: (17,17) → (50,17) → (83,17) → (83,50) */}
          <motion.path
            d="M 17,17 L 50,17 L 83,17 L 83,50"
            fill="none"
            stroke="rgba(255,107,53,0.9)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </svg>
      )}

      {/* Grid container - renders ON TOP of the swipe line (z-10) */}
      <div className="absolute inset-1.5 sm:inset-2 grid grid-cols-3 gap-1 sm:gap-1.5 z-10">
        {letters.map((letter, idx) => {
          const isInPath = HIGHLIGHT_PATH.includes(idx);
          const pathIndex = HIGHLIGHT_PATH.indexOf(idx);

          return (
            <motion.div
              key={idx}
              className={cn(
                'flex items-center justify-center rounded-md sm:rounded-lg border-2 border-neo-black/30 font-neo-display font-black',
                'text-sm sm:text-xl shadow-sm transition-colors duration-200',
                isInPath && isHovered
                  ? 'bg-neo-orange text-neo-black border-neo-orange'
                  : 'letter-tile-gradient text-neo-black'
              )}
              initial={false}
              animate={
                isInPath && isHovered
                  ? {
                      scale: [1, 1.1, 1],
                      transition: { delay: pathIndex * 0.1, duration: 0.3 },
                    }
                  : { scale: 1 }
              }
            >
              {letter}
            </motion.div>
          );
        })}
      </div>

      {/* Neo-brutalist corner accents - highest z-index */}
      <div className="absolute top-0 start-0 w-5 h-5 sm:w-6 sm:h-6 bg-neo-orange border-e-2 border-b-2 border-neo-black z-20" />
      <div className="absolute bottom-0 end-0 w-5 h-5 sm:w-6 sm:h-6 bg-neo-yellow border-s-2 border-t-2 border-neo-black z-20" />
    </div>
  );
}

// Compact Challenge Card Component
interface CompactChallengeCardProps {
  /** Unique identifier for the challenge (used for test IDs) */
  challengeId: 'wordHunt' | 'buzz';
  icon: ReactNode;
  title: string;
  tagline: string;
  /** Additional details text to clarify what the challenge is about */
  details?: string;
  color: 'orange' | 'yellow';
  status: 'new' | 'won' | 'lost' | 'unavailable';
  /** Whether status is still being determined (only affects status badge) */
  isLoadingStatus?: boolean;
  onPlay: () => void;
  buttonText: string;
  timeMode: 'timed' | 'relaxed';
  timeModeLabel: string;
  badge?: string;
  delay?: number;
  /** Custom preview element (e.g., mini letter grid) */
  customPreview?: 'word-hunt-grid';
  /** Current language for language-aware previews */
  currentLanguage?: Language;
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
  challengeId,
  icon,
  title,
  tagline,
  details,
  color,
  status,
  isLoadingStatus = false,
  onPlay,
  buttonText,
  timeMode,
  timeModeLabel,
  badge,
  delay = 0,
  customPreview,
  currentLanguage = 'en',
  previewImageUrl,
  previewImageAlt,
  onRequestChallenge,
  requestState = 'idle',
}: CompactChallengeCardProps) {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  // 3D tilt effect for premium game feel
  const { ref, style: tiltStyle, handlers: tiltHandlers } = useTiltEffect<HTMLDivElement>({
    maxTilt: 12,
    hoverScale: 1.04,
    perspective: 800,
  });

  // Combined hover handlers
  const handleMouseEnter = () => {
    setIsHovered(true);
    tiltHandlers.onMouseEnter();
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
    tiltHandlers.onMouseLeave();
  };

  // Show image only if URL exists and hasn't errored
  const showImage = previewImageUrl && !imageError;
  const isUnavailable = status === 'unavailable';

  // Memoize image element to prevent flashing on parent re-renders
  const imageElement = useMemo(() => {
    if (!showImage) return null;

    return (
      <div
        key={previewImageUrl}
        className="relative w-full h-full rounded-xl overflow-hidden border-3 border-neo-black shadow-hard"
      >
        <Image
          src={previewImageUrl}
          alt={previewImageAlt || title}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover"
          onError={() => setImageError(true)}
          priority
          unoptimized
        />
        {/* Neo-brutalist corner accents */}
        <div className="absolute top-0 start-0 w-5 h-5 sm:w-6 sm:h-6 bg-neo-cyan border-e-2 border-b-2 border-neo-black" />
        <div className="absolute bottom-0 end-0 w-5 h-5 sm:w-6 sm:h-6 bg-neo-pink border-s-2 border-t-2 border-neo-black" />
        {/* Subtle gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
      </div>
    );
  }, [previewImageUrl, previewImageAlt, title, showImage]);

  const colorStyles = {
    orange: {
      bg: 'bg-neo-orange',
      text: 'text-neo-orange',
      iconBg: 'bg-neo-orange/20',
      glowColor: 'rgba(255, 107, 53, 0.4)',
      borderGlow: 'neo-orange',
    },
    yellow: {
      bg: 'bg-neo-cyan',
      text: 'text-neo-cyan',
      iconBg: 'bg-neo-cyan/20',
      glowColor: 'rgba(0, 255, 255, 0.4)',
      borderGlow: 'neo-cyan',
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

  const showEffects = enableComplexAnimations && !prefersReducedMotion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      className="relative"
    >
      {/* Animated glow effect for new challenges */}
      {status === 'new' && showEffects && (
        <motion.div
          className="absolute -inset-1 rounded-2xl opacity-60 blur-md -z-10"
          animate={{
            boxShadow: [
              `0 0 20px ${styles.glowColor}`,
              `0 0 40px ${styles.glowColor}`,
              `0 0 20px ${styles.glowColor}`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: `linear-gradient(135deg, ${styles.glowColor}, transparent)` }}
        />
      )}

      <div
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={tiltHandlers.onMouseMove}
        onTouchStart={tiltHandlers.onTouchStart}
        onTouchMove={tiltHandlers.onTouchMove}
        onTouchEnd={tiltHandlers.onTouchEnd}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={cn(
          'relative w-full min-h-[420px] sm:min-h-[480px] bg-slate-900/95 rounded-xl border-3 border-neo-black p-3 sm:p-4',
          'shadow-hard transition-shadow duration-200',
          'flex flex-col items-center text-center cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime',
          requestState === 'loading' && 'opacity-50 cursor-not-allowed',
          (status === 'won' || status === 'lost') && 'opacity-85',
          isUnavailable && 'opacity-60'
        )}
        style={{
          ...tiltStyle,
          boxShadow: isHovered && !isUnavailable
            ? `0 0 30px ${styles.glowColor}, 6px 6px 0px black`
            : undefined,
        }}
      >
        {/* Decorative corner accents */}
        {showEffects && (
          <>
            <motion.div
              className="absolute top-0 end-0 w-12 h-12 pointer-events-none overflow-hidden rounded-tr-xl"
              animate={isHovered ? { scale: 1.2, opacity: 0.15 } : { scale: 1, opacity: 0.08 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute -top-6 -end-6 w-12 h-12 bg-white/20 rotate-45" />
            </motion.div>
            <motion.div
              className="absolute bottom-0 start-0 w-8 h-8 pointer-events-none overflow-hidden rounded-bl-xl"
              animate={isHovered ? { scale: 1.3, opacity: 0.12 } : { scale: 1, opacity: 0.06 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <div className="absolute -bottom-4 -start-4 w-8 h-8 bg-white/20 rotate-45" />
            </motion.div>
          </>
        )}

        {/* Status Badge - Top Right */}
        <div className="absolute top-2 end-2 z-10">
          {isLoadingStatus ? (
            // Show subtle loading indicator while checking status
            <span className="text-xs font-bold bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full border border-slate-600/40">
              <Loader2 className="w-3 h-3 animate-spin inline" />
            </span>
          ) : (status === 'won' || status === 'lost') ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative"
            >
              {/* Glow effect behind badge - green for won, pink for lost */}
              <motion.div
                className="absolute -inset-1 rounded-full blur-sm -z-10"
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  background: status === 'won'
                    ? 'rgba(191, 255, 0, 0.5)'  // Green glow for win
                    : 'rgba(255, 20, 147, 0.5)' // Pink glow for loss
                }}
              />
              <span
                className={cn(
                  "flex items-center gap-1 text-xs sm:text-sm font-bold px-2 py-1 sm:px-2.5 sm:py-1 rounded-full border-2 border-neo-black shadow-hard-sm",
                  status === 'won'
                    ? "bg-neo-lime text-neo-black"  // Green for win
                    : "bg-neo-pink text-neo-black"   // Pink for loss
                )}
                data-testid={status === 'won' ? "won-badge" : "lost-badge"}
              >
                {status === 'won' ? (
                  <Check className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} />
                ) : (
                  <X className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} />
                )}
                <span className="hidden xs:inline">
                  {status === 'won' ? t('daily.solved') : t('daily.failed')}
                </span>
              </span>
            </motion.div>
          ) : isUnavailable ? (
            <span className="text-xs font-bold bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full border border-slate-600/40">
              {t('buzz.notAvailable')}
            </span>
          ) : badge ? (
            <motion.span
              animate={showEffects ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-xs font-bold bg-neo-pink/20 text-neo-pink px-2 py-0.5 rounded-full border border-neo-pink/30"
            >
              {badge}
            </motion.span>
          ) : null}
        </div>

        {/* Time Mode Badge - Prominent at top, compact on mobile */}
        <motion.div
          whileHover={showEffects ? { scale: 1.05 } : {}}
          className={cn(
            'flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full mb-2 sm:mb-3',
            'border-2 font-bold text-xs sm:text-sm uppercase tracking-wide',
            timeMode === 'timed'
              ? 'bg-neo-orange/20 border-neo-orange text-neo-orange'
              : 'bg-neo-cyan/20 border-neo-cyan text-neo-cyan'
          )}
        >
          {timeMode === 'timed' ? (
            <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
          ) : (
            <Hourglass className="w-3 h-3 sm:w-4 sm:h-4" />
          )}
          <span>{timeModeLabel}</span>
        </motion.div>

        {/* Preview: Custom Grid, Image, or Icon - fixed height container for consistent card heights */}
        <div className="relative w-full h-32 sm:h-44 flex items-center justify-center mb-2 sm:mb-3">
          {customPreview === 'word-hunt-grid' ? (
            <WordHuntMiniGrid isHovered={isHovered} language={currentLanguage} />
          ) : imageElement ? (
            imageElement
          ) : (
            <motion.div
              whileHover={showEffects ? { scale: 1.1, rotate: 5 } : {}}
              transition={{ type: 'spring', stiffness: 400 }}
              className={cn(
                'flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl',
                'border-2 border-neo-black shadow-hard-sm',
                styles.iconBg,
                styles.text
              )}
            >
              {icon}
            </motion.div>
          )}

          {/* Prominent Completion Overlay - Shows when challenge is completed */}
          {(status === 'won' || status === 'lost') && !isLoadingStatus && (
            <motion.div
              data-testid={`completion-overlay-${challengeId}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={cn(
                'absolute inset-0 z-30 flex flex-col items-center justify-center',
                'rounded-xl border-3 border-neo-black backdrop-blur-sm',
                status === 'won'
                  ? 'bg-neo-lime/90'
                  : 'bg-neo-pink/90'
              )}
            >
              {/* Glow effect behind */}
              <motion.div
                className="absolute inset-0 rounded-xl -z-10"
                animate={{
                  boxShadow: status === 'won'
                    ? ['0 0 20px rgba(191, 255, 0, 0.5)', '0 0 40px rgba(191, 255, 0, 0.7)', '0 0 20px rgba(191, 255, 0, 0.5)']
                    : ['0 0 20px rgba(255, 20, 147, 0.5)', '0 0 40px rgba(255, 20, 147, 0.7)', '0 0 20px rgba(255, 20, 147, 0.5)'],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Icon */}
              <motion.div
                animate={{ rotate: status === 'won' ? [0, 10, -10, 0] : [0, -5, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-1 sm:mb-2"
              >
                {status === 'won' ? (
                  <Trophy className="w-10 h-10 sm:w-14 sm:h-14 text-neo-black drop-shadow-lg" strokeWidth={2.5} />
                ) : (
                  <Frown className="w-10 h-10 sm:w-14 sm:h-14 text-neo-black drop-shadow-lg" strokeWidth={2.5} />
                )}
              </motion.div>

              {/* Completion Text */}
              <span className="font-neo-display font-black text-lg sm:text-2xl text-neo-black uppercase tracking-wide">
                {status === 'won' ? t('daily.completed') : t('daily.failed')}
              </span>
            </motion.div>
          )}
        </div>

        {/* Content container - grows to push button to bottom */}
        <div className="flex-1 flex flex-col items-center w-full">
          {/* Title */}
          <h2 className={cn('text-lg sm:text-xl font-neo-display font-black mb-1 sm:mb-1.5', styles.text)}>
            {title}
          </h2>

          {/* Tagline */}
          <p className="text-[11px] sm:text-sm text-slate-400 mb-1 sm:mb-1.5 line-clamp-2 px-1 sm:px-2">
            {tagline}
          </p>

          {/* Details - Additional description */}
          {details && (
            <p className="text-[10px] sm:text-xs text-slate-500 mb-2 sm:mb-3 line-clamp-2 px-1 sm:px-2 italic">
              {details}
            </p>
          )}
        </div>

        {/* Play/Request Button with shine effect - aligned to bottom */}
        {isUnavailable ? (
          <div
            className={cn(
              'w-full py-2 sm:py-2.5 text-xs sm:text-sm font-black uppercase rounded-lg',
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
                {t('common.loading')}
              </>
            ) : requestState === 'sent' ? (
              <>
                <Check className="w-4 h-4" />
                {t('buzz.requestSent')}
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                {t('buzz.requestChallenge')}
              </>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'relative w-full py-2 sm:py-2.5 text-xs sm:text-sm font-black uppercase rounded-lg overflow-hidden',
              styles.bg,
              'text-neo-black border-2 border-neo-black shadow-hard-sm',
              'transition-all'
            )}
          >
            {buttonText}
            {/* Shine sweep effect */}
            {showEffects && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={isHovered ? { x: '200%' } : { x: '-100%' }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
