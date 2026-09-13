'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { Timer, CircleDot, Check, X, Eye, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { hasPlayedWordWheelToday } from '@/utils/dailyChallenge/storage';
import { getDailyStreak } from '@/utils/dailyChallenge/streaks';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { getGuestFingerprint } from '@/utils/dailyChallenge/guestPlayer';
import type { Language } from '@/types';
import type { PendingChest } from '@/hooks/useWeeklyChest';

import { questCardModes, visibleDailyModes } from '@/lib/dailyModes';
import { hasPlayedConnectionsToday } from '@/lib/connections/dailyClient';
import { ScoreGauntletBanner } from './ScoreGauntletBanner';
import { DailyMissionsHeader } from './landing/DailyMissionsHeader';
import { DailyHubHeader } from './landing/DailyHubHeader';
import { QuestCard } from './landing/QuestCard';
import { DailyModeQuestCard } from './landing/DailyModeQuestCard';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
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
  // Registry-driven quest cards: Connections (Word Bridge) is the one public
  // generic quest card today. Word Tower used to live here (and as a bespoke
  // QuestCard before that) — it was hidden from consumer surfaces per Ohad's
  // 2026-09-13 directive, so it left the registry (see lib/dailyModes.ts).
  const questModes = questCardModes(canSeeInWorkModes);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Pre-game gauntlet banner. Reads the same rival contract the share link emits
  // (whName/whScore/whEmoji) and the results head-to-head card consumes — one
  // contract end to end. The validated verdict lives on the results screen
  // (useDailyRivalChallenge → sessionStorage); this banner is just the hype.
  const challengerName = searchParams?.get('whName') || null;
  const challengerScore = searchParams?.get('whScore')
    ? Number(searchParams.get('whScore'))
    : null;
  const challengerEmoji = searchParams?.get('whEmoji') || null;

  // Witty welcome for players warped here by scanning a printed QR / barcode.
  // Set by the homepage redirect (utmCapture.isQrScanArrival → /daily?from=qr).
  const cameFromQrScan = searchParams?.get('from') === 'qr';

  // Use the centralized hook for Word Hunt status + streak (fetches from server for authed users)
  const dailyStatus = useDailyChallengeStatus(currentLanguage);

  // Word Wheel status from localStorage (no server endpoint for it yet)
  const [wordWheelStatus, setWordWheelStatus] = useState<'new' | 'played'>('new');
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  // Defer Date.now()-derived value to client to avoid hydration mismatch (React #418)
  const [todayIso, setTodayIso] = useState<string>('');
  const [claimedChest, setClaimedChest] = useState<PendingChest | null>(null);
  // Connections (Word Bridge) played today — same marker both daily flavors
  // write on their terminal screens (5-riddle chain AND pyramid).
  const [connectionsPlayed, setConnectionsPlayed] = useState(false);

  useEffect(() => {
    // Daily guest identity — the fingerprint the daily games record guests
    // under, so the hub board highlights a guest's own row after they play.
    let cancelled = false;
    getGuestFingerprint().then((fp) => {
      if (!cancelled) setGuestFingerprint(fp || null);
    });
    setTodayIso(new Date().toISOString().split('T')[0]);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const check = () => {
      try {
        setConnectionsPlayed(hasPlayedConnectionsToday());
      } catch { /* storage disabled — treat as not played */ }
    };
    check();
    document.addEventListener('visibilitychange', check);
    window.addEventListener('popstate', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('popstate', check);
    };
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

  // The hub shows /3 quests: Word Hunt + Word Wheel + Connections. Word Tower
  // used to expand the bar to /4 — it left the registry (hidden from consumer
  // surfaces, 2026-09-13), so the denominator follows the visible modes only.
  const visibleModes = visibleDailyModes(canSeeInWorkModes);
  const showsConnections = visibleModes.some((mode) => mode.id === 'connections');
  const totalQuests = 2 + (showsConnections ? 1 : 0);

  // Completion count for progress bar
  const completedCount =
    (wordHuntStatus === 'won' ? 1 : 0) +
    (wordWheelStatus === 'played' ? 1 : 0) +
    (showsConnections && connectionsPlayed ? 1 : 0);

  const wordHuntPlayed = wordHuntStatus === 'won' || wordHuntStatus === 'lost';
  const wordWheelPlayed = wordWheelStatus === 'played';

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="flex-1 flex flex-col items-center px-3 py-2 sm:px-4 sm:py-2 pb-bottom-stack sm:pb-2 max-w-3xl mx-auto w-full relative gap-3"
    >
      {/* Hub Header: Today's Puzzles + date */}
      <DailyHubHeader todayIso={todayIso} />

      {/* Missions Header: XP bar + countdown */}
      <DailyMissionsHeader completedCount={completedCount} total={totalQuests} />

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
                'inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md border-2',
                wordHuntStatus === 'won'
                  ? 'bg-neo-lime/20 text-neo-lime border-neo-lime/40'
                  : 'bg-neo-pink/20 text-neo-pink border-neo-pink/40'
              )}>
                {wordHuntStatus === 'won' && <Sparkles className="w-2.5 h-2.5" strokeWidth={3} aria-hidden />}
                {wordHuntStatus === 'won' ? t('daily.cleared') : t('daily.wordHunt.title')}
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
              'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
              'transition-all duration-200 group',
              'bg-neo-lime/[0.06] hover:bg-neo-lime/[0.1]'
            )}
          >
            <div className="absolute inset-e-0 top-0 bottom-0 w-1.5 rounded-e-lg bg-neo-lime" />
            <m.div
              data-testid="wheel-cleared-badge"
              className={cn(
                'w-12 h-12 rounded-full border-2 border-neo-black shrink-0',
                'flex items-center justify-center shadow-hard-xs',
                'bg-neo-lime'
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
              <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md border-2 bg-neo-lime/20 text-neo-lime border-neo-lime/40">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={3} aria-hidden />
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

      {/* Word Tower used to render here as quest 3 (shared QuestCard + SPA nav
          to /daily/word-tower). Hidden from the hub per Ohad's 2026-09-13
          directive — the route stays alive for direct links, but no consumer
          surface links to it. */}

      {/* Registry-driven quest cards — Connections (Word Bridge) is the daily
          quest #3: public card, played-today status fed from the same marker
          both daily flavors write. */}
      {questModes.length > 0 && (
        <>
          <div className="w-full flex flex-col gap-2" data-testid="daily-quest-modes">
            {questModes.map((mode, i) => (
              <DailyModeQuestCard
                key={mode.id}
                mode={mode}
                locale={currentLanguage}
                t={t}
                played={mode.id === 'connections' ? connectionsPlayed : false}
                delay={0.35 + i * 0.05}
              />
            ))}
          </div>
        </>
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
        <WeeklyChestModal
          chest={claimedChest}
          streak={getDailyStreak().currentStreak}
          onClose={() => setClaimedChest(null)}
        />
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
      {/* The global bottom banner is the app-wide AnchoredNativeBanner, pinned to
          the viewport bottom on this hub via the admob-routes allowlist — NOT an
          in-flow slot (which scrolled with the content). This container's
          `pb-bottom-stack` reserves the fixed-bottom stack (nav + banner) so the
          leaderboard rows, weekly chest, and quest cards stay clear of it. */}
    </m.div>
  );
}