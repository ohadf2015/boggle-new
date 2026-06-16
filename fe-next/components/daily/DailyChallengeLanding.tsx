'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { Timer, CircleDot, Check, X, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { hasPlayedWordWheelToday } from '@/utils/dailyChallenge/storage';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { getGuestFingerprint } from '@/utils/guestManager';
import type { Language } from '@/types';
import type { PendingChest } from '@/hooks/useWeeklyChest';

import { adminOnlyDailyModes } from '@/lib/dailyModes';
import { ScoreGauntletBanner } from './ScoreGauntletBanner';
import { DailyMissionsHeader } from './landing/DailyMissionsHeader';
import { QuestCard } from './landing/QuestCard';
import { AdminDailyModeCard } from './landing/AdminDailyModeCard';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import { ConfettiBackground } from './landing/ConfettiBackground';
import { FloatingDecorations } from './landing/FloatingDecorations';
import WeeklyChestCard from './WeeklyChestCard';
import WeeklyChestModal from './WeeklyChestModal';
import DailyInsightStack from './DailyInsightStack';

interface DailyChallengeLandingProps {
  onSelectWordHunt: () => void;
  onSelectWordWheel: () => void;
  currentLanguage: Language;
}

/**
 * DailyChallengeLanding - Arcade Quest Enhanced layout
 * Vertical quest path with XP header, streak counter, and leaderboard teaser.
 */
export function DailyChallengeLanding({
  onSelectWordHunt,
  onSelectWordWheel,
  currentLanguage,
}: DailyChallengeLandingProps) {
  const { t } = useLanguage();
  const { user, canSeeInWorkModes } = useAuth();
  // In-work daily modes being readied for the public flow (Word Tower today).
  // Registry-driven so future modes appear here for admins + beta testers with
  // no hub edits. See lib/auth/inWorkModeAccess.ts.
  const adminModes = canSeeInWorkModes ? adminOnlyDailyModes() : [];
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const challengerName = searchParams?.get('whChallenger') || null;
  const challengerScore = searchParams?.get('whChallengeScore')
    ? Number(searchParams.get('whChallengeScore'))
    : null;
  const challengerEmoji = searchParams?.get('whChallengeEmoji') || null;

  // Use the centralized hook for Word Hunt status + streak (fetches from server for authed users)
  const dailyStatus = useDailyChallengeStatus(currentLanguage);

  // Word Wheel status from localStorage (no server endpoint for it yet)
  const [wordWheelStatus, setWordWheelStatus] = useState<'new' | 'played'>('new');
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  // Defer Date.now()-derived value to client to avoid hydration mismatch (React #418)
  const [todayIso, setTodayIso] = useState<string>('');
  const [claimedChest, setClaimedChest] = useState<PendingChest | null>(null);

  useEffect(() => {
    setGuestFingerprint(getGuestFingerprint());
    setTodayIso(new Date().toISOString().split('T')[0]);
  }, []);

  // Derive Word Hunt status from hook (server-aware for cross-device play)
  const wordHuntStatus: 'new' | 'won' | 'lost' = dailyStatus.loading
    ? 'new'
    : !dailyStatus.hasPlayed
      ? 'new'
      : dailyStatus.hasSolved
        ? 'won'
        : 'lost';

  // Check Word Wheel status from localStorage
  const checkWordWheelStatus = () => {
    const wwPlayed = hasPlayedWordWheelToday(currentLanguage);
    setWordWheelStatus(wwPlayed ? 'played' : 'new');
  };

  // Initial check
  useEffect(() => {
    checkWordWheelStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh on visibility change (user returns from playing)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkWordWheelStatus();
        dailyStatus.refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      checkWordWheelStatus();
      dailyStatus.refresh();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id]);

  // Refresh on pathname change (Next.js router.push)
  useEffect(() => {
    if (pathname && pathname.endsWith('/daily')) {
      checkWordWheelStatus();
      dailyStatus.refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Completion count for progress bar
  const completedCount =
    (wordHuntStatus === 'won' ? 1 : 0) +
    (wordWheelStatus === 'played' ? 1 : 0);

  const wordHuntPlayed = wordHuntStatus === 'won' || wordHuntStatus === 'lost';
  const wordWheelPlayed = wordWheelStatus === 'played';

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="flex-1 flex flex-col items-center px-3 py-2 sm:px-4 sm:py-2 pb-bottom-stack sm:pb-2 max-w-3xl mx-auto w-full relative gap-3"
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

      {/* Quest 1: Word Hunt */}
      {wordHuntPlayed ? (
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full"
          data-testid="word-hunt-hero"
        >
          <button
            type="button"
            onClick={onSelectWordHunt}
            className={cn(
              'relative w-full rounded-xl border-3 border-neo-black',
              'shadow-hard overflow-hidden cursor-pointer p-4',
              'flex items-center gap-4',
              'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
              'transition-all duration-200 group',
              wordHuntStatus === 'won'
                ? 'bg-neo-lime/[0.06] hover:bg-neo-lime/[0.1]'
                : 'bg-neo-pink/[0.06] hover:bg-neo-pink/[0.1]'
            )}
          >
            <div className={cn(
              'absolute inset-e-0 top-0 bottom-0 w-1.5 rounded-e-lg',
              wordHuntStatus === 'won' ? 'bg-neo-lime' : 'bg-neo-pink'
            )} />
            <m.div
              data-testid={wordHuntStatus === 'won' ? 'won-badge' : 'lost-badge'}
              className={cn(
                'w-12 h-12 rounded-full border-2 border-neo-black shrink-0',
                'flex items-center justify-center shadow-hard-xs',
                wordHuntStatus === 'won' ? 'bg-neo-lime' : 'bg-neo-pink'
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 15 }}
            >
              {wordHuntStatus === 'won'
                ? <Check className="w-6 h-6 text-neo-black" strokeWidth={3} />
                : <X className="w-6 h-6 text-neo-black" strokeWidth={3} />
              }
            </m.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-neo-display font-black text-neo-white leading-none">
                {t('daily.wordHunt.title')}
              </h2>
              <span className={cn(
                'inline-block mt-1.5 px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md border-2',
                wordHuntStatus === 'won'
                  ? 'bg-neo-lime/20 text-neo-lime border-neo-lime/40'
                  : 'bg-neo-pink/20 text-neo-pink border-neo-pink/40'
              )}>
                {wordHuntStatus === 'won' ? t('daily.cleared') : t('daily.wordHunt.title')}
              </span>
            </div>
            <div className={cn(
              'shrink-0 py-2.5 px-5 text-xs font-black uppercase rounded-lg text-center',
              'bg-neo-cyan text-neo-black border-2 border-neo-black shadow-hard-sm',
              'active:translate-y-0.5 active:shadow-none transition-all',
              'flex items-center gap-1.5 group-hover:scale-105'
            )}>
              <Eye className="w-4 h-4" />
              {t('daily.viewResults')}
            </div>
          </button>
        </m.div>
      ) : (
        <QuestCard
          challengeId="wordHunt"
          icon={<Timer className="w-8 h-8" />}
          title={t('daily.wordHunt.title')}
          tagline={t('daily.wordHunt.desc')}
          color="orange"
          status={wordHuntStatus}
          isLoadingStatus={dailyStatus.loading}
          onPlay={onSelectWordHunt}
          timeMode="timed"
          timeModeLabel={t('daily.timedQuest')}
          previewImageUrl="/daily/word-hunt-mascot.jpg"
          previewImageAlt={t('daily.wordHunt.title')}
          currentLanguage={currentLanguage}
          buttonText={t('daily.startQuest')}
          delay={0.15}
        />
      )}

      {/* ── Dotted connector line ── */}
      <div className="flex flex-col items-center gap-0 py-1">
        <div className="w-0.5 h-3 border-s-2 border-dashed border-neo-cream/20" />
        <div className={cn(
          'w-5 h-5 rounded-full border-2 border-neo-black flex items-center justify-center',
          completedCount >= 2 ? 'bg-neo-lime' : 'bg-neo-navy-light'
        )}>
          {completedCount >= 2 && <Check className="w-3 h-3 text-neo-black" strokeWidth={3} />}
        </div>
        <div className="w-0.5 h-3 border-s-2 border-dashed border-neo-cream/20" />
      </div>

      {/* Quest 2: Word Wheel */}
      {wordWheelPlayed ? (
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full"
          data-testid="word-wheel-hero"
        >
          <button
            type="button"
            onClick={onSelectWordWheel}
            className={cn(
              'relative w-full rounded-xl border-3 border-neo-black',
              'shadow-hard overflow-hidden cursor-pointer p-4',
              'flex items-center gap-4',
              'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
              'transition-all duration-200 group',
              'bg-neo-cyan/[0.06] hover:bg-neo-cyan/[0.1]'
            )}
          >
            <div className="absolute inset-e-0 top-0 bottom-0 w-1.5 rounded-e-lg bg-neo-cyan" />
            <m.div
              data-testid="wheel-cleared-badge"
              className={cn(
                'w-12 h-12 rounded-full border-2 border-neo-black shrink-0',
                'flex items-center justify-center shadow-hard-xs',
                'bg-neo-cyan'
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Check className="w-6 h-6 text-neo-black" strokeWidth={3} />
            </m.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-neo-display font-black text-neo-white leading-none">
                {t('wordWheel.hub.wordWheelQuest')}
              </h2>
              <span className="inline-block mt-1.5 px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md border-2 bg-neo-cyan/20 text-neo-cyan border-neo-cyan/40">
                {t('daily.cleared')}
              </span>
            </div>
            <div className={cn(
              'shrink-0 py-2.5 px-5 text-xs font-black uppercase rounded-lg text-center',
              'bg-neo-lime text-neo-black border-2 border-neo-black shadow-hard-sm',
              'active:translate-y-0.5 active:shadow-none transition-all',
              'flex items-center gap-1.5 group-hover:scale-105'
            )}>
              <Eye className="w-4 h-4" />
              {t('daily.viewResults')}
            </div>
          </button>
        </m.div>
      ) : (
        <QuestCard
          challengeId="wordWheel"
          icon={<CircleDot className="w-8 h-8" />}
          title={t('wordWheel.hub.wordWheelQuest')}
          tagline={t('wordWheel.hub.wordWheelDesc')}
          color="yellow"
          status="new"
          onPlay={onSelectWordWheel}
          timeMode="timed"
          timeModeLabel={t('daily.timedQuest')}
          previewImageUrl="/daily/word-wheel-mascot.jpg"
          previewImageAlt={t('wordWheel.hub.wordWheelQuest')}
          buttonText={t('daily.startQuest')}
          delay={0.25}
        />
      )}

      {/* Admin-only daily modes (rollout staging). Hidden entirely for non-admins. */}
      {adminModes.length > 0 && (
        <div className="w-full flex flex-col gap-2" data-testid="daily-admin-modes">
          {adminModes.map((mode, i) => (
            <AdminDailyModeCard
              key={mode.id}
              mode={mode}
              locale={currentLanguage}
              t={t}
              delay={0.3 + i * 0.05}
            />
          ))}
        </div>
      )}

      {/* Insights: surface "you improved" / "personal best" inline once any mode complete */}
      {user && todayIso && (wordHuntStatus === 'won' || wordWheelPlayed) && (
        <div className="w-full">
          <DailyInsightStack
            mode={wordHuntStatus === 'won' ? 'word_hunt' : 'word_wheel'}
            date={todayIso}
          />
        </div>
      )}

      {/* Weekly Chest: 7-day progress + tier reward (authed only — guest has no server cycle) */}
      {user && (
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full"
          data-testid="weekly-chest-slot"
        >
          <WeeklyChestCard onChestClaimed={setClaimedChest} />
        </m.div>
      )}

      {claimedChest && (
        <WeeklyChestModal chest={claimedChest} onClose={() => setClaimedChest(null)} />
      )}

      {/* Leaderboard Teaser — only render after client-side date hydration */}
      {todayIso && (
        <m.div
          className="w-full"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 25 }}
        >
          <TabbedDailyLeaderboard
            puzzleDate={todayIso}
            language={currentLanguage}
            currentPlayerId={user?.id ?? null}
            currentGuestFingerprint={guestFingerprint}
            scope="combined"
            defaultTab="today"
            t={t}
            maxVisible={5}
            compact
          />
        </m.div>
      )}
    </m.div>
  );
}