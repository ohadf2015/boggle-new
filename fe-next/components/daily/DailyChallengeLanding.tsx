'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Timer, Check, X, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getWordHuntStatusToday } from '@/utils/dailyChallenge/storage';
import { getGuestFingerprint } from '@/utils/guestManager';
import type { Language } from '@/types';

import { ScoreGauntletBanner } from './ScoreGauntletBanner';
import { DailyRewardPreview } from './DailyRewardPreview';
import { StreakFreezeIndicator } from './StreakFreezeIndicator';
import { DailyMissionsHeader } from './landing/DailyMissionsHeader';
import { QuestCard } from './landing/QuestCard';
import { StreakCounter } from './landing/StreakCounter';
import { LeaderboardTeaser } from './landing/LeaderboardTeaser';
import { ConfettiBackground } from './landing/ConfettiBackground';
import { FloatingDecorations } from './landing/FloatingDecorations';

interface DailyChallengeLandingProps {
  onSelectWordHunt: () => void;
  currentLanguage: Language;
}

interface ChallengeStatus {
  wordHunt: 'new' | 'won' | 'lost';
}

interface LoadingState {
  wordHunt: boolean;
}

/**
 * DailyChallengeLanding - Arcade Quest Enhanced layout
 * Vertical quest path with XP header, streak counter, and leaderboard teaser.
 */
export function DailyChallengeLanding({
  onSelectWordHunt,
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
  });
  const [loadingStatus, setLoadingStatus] = useState<LoadingState>({
    wordHunt: true,
  });
  const [streak, setStreak] = useState(0);
  const [freezeCount, setFreezeCount] = useState(0);

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
          setFreezeCount(data.freezeCount || 0);
        }
      }
    } catch {
      // Streak is optional — fail silently
    }
  };

  // Initial status check
  useEffect(() => {
    setLoadingStatus({ wordHunt: true });
    checkWordHunt();
    fetchStreak();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh on visibility change (user returns from playing)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkWordHunt();
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
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh on pathname change (Next.js router.push)
  useEffect(() => {
    if (pathname && pathname.endsWith('/daily')) {
      checkWordHunt();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Completion count for progress bar
  const completedCount = status.wordHunt === 'won' ? 1 : 0;

  const wordHuntPlayed = status.wordHunt === 'won' || status.wordHunt === 'lost';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="flex-1 flex flex-col items-center px-3 py-2 sm:px-4 sm:py-3 max-w-3xl mx-auto w-full relative"
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
            <button
              type="button"
              onClick={onSelectWordHunt}
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
                'shrink-0 py-2 px-5 text-xs font-black uppercase rounded-lg text-center',
                'bg-neo-orange text-neo-black border-2 border-neo-black shadow-hard-sm',
                'active:translate-y-0.5 active:shadow-none transition-all',
                'flex items-center gap-1.5',
                'group-hover:scale-105 transition-transform'
              )}>
                <Eye className="w-4 h-4" />
                {t('daily.viewResults')}
              </div>
            </button>
          </motion.div>

          {/* Continue missions divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="w-full flex items-center gap-3 my-2.5"
          >
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
              {t('daily.continueMissions')}
            </span>
            <div className="flex-1 h-px bg-slate-700" />
          </motion.div>

          {/* Streak counter + freeze */}
          <StreakCounter streak={streak} />
          <StreakFreezeIndicator freezeCount={freezeCount} t={t} className="mt-1" />
          <DailyRewardPreview currentStreakDay={streak} t={t} />
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

          {/* Streak counter + freeze */}
          <StreakCounter streak={streak} />
          <StreakFreezeIndicator freezeCount={freezeCount} t={t} className="mt-1" />
          <DailyRewardPreview currentStreakDay={streak} t={t} />
        </>
      )}

      {/* Leaderboard Teaser */}
      <div className="mt-3 w-full">
        <LeaderboardTeaser currentLanguage={currentLanguage} />
      </div>
    </motion.div>
  );
}