'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { Timer, CircleDot, Building2, Link2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

import { hasPlayedWordWheelToday } from '@/utils/dailyChallenge/storage';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import type { Language } from '@/types';
import type { PendingChest } from '@/hooks/useWeeklyChest';

import { visibleDailyModes, pickPrimaryMode, type DailyModePlayState, type DailyModeId } from '@/lib/dailyModes';
import { dailyBestKey, isDailyTowerPlayed } from '@/lib/wordTower/dailyBest';
import { hasPlayedConnectionsToday } from '@/lib/connections/dailyClient';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import { ScoreGauntletBanner } from './ScoreGauntletBanner';
import { DailyMissionsHeader } from './landing/DailyMissionsHeader';
import { DailyHubHeader } from './landing/DailyHubHeader';
import { QuestCard } from './landing/QuestCard';
import { CompactModeRow } from './landing/CompactModeRow';
import { DailyJourney } from './landing/DailyJourney';
import { DailyAllClearCard } from './landing/DailyAllClearCard';
import { LeaderboardTeaser } from './landing/LeaderboardTeaser';
import WeeklyChestCard from './WeeklyChestCard';
import WeeklyChestModal from './WeeklyChestModal';

interface DailyChallengeLandingProps {
  onSelectWordHunt: () => void;
  onSelectWordWheel: () => void;
  currentLanguage: Language;
}

/**
 * Isolated so useSearchParams cannot suspend the quest cards. Nested fallback
 * is empty — never PageLoader — or the hub SSRs "Loading Daily Challenge..."
 * and React throws minified #419.
 */
function DailyShareDecorations({ t }: { t: (key: string) => string }) {
  const searchParams = useSearchParams();
  const challengerName = searchParams?.get('whName') || null;
  const challengerScore = searchParams?.get('whScore')
    ? Number(searchParams.get('whScore'))
    : null;
  const challengerEmoji = searchParams?.get('whEmoji') || null;

  return (
    <ScoreGauntletBanner
      challengerName={challengerName}
      challengerScore={challengerScore}
      challengerEmoji={challengerEmoji}
      t={t}
    />
  );
}

export function DailyChallengeLanding({
  onSelectWordHunt,
  onSelectWordWheel,
  currentLanguage,
}: DailyChallengeLandingProps) {
  const { t } = useLanguage();
  const { user, canSeeInWorkModes } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Use the centralized hook for Word Hunt status + streak (fetches from server for authed users)
  const dailyStatus = useDailyChallengeStatus(currentLanguage);

  // Use the unified hook for played status and streak across all modes and devices
  const dailyPlayedStatus = useDailyPlayedStatus();

  const [claimedChest, setClaimedChest] = useState<PendingChest | null>(null);

  // This device's played markers (Word Wheel result, Word Tower best, Word
  // Bridge marker). Read in a LAYOUT effect so the first client paint already
  // has them — a passive effect painted the optimistic all-unplayed hub (Word
  // Wheel hero) and flipped a frame later. `resolved` stays false through SSR,
  // where storage cannot be read, so the server HTML is the neutral skeleton.
  const [local, setLocal] = useState({ resolved: false, wheel: false, tower: false, connections: false });
  const readLocal = useCallback(() => {
    const next = { resolved: true, wheel: false, tower: false, connections: false };
    try { next.wheel = hasPlayedWordWheelToday(currentLanguage); } catch { /* storage disabled */ }
    try { next.tower = isDailyTowerPlayed(localStorage.getItem(dailyBestKey(utcDateKey()))); } catch { /* storage disabled */ }
    try { next.connections = hasPlayedConnectionsToday(); } catch { /* storage disabled */ }
    setLocal(next);
  }, [currentLanguage]);

  useLayoutEffect(() => {
    readLocal();
  }, [readLocal, user?.id]);

  // Re-read when the player comes back from a game (tab return, back/forward,
  // client navigation back to the hub) and refresh the Word Hunt status.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      readLocal();
      dailyStatus.refresh();
    };
    const onPopState = () => {
      readLocal();
      dailyStatus.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('popstate', onPopState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readLocal, user?.id]);

  useEffect(() => {
    if (pathname && pathname.endsWith('/daily')) {
      readLocal();
      dailyStatus.refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Per-mode "done" comes from ONE rule for every mode: the unified played
  // hook (server-backed when signed in, merged with this device's flags) OR
  // this device's own marker. Played only ever moves forward within a day.
  const played = dailyPlayedStatus.today;
  const wordWheelPlayed = played.wordWheel || local.wheel;
  const towerDone = played.wordTower || local.tower;
  const connectionsDone = played.connections || local.connections;

  // Word Hunt keeps its won/lost LABEL from the hunt status (a lost hunt stays
  // the hero for the retry). NOT gated on `loading`: every refresh (tab
  // return, back nav) flips loading on while keeping the last-known hasPlayed,
  // and mapping loading → 'new' bounced the hero back to a finished Word Hunt
  // (rules/60 Class 1). Played on another device but unknown to the hunt
  // status yet → counted as done.
  const wordHuntStatus: 'new' | 'won' | 'lost' = dailyStatus.hasPlayed
    ? dailyStatus.hasSolved
      ? 'won'
      : 'lost'
    : played.wordHunt
      ? 'won'
      : 'new';

  // Pessimistic until every source of played-state has resolved: render a
  // neutral skeleton rather than a Word Wheel hero that flips.
  const statusReady = local.resolved && !dailyPlayedStatus.loading;

  // Word Tower is the 3rd quest: only expand the bar to /3 and count it when the
  // player actually sees the card. Read off the REGISTRY, not `questModes` — Word
  // Tower is drawn with the shared QuestCard now, so it is deliberately absent
  // from the generic registry-card list and checking there would silently drop
  // the bar back to /2. Connections is the 4th quest (generic card) with the
  // same registry-driven rule.
  const visibleModes = visibleDailyModes(canSeeInWorkModes);
  const showsWordTower = visibleModes.some((mode) => mode.id === 'word-tower');
  const showsConnections = visibleModes.some((mode) => mode.id === 'connections');
  const wordTowerHref = `/${currentLanguage}/word-tower/daily`;
  // Daily flow: Word Wheel → Word Hunt are required; Connections and Word Tower
  // are optional bonuses that never count toward clearing the day.
  const totalQuests = 2;
  const wordHuntPlayed = wordHuntStatus === 'won' || wordHuntStatus === 'lost';
  const completedCount = (wordWheelPlayed ? 1 : 0) + (wordHuntPlayed ? 1 : 0);

  // Build play state for primary mode selection
  const playState: DailyModePlayState = {
    wordHunt: wordHuntStatus,
    wordWheel: wordWheelPlayed ? 'played' : 'new',
    wordTower: towerDone,
    connections: connectionsDone,
  };

  // Determine which mode should be the primary (hero) card
  const primaryModeId = pickPrimaryMode(playState);

  type ModeInfo = {
    id: DailyModeId;
    title: string;
    tagline: string;
    icon: ReactNode;
    color: 'orange' | 'yellow' | 'cyan' | 'purple';
    /** Mascot shipped under public/daily — one per mode, no fallbacks. */
    artUrl: string;
    played: boolean;
    onPlay: () => void;
    visible: boolean;
    timeMode: 'timed' | 'relaxed';
    badge?: string;
  };

  const modesInfo: ModeInfo[] = [
    {
      id: 'word-wheel',
      title: t('wordWheel.hub.wordWheelQuest'),
      tagline: t('wordWheel.hub.wordWheelDesc'),
      icon: <CircleDot className="w-8 h-8" />,
      color: 'yellow',
      artUrl: '/daily/word-wheel-mascot.jpg',
      played: wordWheelPlayed,
      onPlay: onSelectWordWheel,
      visible: true,
      timeMode: 'timed',
    },
    {
      id: 'word-hunt',
      title: t('daily.wordHunt.title'),
      tagline: t('daily.wordHunt.desc'),
      icon: <Timer className="w-8 h-8" />,
      color: 'orange',
      artUrl: '/daily/word-hunt-mascot.jpg',
      played: wordHuntPlayed,
      onPlay: onSelectWordHunt,
      visible: true,
      timeMode: 'timed',
    },
    {
      id: 'connections',
      title: t('connections.daily.questTitle'),
      tagline: t('connections.daily.questDesc'),
      icon: <Link2 className="w-8 h-8" />,
      color: 'purple',
      artUrl: '/daily/connections-mascot.jpg',
      played: connectionsDone,
      onPlay: () => router.push(`/${currentLanguage}/connections/daily`),
      visible: showsConnections,
      timeMode: 'relaxed',
      badge: t('daily.journeyOptional'),
    },
    {
      id: 'word-tower',
      title: t('wordTower.daily.questTitle'),
      tagline: t('wordTower.daily.questDesc'),
      icon: <Building2 className="w-8 h-8" />,
      color: 'cyan',
      artUrl: '/daily/word-tower-mascot.jpg',
      played: towerDone,
      onPlay: () => router.push(wordTowerHref),
      visible: showsWordTower,
      timeMode: 'relaxed',
      badge: t('daily.journeyOptional'),
    },
  ];

  const visibleModesInfo = modesInfo.filter((mode) => mode.visible);
  // Whole day done → closure card in the hero slot. A LOST Word Hunt is not
  // "done": it stays the hero so the retry is one tap away.
  const dayCleared = visibleModesInfo.every((mode) => mode.played) && wordHuntStatus !== 'lost';
  const primaryMode = dayCleared
    ? undefined
    : visibleModesInfo.find((mode) => mode.id === primaryModeId);

  return (
    // No full-page opacity-0 entrance: the hub appears with its content
    // (rules/60 Class 5 — fullscreen opacity tweens flash on mobile Chromium).
    <div
      className="flex-1 flex flex-col items-center px-3 py-2 sm:px-4 sm:py-2 pb-bottom-stack sm:pb-2 max-w-3xl mx-auto w-full relative gap-3"
    >
      <DailyHubHeader />

      <DailyMissionsHeader completedCount={completedCount} total={totalQuests} />

      {statusReady ? (
        <>
        <DailyJourney
          currentId={primaryModeId}
          steps={visibleModesInfo.map((md) => ({
            id: md.id,
            title: md.title,
            icon: md.icon,
            artUrl: md.artUrl,
            played: md.played,
            optional: md.id === 'connections' || md.id === 'word-tower',
            onPlay: md.onPlay,
          }))}
        />

        {completedCount >= totalQuests && !dayCleared && (
          <p className="w-full text-center text-sm font-black text-neo-lime" data-testid="required-done-note">
            {t('daily.journeyAllRequiredDone')}
          </p>
        )}
        </>
      ) : (
        <div className="w-full h-16 rounded-xl skeleton" aria-hidden="true" data-testid="hub-journey-skeleton" />
      )}

      {/* Score Gauntlet Banner: shown when arriving via a challenge share link.
          Nested empty Suspense so useSearchParams does not deopt the hub SSR. */}
      <Suspense fallback={null}>
        <DailyShareDecorations t={t} />
      </Suspense>

      {statusReady ? (
        <>
        {dayCleared && <DailyAllClearCard streak={dailyPlayedStatus.streak.current} />}

        {/* Primary hero card — the one mode to play right now, selected by pickPrimaryMode */}
        {primaryMode && (
          <QuestCard
            challengeId={primaryMode.id}
            icon={primaryMode.icon}
            title={primaryMode.title}
            tagline={primaryMode.tagline}
            color={primaryMode.color}
            status={
              primaryMode.id === 'word-hunt'
                ? wordHuntStatus
                : primaryMode.played
                  ? 'won'
                  : 'new'
            }
            isLoadingStatus={primaryMode.id === 'word-hunt' ? dailyStatus.loading : false}
            onPlay={primaryMode.onPlay}
            timeMode={primaryMode.timeMode}
            timeModeLabel={t(primaryMode.timeMode === 'timed' ? 'daily.timedQuest' : 'daily.relaxedQuest')}
            previewImageUrl={primaryMode.artUrl}
            buttonText={t('daily.startQuest')}
            delay={0.15}
          />
        )}

        {/* Secondary modes — compact single-line cards for the modes not selected as primary */}
        <div className="w-full flex flex-col gap-2" data-testid="secondary-modes">
          {visibleModesInfo
            .filter((m) => m.id !== primaryMode?.id)
            .map((mode, i) => (
              <CompactModeRow
                key={mode.id}
                icon={mode.icon}
                title={mode.title}
                color={mode.color}
                artUrl={mode.artUrl}
                onPlay={mode.onPlay}
                played={mode.played}
                badge={mode.badge}
                doneLabel={t('daily.journeyDone')}
                delay={0.25 + i * 0.05}
              />
            ))}
        </div>
        </>
      ) : (
        <div className="w-full flex flex-col gap-3" aria-hidden="true" data-testid="hub-status-skeleton">
          <div className="w-full h-56 rounded-xl skeleton" />
          <div className="w-full h-14 rounded-xl skeleton" />
          <div className="w-full h-14 rounded-xl skeleton" />
        </div>
      )}

      <LeaderboardTeaser currentLanguage={currentLanguage} />

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
    </div>
  );
}
