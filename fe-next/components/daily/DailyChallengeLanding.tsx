'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { Timer, CircleDot, Check, X, Eye, Sparkles, Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { hasPlayedWordWheelToday } from '@/utils/dailyChallenge/storage';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import type { Language } from '@/types';
import type { PendingChest } from '@/hooks/useWeeklyChest';

import { questCardModes, visibleDailyModes, pickPrimaryMode, type DailyModePlayState, type DailyModeId } from '@/lib/dailyModes';
import { dailyBestKey, isDailyTowerPlayed } from '@/lib/wordTower/dailyBest';
import { hasPlayedConnectionsToday } from '@/lib/connections/dailyClient';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import { ScoreGauntletBanner } from './ScoreGauntletBanner';
import { DailyMissionsHeader } from './landing/DailyMissionsHeader';
import { DailyHubHeader } from './landing/DailyHubHeader';
import { QuestCard } from './landing/QuestCard';
import { DailyModeQuestCard } from './landing/DailyModeQuestCard';
import { CompactModeRow } from './landing/CompactModeRow';
import { PersistentStreakDisplay } from './streak/PersistentStreakDisplay';
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
  // Registry-driven quest cards: the PUBLIC ones (Word Tower) for everybody, plus
  // the still-gated ones (Connections) for admins + beta testers. Word Tower used
  // to be drawn from `adminOnlyDailyModes()`, which meant ordinary players saw a
  // two-card hub and the mode was effectively unshipped. See lib/dailyModes.ts.
  const questModes = questCardModes(canSeeInWorkModes);
  const pathname = usePathname();
  const router = useRouter();
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

  // Use the unified hook for played status and streak across all modes and devices
  const dailyPlayedStatus = useDailyPlayedStatus();

  // Word Wheel status from localStorage (no server endpoint for it yet)
  const [wordWheelStatus, setWordWheelStatus] = useState<'new' | 'played'>('new');
  // Defer Date.now()-derived value to client to avoid hydration mismatch (React #418)
  const [todayIso, setTodayIso] = useState<string>('');
  const [claimedChest, setClaimedChest] = useState<PendingChest | null>(null);
  // Word Tower "played today" — client-only localStorage read (SSR-safe), kept
  // fresh when the player returns from the game (visibility/back nav).
  const [wordTowerPlayed, setWordTowerPlayed] = useState(false);
  // Connections (Word Bridge) played today — same marker both daily flavors
  // write on their terminal screens (5-riddle chain AND pyramid).
  const [connectionsPlayed, setConnectionsPlayed] = useState(false);

  useEffect(() => {
    // Deferred to the client so the Date.now()-derived value cannot cause a
    // hydration mismatch (React #418).
    setTodayIso(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const check = () => {
      try {
        setWordTowerPlayed(isDailyTowerPlayed(localStorage.getItem(dailyBestKey(utcDateKey()))));
      } catch { /* storage disabled — treat as not played */ }
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
  // Server truth wins: localStorage only knows what THIS device did, so a player who finished on
  // their phone used to see a green "Play" on their laptop. dailyPlayedStatus is server-backed for
  // an authed player (and localStorage-backed for a guest, where it is the only truth available).
  const checkWordWheelStatus = () => {
    const wwPlayed =
      dailyPlayedStatus.today.wordWheel || hasPlayedWordWheelToday(currentLanguage);
    setWordWheelStatus(wwPlayed ? 'played' : 'new');
  };

  // Initial check, and again when the server answer lands — the authed status starts as a skeleton,
  // so without these deps the row keeps the first (localStorage-only) answer forever.
  useEffect(() => {
    checkWordWheelStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage, user?.id, dailyPlayedStatus.today.wordWheel, dailyPlayedStatus.loading]);

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

  // Word Tower is the 3rd quest: only expand the bar to /3 and count it when the
  // player actually sees the card. Read off the REGISTRY, not `questModes` — Word
  // Tower is drawn with the shared QuestCard now, so it is deliberately absent
  // from the generic registry-card list and checking there would silently drop
  // the bar back to /2. Connections is the 4th quest (generic card) with the
  // same registry-driven rule.
  const visibleModes = visibleDailyModes(canSeeInWorkModes);
  const showsWordTower = visibleModes.some((mode) => mode.id === 'word-tower');
  const showsConnections = visibleModes.some((mode) => mode.id === 'connections');
  const wordTowerHref = `/${currentLanguage}/daily/word-tower`;
  const totalQuests = 2 + (showsWordTower ? 1 : 0) + (showsConnections ? 1 : 0);

  // Completion count for progress bar
  const completedCount =
    (wordHuntStatus === 'won' ? 1 : 0) +
    (wordWheelStatus === 'played' ? 1 : 0) +
    (showsWordTower && wordTowerPlayed ? 1 : 0) +
    (showsConnections && connectionsPlayed ? 1 : 0);

  const wordHuntPlayed = wordHuntStatus === 'won' || wordHuntStatus === 'lost';
  const wordWheelPlayed = wordWheelStatus === 'played';

  // Build play state for primary mode selection
  const playState: DailyModePlayState = {
    wordHunt: wordHuntStatus,
    wordWheel: wordWheelStatus === 'played' ? 'played' : 'new',
    wordTower: wordTowerPlayed,
    connections: connectionsPlayed,
  };

  // Determine which mode should be the primary (hero) card
  const primaryModeId = pickPrimaryMode(playState);

  // Helper to get mode properties for rendering
  type ModeInfo = {
    id: DailyModeId;
    title: string;
    icon: ReactNode;
    color: 'orange' | 'yellow' | 'cyan' | 'purple';
    played: boolean;
    onPlay: () => void;
    visible: boolean;
  };

  const modesInfo: ModeInfo[] = [
    {
      id: 'word-hunt',
      title: t('daily.wordHunt.title'),
      icon: <Timer className="w-8 h-8" />,
      color: 'orange',
      played: wordHuntPlayed,
      onPlay: onSelectWordHunt,
      visible: true,
    },
    {
      id: 'word-wheel',
      title: t('wordWheel.hub.wordWheelQuest'),
      icon: <CircleDot className="w-8 h-8" />,
      color: 'yellow',
      played: wordWheelPlayed,
      onPlay: onSelectWordWheel,
      visible: true,
    },
    {
      id: 'word-tower',
      title: t('wordTower.daily.questTitle'),
      icon: <Building2 className="w-8 h-8" />,
      color: 'cyan',
      played: wordTowerPlayed,
      onPlay: () => router.push(wordTowerHref),
      visible: showsWordTower,
    },
    {
      id: 'connections',
      title: t('connections.daily.questTitle'),
      icon: <CircleDot className="w-8 h-8" />,
      color: 'purple',
      played: connectionsPlayed,
      onPlay: () => router.push(`/${currentLanguage}/connections/daily`),
      visible: showsConnections,
    },
  ];

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="flex-1 flex flex-col items-center px-3 py-2 sm:px-4 sm:py-2 pb-bottom-stack sm:pb-2 max-w-3xl mx-auto w-full relative gap-3"
    >
      {/* Hub Header: Today's Puzzles + date */}
      <DailyHubHeader todayIso={todayIso} />

      {/* Persistent Streak Display: shows current streak across all devices */}
      <PersistentStreakDisplay />

      {/* Missions Header: XP bar + countdown */}
      <DailyMissionsHeader completedCount={completedCount} total={totalQuests} />

      {/* Score Gauntlet Banner: shown when arriving via a challenge share link */}
      <ScoreGauntletBanner
        challengerName={challengerName}
        challengerScore={challengerScore}
        challengerEmoji={challengerEmoji}
        t={t}
      />

      {/* Primary hero card — the one mode to play right now, selected by pickPrimaryMode */}
      {primaryModeId === 'connections' && showsConnections ? (
        <DailyModeQuestCard
          mode={questCardModes(canSeeInWorkModes).find((m) => m.id === 'connections')!}
          locale={currentLanguage}
          t={t}
          played={connectionsPlayed}
          delay={0.15}
        />
      ) : modesInfo.find((m) => m.id === primaryModeId && m.visible) ? (
        <QuestCard
          challengeId={primaryModeId}
          icon={modesInfo.find((m) => m.id === primaryModeId)?.icon || <Timer className="w-8 h-8" />}
          title={modesInfo.find((m) => m.id === primaryModeId)?.title || 'Quest'}
          tagline={t(`${primaryModeId === 'word-hunt' ? 'daily.wordHunt.desc' : primaryModeId === 'word-wheel' ? 'wordWheel.hub.wordWheelDesc' : primaryModeId === 'word-tower' ? 'wordTower.daily.questDesc' : 'connections.daily.questDesc'}`)}
          color={(modesInfo.find((m) => m.id === primaryModeId)?.color || 'orange') as 'orange' | 'yellow' | 'cyan'}
          status={
            primaryModeId === 'word-hunt'
              ? wordHuntStatus
              : primaryModeId === 'word-wheel'
                ? (wordWheelStatus === 'played' ? 'won' : 'new')
                : 'new'
          }
          isLoadingStatus={primaryModeId === 'word-hunt' ? dailyStatus.loading : false}
          onPlay={modesInfo.find((m) => m.id === primaryModeId)?.onPlay || (() => {})}
          timeMode={primaryModeId === 'word-hunt' || primaryModeId === 'word-wheel' ? 'timed' : 'relaxed'}
          timeModeLabel={t(primaryModeId === 'word-hunt' || primaryModeId === 'word-wheel' ? 'daily.timedQuest' : 'daily.relaxedQuest')}
          previewImageUrl={`/daily/${primaryModeId === 'word-hunt' ? 'word-hunt' : primaryModeId === 'word-wheel' ? 'word-wheel' : primaryModeId === 'word-tower' ? 'word-tower' : 'word-hunt'}-mascot.jpg`}
          previewImageAlt={modesInfo.find((m) => m.id === primaryModeId)?.title || 'Quest'}
          currentLanguage={currentLanguage}
          buttonText={t('daily.startQuest')}
          delay={0.15}
        />
      ) : null}

      {/* Secondary modes — compact single-line cards for the modes not selected as primary */}
      <div className="w-full flex flex-col gap-2" data-testid="secondary-modes">
        {modesInfo
          .filter((m) => m.visible && m.id !== primaryModeId)
          .map((mode, i) => (
            <CompactModeRow
              key={mode.id}
              icon={mode.icon}
              title={mode.title}
              color={mode.color}
              onPlay={mode.onPlay}
              played={mode.played}
              delay={0.25 + i * 0.05}
            />
          ))}
      </div>

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
          streak={dailyPlayedStatus.streak.current}
          onClose={() => setClaimedChest(null)}
        />
      )}

      {/* The global bottom banner is the app-wide AnchoredNativeBanner, pinned to
          the viewport bottom on this hub via the admob-routes allowlist — NOT an
          in-flow slot (which scrolled with the content). This container's
          `pb-bottom-stack` reserves the fixed-bottom stack (nav + banner) so the
          quest cards and weekly chest stay clear of it. */}
    </m.div>
  );
}