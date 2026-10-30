'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Timer, CircleDot, Building2, Link2, CalendarDays } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

import { hasPlayedWordWheelToday } from '@/utils/dailyChallenge/storage';
import { getPuzzleNumber } from '@/utils/dailyChallenge/dateUtils';
import { parseRivalFromParams } from '@/utils/dailyChallenge/rivalChallenge';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import type { Language } from '@/types';
import type { PendingChest } from '@/hooks/useWeeklyChest';

import {
  DAILY_MODES,
  requiredDailyModes,
  dailyModeHref,
  pickPrimaryMode,
  type DailyModeDef,
  type DailyModePlayState,
  type DailyModeId,
} from '@/lib/dailyModes';
import { dailyBestKey, isDailyTowerPlayed } from '@/lib/wordTower/dailyBest';
import { hasPlayedConnectionsToday } from '@/lib/connections/dailyClient';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import { ScoreGauntletBanner } from './ScoreGauntletBanner';
import { DailyMissionsHeader } from './landing/DailyMissionsHeader';
import { DailyHubHeader } from './landing/DailyHubHeader';
import { DailyHubIntro } from './landing/DailyHubIntro';
import { NewcomerTip } from './landing/NewcomerTip';
import { QuestCard } from './landing/QuestCard';
import { CompactModeRow } from './landing/CompactModeRow';
import { DailyAllClearCard } from './landing/DailyAllClearCard';
import { LeaderboardTeaser } from './landing/LeaderboardTeaser';
import { useUtcDay } from './landing/useUtcDay';
import { WeeklyChestPlaceholder } from './WeeklyChestPlaceholder';

// Below the fold and authed-only: keep gsap + the chest modals out of the hub's first load.
const WeeklyChestCard = dynamic(() => import('./WeeklyChestCard'), {
  ssr: false,
  loading: () => <WeeklyChestPlaceholder />,
});
const WeeklyChestModal = dynamic(() => import('./WeeklyChestModal'), { ssr: false });

interface DailyChallengeLandingProps {
  onSelectWordHunt: () => void;
  onSelectWordWheel: () => void;
  currentLanguage: Language;
}

const MODE_ICON: Record<DailyModeId, ReactNode> = {
  'word-wheel': <CircleDot className="w-8 h-8" />,
  'word-hunt': <Timer className="w-8 h-8" />,
  connections: <Link2 className="w-8 h-8" />,
  'word-tower': <Building2 className="w-8 h-8" />,
};

const REQUIRED_COUNT = requiredDailyModes(DAILY_MODES).length;

/**
 * Isolated so useSearchParams cannot suspend the quest cards. Nested fallback
 * is empty — never PageLoader — or the hub SSRs "Loading Daily Challenge..."
 * and React throws minified #419. Only a challenge for TODAY's puzzle shows.
 */
function DailyShareDecorations({ t }: { t: (key: string) => string }) {
  const searchParams = useSearchParams();
  const params: Record<string, string | undefined> = {};
  for (const key of ['whName', 'whEmoji', 'whScore', 'whPuzzle']) {
    params[key] = searchParams?.get(key) ?? undefined;
  }
  const rival = parseRivalFromParams(params, getPuzzleNumber());
  if (!rival) return null;

  return (
    <ScoreGauntletBanner
      challengerName={rival.name}
      challengerScore={rival.score}
      challengerEmoji={rival.emoji}
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
  const { user } = useAuth();
  const router = useRouter();
  const day = useUtcDay();

  const dailyStatus = useDailyChallengeStatus(currentLanguage);
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

  // The status hooks refetch on mount and tab return themselves; the hub only
  // re-reads this device's markers then, and refreshes on back/forward (bfcache).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') readLocal();
    };
    const onPopState = () => {
      readLocal();
      dailyStatus.refresh();
      dailyPlayedStatus.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('popstate', onPopState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readLocal, user?.id]);

  // A tab left open past 00:00 UTC: drop yesterday's markers and hunt result.
  const firstDay = useRef(day);
  useEffect(() => {
    if (day === firstDay.current) return;
    firstDay.current = day;
    readLocal();
    dailyStatus.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  // Per-mode "done" comes from ONE rule for every mode: the unified played
  // hook (server-backed when signed in, merged with this device's flags) OR
  // this device's own marker. Played only ever moves forward within a day.
  const played = dailyPlayedStatus.today;
  const wordWheelPlayed = played.wordWheel || local.wheel;

  // Word Hunt keeps its won/lost LABEL from the hunt status (a lost hunt stays
  // the hero for the retry). NOT gated on `loading`: every refresh flips
  // loading on while keeping the last-known hasPlayed (rules/60 Class 1).
  // Played on another device but unknown to the hunt status yet → done.
  const wordHuntStatus: 'new' | 'won' | 'lost' = dailyStatus.hasPlayed
    ? dailyStatus.hasSolved
      ? 'won'
      : 'lost'
    : played.wordHunt
      ? 'won'
      : 'new';
  const wordHuntPlayed = wordHuntStatus !== 'new';

  const playedById: Record<DailyModeId, boolean> = {
    'word-wheel': wordWheelPlayed,
    'word-hunt': wordHuntPlayed,
    connections: played.connections || local.connections,
    'word-tower': played.wordTower || local.tower,
  };

  // Pessimistic until every source of played-state has resolved: render a
  // neutral skeleton rather than a Word Wheel hero that flips.
  const statusReady = local.resolved && !dailyPlayedStatus.loading;
  const anyPlayedToday = Object.values(playedById).some(Boolean);
  const isNewcomer = statusReady && !dailyPlayedStatus.hasPlayedBefore && !anyPlayedToday;

  const completedCount = requiredDailyModes(DAILY_MODES).filter((mode) => playedById[mode.id]).length;

  const playState: DailyModePlayState = {
    wordHunt: wordHuntStatus,
    wordWheel: wordWheelPlayed ? 'played' : 'new',
    wordTower: playedById['word-tower'],
    connections: playedById.connections,
  };
  const primaryModeId = pickPrimaryMode(playState);

  const playMode = (mode: DailyModeDef) => {
    if (mode.id === 'word-wheel') onSelectWordWheel();
    else if (mode.id === 'word-hunt') onSelectWordHunt();
    else router.push(dailyModeHref(mode, currentLanguage));
  };

  // Whole day done → closure card in the hero slot. A LOST Word Hunt is not
  // "done": it stays the hero so the retry is one tap away.
  const dayCleared = DAILY_MODES.every((mode) => playedById[mode.id]) && wordHuntStatus !== 'lost';
  const primaryMode = dayCleared ? undefined : DAILY_MODES.find((mode) => mode.id === primaryModeId);
  const showChest = Boolean(user) && statusReady && !isNewcomer;

  return (
    // No full-page opacity-0 entrance: the hub appears with its content
    // (rules/60 Class 5 — fullscreen opacity tweens flash on mobile Chromium).
    <div
      className="flex-1 flex flex-col items-center px-3 py-2 sm:px-4 sm:py-2 pb-bottom-stack sm:pb-2 max-w-3xl mx-auto w-full relative gap-3"
    >
      <DailyHubHeader />
      <DailyHubIntro />

      <DailyMissionsHeader completedCount={completedCount} total={REQUIRED_COUNT} ready={statusReady} />

      {/* Score Gauntlet Banner: shown when arriving via a challenge share link.
          Nested empty Suspense so useSearchParams does not deopt the hub SSR. */}
      <Suspense fallback={null}>
        <DailyShareDecorations t={t} />
      </Suspense>

      {statusReady ? (
        <>
        {isNewcomer && primaryMode && <NewcomerTip modeTitle={t(primaryMode.titleKey)} />}

        {completedCount >= REQUIRED_COUNT && wordHuntStatus !== 'lost' && !dayCleared && (
          <p className="w-full text-center text-sm font-black text-neo-lime" data-testid="required-done-note">
            {t('daily.hub.requiredDone')}
          </p>
        )}

        {dayCleared && <DailyAllClearCard streak={dailyPlayedStatus.streak.current} />}

        {/* Primary hero card — the one mode to play right now, selected by pickPrimaryMode */}
        {primaryMode && (
          <QuestCard
            challengeId={primaryMode.id}
            icon={MODE_ICON[primaryMode.id]}
            title={t(primaryMode.titleKey)}
            tagline={t(primaryMode.descKey)}
            color={primaryMode.accent}
            status={primaryMode.id === 'word-hunt' ? wordHuntStatus : playedById[primaryMode.id] ? 'won' : 'new'}
            isLoadingStatus={primaryMode.id === 'word-hunt' ? dailyStatus.loading : false}
            onPlay={() => playMode(primaryMode)}
            timeMode={primaryMode.timed ? 'timed' : 'relaxed'}
            timeModeLabel={t(primaryMode.timed ? 'daily.hub.timed' : 'daily.hub.noTimer')}
            previewImageUrl={primaryMode.art}
            buttonText={t('daily.hub.play')}
            delay={0.15}
          />
        )}

        {/* Every other mode once, in play order; bonus modes are tagged. */}
        <div className="w-full flex flex-col gap-2" data-testid="secondary-modes">
          {DAILY_MODES
            .filter((mode) => mode.id !== primaryMode?.id)
            .map((mode, i) => (
              <CompactModeRow
                key={mode.id}
                modeId={mode.id}
                icon={MODE_ICON[mode.id]}
                title={t(mode.titleKey)}
                color={mode.accent}
                artUrl={mode.art}
                onPlay={() => playMode(mode)}
                played={playedById[mode.id]}
                badge={mode.optional ? t('daily.hub.bonusTag') : undefined}
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

      <LeaderboardTeaser
        key={day}
        onViewFull={() => router.push(`/${currentLanguage}/daily/word-hunt?showLeaderboard=true`)}
      />

      {/* Weekly Chest: 7-day progress + tier reward (authed, after a first daily) */}
      {showChest && (
        <div className="w-full" data-testid="weekly-chest-slot">
          <WeeklyChestCard onChestClaimed={setClaimedChest} />
        </div>
      )}

      <Link
        href={`/${currentLanguage}/daily/archive`}
        data-testid="daily-archive-link"
        className="inline-flex items-center gap-1.5 min-h-11 px-3 text-xs font-bold text-neo-white/70 underline-offset-4 hover:text-neo-white hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan rounded-md"
      >
        <CalendarDays className="w-4 h-4" aria-hidden="true" />
        {t('daily.hub.pastPuzzles')}
      </Link>

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
