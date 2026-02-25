'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Timer, Hourglass, Trophy, Check, X, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getWordHuntStatusToday } from '@/utils/dailyChallenge/storage';
import { getGuestFingerprint } from '@/utils/guestManager';
import type { Language } from '@/types';

import { ScoreGauntletBanner } from './ScoreGauntletBanner';
import { DailyMissionsHeader } from './landing/DailyMissionsHeader';
import { QuestCard } from './landing/QuestCard';
import { StreakCounter } from './landing/StreakCounter';
import { LeaderboardTeaser } from './landing/LeaderboardTeaser';
import { ConfettiBackground } from './landing/ConfettiBackground';
import { FloatingDecorations } from './landing/FloatingDecorations';

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
 * DailyChallengeLanding - Arcade Quest Enhanced layout
 * Vertical quest path with XP header, streak counter, and leaderboard teaser.
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
  const searchParams = useSearchParams();

  const challengerName = searchParams?.get('whChallenger') || null;
  const challengerScore = searchParams?.get('whChallengeScore')
    ? Number(searchParams.get('whChallengeScore'))
    : null;
  const challengerEmoji = searchParams?.get('whChallengeEmoji') || null;

  const [status, setStatus] = useState<ChallengeStatus>({
    wordHunt: 'new',
    buzz: 'new',
  });
  const [loadingStatus, setLoadingStatus] = useState<LoadingState>({
    wordHunt: true,
    buzz: true,
  });
  const [buzzPreview, setBuzzPreview] = useState<BuzzPreviewData>({});
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [streak, setStreak] = useState(0);

  // Word Hunt status check - synchronous local storage check
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

    // Check buzz availability
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
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Failed to check buzz availability:', errorMessage);
    }

    if (!buzzAvailable) {
      setStatus(prev => ({ ...prev, buzz: 'unavailable' }));
      setBuzzPreview({ available: false });
      setLoadingStatus(prev => ({ ...prev, buzz: false }));
      return;
    }

    let buzzPlayed = false;
    let buzzCompleted = false;
    try {
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
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Failed to check buzz status:', errorMessage);
    }

    // Fetch buzz preview data
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
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Failed to fetch buzz preview:', errorMessage);
    }

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

  // Fetch streak data
  const fetchStreak = async () => {
    try {
      const params = new URLSearchParams();
      if (user?.id) {
        params.set('player_id', user.id);
      } else {
        const fingerprint = getGuestFingerprint();
        if (fingerprint) params.set('guest_fingerprint', fingerprint);
      }
      if (params.toString()) {
        const res = await fetch(`/api/daily-streak?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setStreak(data.streak || 0);
        }
      }
    } catch {
      // Streak is optional — fail silently
    }
  };

  // Initial status check
  useEffect(() => {
    setLoadingStatus({ wordHunt: true, buzz: true });
    checkWordHunt();
    checkBuzzStatus();
    fetchStreak();
    setRequestState('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh on visibility change (user returns from playing)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkWordHunt();
        checkBuzzStatus();
        fetchStreak();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      checkWordHunt();
      checkBuzzStatus();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh on pathname change (Next.js router.push)
  useEffect(() => {
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

  // Completion count for progress bar
  const completedCount =
    (status.wordHunt === 'won' ? 1 : 0) +
    (status.buzz === 'won' ? 1 : 0);

  const wordHuntPlayed = status.wordHunt === 'won' || status.wordHunt === 'lost';
  const bothWon = status.wordHunt === 'won' && status.buzz === 'won';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="flex-1 flex flex-col items-center px-3 py-3 sm:px-4 sm:py-4 max-w-3xl mx-auto w-full relative"
    >
      {/* Ambient effects */}
      <ConfettiBackground />
      <FloatingDecorations />

      {/* Missions Header: XP bar + countdown */}
      <DailyMissionsHeader completedCount={completedCount} />

      {/* Score Gauntlet Banner: shown when arriving via a challenge share link */}
      <ScoreGauntletBanner
        challengerName={challengerName}
        challengerScore={challengerScore}
        challengerEmoji={challengerEmoji}
        t={t}
      />

      {/* Word Hunt: hero results card when played, full QuestCard when new */}
      {wordHuntPlayed ? (
        <>
          {/* Word Hunt Results Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full"
            data-testid="word-hunt-hero"
          >
            <div
              onClick={onSelectWordHunt}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectWordHunt()}
              className={cn(
                'relative w-full bg-slate-900/95 rounded-xl border-3 border-neo-black',
                'shadow-hard overflow-hidden cursor-pointer p-4',
                'flex items-center gap-4',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime',
                'transition-shadow duration-200 group'
              )}
            >
              {/* Status icon */}
              <div
                data-testid={status.wordHunt === 'won' ? 'won-badge' : 'lost-badge'}
                className={cn(
                  'w-12 h-12 rounded-full border-2 border-neo-black shrink-0',
                  'flex items-center justify-center',
                  'shadow-hard-xs',
                  status.wordHunt === 'won' ? 'bg-neo-lime' : 'bg-neo-pink'
                )}
              >
                {status.wordHunt === 'won'
                  ? <Check className="w-6 h-6 text-neo-black" strokeWidth={3} />
                  : <X className="w-6 h-6 text-neo-black" strokeWidth={3} />
                }
              </div>

              {/* Title + status badge */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-neo-display font-black text-neo-orange leading-none">
                  {t('daily.wordHunt.title')}
                </h2>
                <span className={cn(
                  'inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase rounded-md border',
                  status.wordHunt === 'won'
                    ? 'bg-neo-lime/20 text-neo-lime border-neo-lime'
                    : 'bg-neo-pink/20 text-neo-pink border-neo-pink'
                )}>
                  {status.wordHunt === 'won' ? t('daily.cleared') : t('daily.wordHunt.title')}
                </span>
              </div>

              {/* View Results CTA */}
              <div className={cn(
                'shrink-0 py-2.5 px-4 text-[10px] font-black uppercase rounded-lg text-center',
                'bg-neo-orange text-neo-black border-2 border-neo-black shadow-hard-sm',
                'active:translate-y-0.5 active:shadow-none transition-all',
                'flex items-center gap-1.5'
              )}>
                <Eye className="w-3.5 h-3.5" />
                {t('daily.viewResults')}
              </div>
            </div>
          </motion.div>

          {/* Continue missions divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="w-full flex items-center gap-3 my-4"
          >
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
              {t('daily.continueMissions')}
            </span>
            <div className="flex-1 h-px bg-slate-700" />
          </motion.div>

          {/* Streak counter */}
          <StreakCounter streak={streak} />

          <QuestPathLine />

          {/* Buzz as secondary card */}
          <QuestCard
            challengeId="buzz"
            icon={<Hourglass className="w-8 h-8" />}
            title={t('buzz.title')}
            tagline={
              status.buzz === 'unavailable'
                ? t('buzz.unavailableTagline')
                : t('buzz.tagline')
            }
            details={status.buzz !== 'unavailable' ? t('buzz.details') : undefined}
            color="yellow"
            status={status.buzz}
            isLoadingStatus={loadingStatus.buzz}
            onPlay={onSelectBuzz}
            timeMode="relaxed"
            timeModeLabel={t('daily.untimedQuest')}
            badge={status.buzz !== 'unavailable' ? t('buzz.badge') : undefined}
            buttonText={
              (status.buzz === 'won' || status.buzz === 'lost')
                ? t('daily.viewResults')
                : status.buzz === 'unavailable'
                  ? t('buzz.requestChallenge')
                  : t('daily.startQuest')
            }
            delay={0.3}
            previewImageUrl={buzzPreview.imageUrl}
            previewImageAlt={buzzPreview.trendingSummary}
            onRequestChallenge={handleRequestChallenge}
            requestState={requestState}
            variant="secondary"
          />
        </>
      ) : (
        <>
          {/* Quest 1: Word Hunt (new — hasn't played) */}
          <QuestCard
            challengeId="wordHunt"
            icon={<Timer className="w-8 h-8" />}
            title={t('daily.wordHunt.title')}
            tagline={t('daily.wordHunt.desc')}
            details={t('daily.wordHunt.details')}
            color="orange"
            status={status.wordHunt}
            isLoadingStatus={loadingStatus.wordHunt}
            onPlay={onSelectWordHunt}
            timeMode="timed"
            timeModeLabel={t('daily.timedQuest')}
            customPreview="word-hunt-grid"
            currentLanguage={currentLanguage}
            buttonText={t('daily.startQuest')}
            delay={0.15}
          />

          {/* Quest path connector */}
          <QuestPathLine />

          {/* Streak counter between quests */}
          <StreakCounter streak={streak} />

          {/* Quest path connector */}
          <QuestPathLine />

          {/* Quest 2: Daily Buzz */}
          <QuestCard
            challengeId="buzz"
            icon={<Hourglass className="w-8 h-8" />}
            title={t('buzz.title')}
            tagline={
              status.buzz === 'unavailable'
                ? t('buzz.unavailableTagline')
                : t('buzz.tagline')
            }
            details={status.buzz !== 'unavailable' ? t('buzz.details') : undefined}
            color="yellow"
            status={status.buzz}
            isLoadingStatus={loadingStatus.buzz}
            onPlay={onSelectBuzz}
            timeMode="relaxed"
            timeModeLabel={t('daily.untimedQuest')}
            badge={status.buzz !== 'unavailable' ? t('buzz.badge') : undefined}
            buttonText={
              (status.buzz === 'won' || status.buzz === 'lost')
                ? t('daily.viewResults')
                : status.buzz === 'unavailable'
                  ? t('buzz.requestChallenge')
                  : t('daily.startQuest')
            }
            delay={0.3}
            previewImageUrl={buzzPreview.imageUrl}
            previewImageAlt={buzzPreview.trendingSummary}
            onRequestChallenge={handleRequestChallenge}
            requestState={requestState}
          />
        </>
      )}

      {/* Browse Past Challenges */}
      {onShowBuzzHistory && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          onClick={onShowBuzzHistory}
          className="mt-4 text-sm text-slate-400 hover:text-neo-pink transition-colors underline underline-offset-4 decoration-slate-600 hover:decoration-neo-pink"
        >
          {t('daily.browseArchive')}
        </motion.button>
      )}

      {/* Daily Double Achievement */}
      {bothWon && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.4 }}
          className="mt-5 w-full"
        >
          <div className="px-5 py-3 bg-neo-navy-light border-3 border-neo-lime rounded-xl shadow-hard">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-neo-lime" />
              <div>
                <span className="font-black text-neo-lime text-base tracking-wide uppercase block">
                  {t('daily.dailyDouble')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {t('daily.dailyDoubleBonus')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Leaderboard Teaser */}
      <div className="mt-5 w-full">
        <LeaderboardTeaser currentLanguage={currentLanguage} />
      </div>
    </motion.div>
  );
}

/** SVG quest path connecting line between quest nodes */
function QuestPathLine() {
  return (
    <div className="flex justify-center py-1" aria-hidden="true">
      <svg width="4" height="32" viewBox="0 0 4 32" className="overflow-visible">
        <line
          x1="2" y1="0" x2="2" y2="32"
          stroke="currentColor"
          className="text-slate-600 animate-quest-path"
          strokeWidth="2"
          strokeDasharray="8 6"
        />
      </svg>
    </div>
  );
}
