'use client';

import React, { useState, useEffect, useCallback, memo, useMemo, useRef, useId } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { useDailyBoards } from '@/hooks/useDailyBoards';
import { useSeasonBoard } from '@/hooks/useSeasonBoard';
import { useWindowedList } from '@/hooks/useWindowedList';
import type { Language } from '@/types';
import { getCurrentSeasonDynamic, getSeasonIdentity } from '@/lib/seasons';
import { TodayParticipantRow, AllTimeParticipantRow, SeasonParticipantRow } from './DailyLeaderboardRow';
import { WordWheelWordsModal } from './WordWheelWordsModal';
import { WordHuntWordsModal } from './WordHuntWordsModal';
import ChaseBanner from './ChaseBanner';
import type { ChaseParticipant } from './chaseTarget';
import { participantKey } from './leaderboardLive';
import { friendsBoard, isViewer, youReadout } from './leaderboardRows';
import ConnectionsDailyTab from './ConnectionsDailyTab';
import LeaderboardTabSwitch, { tabPanelId } from './LeaderboardTabSwitch';
import LeaderboardHeader from './LeaderboardHeader';
import SeasonPicker from './SeasonPicker';
import YouReadoutBar from './YouReadoutBar';
import { LeaderboardEmpty, LeaderboardError, LeaderboardSkeleton } from './LeaderboardStates';
import type {
  AllTimeParticipant,
  DailyParticipant,
  LanguageScope,
  LeaderboardScope,
  LeaderboardTab,
  SeasonParticipant,
  T,
} from './leaderboardTypes';

export type {
  DailyParticipant,
  AllTimeParticipant,
  SeasonParticipant,
  DailySeasonSummary,
  LeaderboardScope,
} from './leaderboardTypes';

const LANGUAGE_SCOPE_STORAGE_KEY = 'lexiclash_daily_lb_language_scope';
/** ChaseBanner finds the viewer by id; combined rows carry none, so the viewer's row is tagged with this. */
const VIEWER = '__viewer__';

interface TabbedDailyLeaderboardProps {
  puzzleDate: string;
  language: Language;
  currentPlayerId?: string | null;
  currentGuestFingerprint?: string | null;
  onParticipantCountChange?: (count: number) => void;
  onCurrentUserRankChange?: (rank: number | null) => void;
  compact?: boolean;
  maxVisible?: number;
  t: T;
  defaultTab?: LeaderboardTab;
  scope?: LeaderboardScope;
  /** Words the viewer found in today's Word Wheel: opponent rows open a "words you missed" diff. */
  myWheelWordsFound?: string[];
  /** Words the viewer discovered in today's Word Hunt: opponent rows open their path. */
  myHuntWordsDiscovered?: string[];
}

function readStoredLanguageScope(): LanguageScope {
  if (typeof window === 'undefined') return 'all';
  try {
    return window.localStorage.getItem(LANGUAGE_SCOPE_STORAGE_KEY) === 'mine' ? 'mine' : 'all';
  } catch {
    return 'all';
  }
}

function writeStoredLanguageScope(scope: LanguageScope): void {
  try {
    window.localStorage.setItem(LANGUAGE_SCOPE_STORAGE_KEY, scope);
  } catch {
    /* storage unavailable — the choice still applies this session */
  }
}

const TabbedDailyLeaderboard: React.FC<TabbedDailyLeaderboardProps> = ({
  puzzleDate,
  language,
  currentPlayerId,
  currentGuestFingerprint,
  onParticipantCountChange,
  onCurrentUserRankChange,
  compact = false,
  maxVisible = 10,
  t,
  defaultTab = 'today',
  scope = 'combined',
  myWheelWordsFound,
  myHuntWordsDiscovered,
}) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(defaultTab);
  const idPrefix = useId().replace(/:/g, '');

  // Global by default: a player who solved in Hebrew must see themself from an
  // English hub. `mine` narrows to the puzzle language.
  const [languageScope, setLanguageScope] = useState<LanguageScope>(readStoredLanguageScope);
  const fetchLanguage = languageScope === 'mine' ? language : 'all';
  const toggleLanguageScope = useCallback(() => {
    setLanguageScope((prev) => {
      const next: LanguageScope = prev === 'all' ? 'mine' : 'all';
      writeStoredLanguageScope(next);
      return next;
    });
  }, []);

  const [wordsModalPlayer, setWordsModalPlayer] = useState<DailyParticipant | null>(null);
  const [huntWordsModalPlayer, setHuntWordsModalPlayer] = useState<DailyParticipant | null>(null);
  const openWheelWords = useCallback((p: DailyParticipant) => setWordsModalPlayer(p), []);
  const openHuntWords = useCallback((p: DailyParticipant) => setHuntWordsModalPlayer(p), []);

  const viewer = useMemo(
    () => ({ playerId: currentPlayerId, guestFingerprint: currentGuestFingerprint }),
    [currentPlayerId, currentGuestFingerprint],
  );
  const isMe = useCallback(
    (p: { is_you?: boolean; player_id: string | null; guest_fingerprint: string | null }) => isViewer(p, viewer),
    [viewer],
  );

  const { today, allTime, movements } = useDailyBoards({
    puzzleDate, language, fetchLanguage, scope, activeTab, guestFingerprint: currentGuestFingerprint,
  });
  const season = useSeasonBoard({ active: activeTab === 'season', fetchLanguage, scope });

  const { friends } = useFriends();
  const friendUserIds = useMemo(() => new Set(friends.map(f => f.odUserId)), [friends]);

  const todayRows = useMemo(() => today.data?.rows ?? [], [today.data]);
  const friendsRows = useMemo(
    () => friendsBoard(
      todayRows,
      scope === 'combined' ? (p) => !!p.is_friend : (p) => !!p.player_id && friendUserIds.has(p.player_id),
      viewer,
    ),
    [todayRows, scope, friendUserIds, viewer],
  );
  const allTimeRows = useMemo(() => (allTime.data ?? []).filter(p => p.games_won > 0), [allTime.data]);

  const seasonRows = season.rows;
  const participants = useMemo((): Array<DailyParticipant | AllTimeParticipant | SeasonParticipant> =>
    activeTab === 'today' ? todayRows
      : activeTab === 'friends' ? friendsRows
        : activeTab === 'season' ? seasonRows
          : activeTab === 'alltime' ? allTimeRows
            : [],
  [activeTab, todayRows, friendsRows, seasonRows, allTimeRows]);
  const totalCount =
    activeTab === 'today' ? Math.max(today.data?.total ?? 0, todayRows.length)
      : activeTab === 'connections' ? 0
        : participants.length;
  const board = activeTab === 'season' ? season : activeTab === 'alltime' ? allTime : today;
  const loading = activeTab !== 'connections' && board.loading;
  const error = activeTab !== 'connections' && board.error;

  const anchorIndex = useMemo(
    () => participants.findIndex((p) => isMe(p as DailyParticipant)),
    [participants, isMe],
  );
  const viewerRow = anchorIndex >= 0 ? participants[anchorIndex] : null;
  const win = useWindowedList(participants.length, anchorIndex, maxVisible, `${activeTab}|${season.selectedSeasonId}`);
  const visibleParticipants = participants.slice(win.start, win.end);

  const onCountRef = useRef(onParticipantCountChange);
  onCountRef.current = onParticipantCountChange;
  const onRankRef = useRef(onCurrentUserRankChange);
  onRankRef.current = onCurrentUserRankChange;
  // Count and rank are reported for Today only, so a caller never pairs today's rank with another tab's total.
  useEffect(() => {
    if (!loading && !error && activeTab === 'today') onCountRef.current?.(totalCount);
  }, [totalCount, loading, error, activeTab]);
  const todayRank = todayRows.find(isMe)?.rank_position ?? null;
  useEffect(() => {
    if (activeTab === 'today') onRankRef.current?.(todayRank);
  }, [todayRank, activeTab]);

  // The pinned readout shows only while the viewer's own row is not on screen.
  // State, not a ref: the list mounts late (after the crossfade's exit), and the observer must re-run then.
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const [viewerRowInView, setViewerRowInView] = useState(false);
  const viewerInWindow = anchorIndex >= win.start && anchorIndex < win.end;
  useEffect(() => {
    const el = viewerInWindow ? listEl?.querySelector('[data-viewer-row="true"]') : null;
    if (!el) {
      setViewerRowInView(false);
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setViewerRowInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setViewerRowInView(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [listEl, viewerInWindow, win.start, win.end, activeTab]);
  const readout = viewerRow ? youReadout(viewerRow.rank_position, totalCount) : null;
  const jumpToViewer = useCallback(() => {
    win.recenter();
    requestAnimationFrame(() => {
      listEl?.querySelector('[data-viewer-row="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [win, listEl]);

  const chaseRows = useMemo(
    () => todayRows.map((p) => (isMe(p) ? { ...p, player_id: VIEWER } : p)) as ChaseParticipant[],
    [todayRows, isMe],
  );

  const accentIdentity = getSeasonIdentity(season.currentSeasonId ?? getCurrentSeasonDynamic().id);
  const selectedSeason = useMemo(
    () => season.seasons?.find(s => s.id === season.selectedSeasonId) ?? null,
    [season.seasons, season.selectedSeasonId],
  );
  const selectedIdentity = selectedSeason ? getSeasonIdentity(selectedSeason.id) : accentIdentity;

  const isLoading = loading && participants.length === 0;
  const isEmpty = !loading && !error && participants.length === 0;
  const prefersReducedMotion = useReducedMotion();
  const solvedInScope = scope === 'word-hunt' ? today.data?.huntSolved ?? 0 : scope === 'word-wheel' ? today.data?.wheelSolved ?? 0 : 0;
  // Guests are recorded but not ranked on the per-mode boards; never claim "nobody" when they solved.
  const solversToday = Math.max(solvedInScope, today.data?.guestCount ?? 0);

  const contentKey = activeTab === 'connections' ? 'connections'
    : isLoading ? 'loading' : error ? 'error' : isEmpty ? `empty-${activeTab}` : `list-${activeTab}`;
  const contentTransition = prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const };
  const contentVariants = prefersReducedMotion
    ? { enter: {}, center: {}, exit: {} }
    : { enter: { opacity: 0, scale: 0.98 }, center: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.98 } };

  const loadMoreClass = 'w-full py-2 text-xs sm:text-sm font-bold text-neo-white/80 hover:text-neo-white flex items-center justify-center gap-1.5 transition-colors rounded-neo bg-neo-navy border-2 border-neo-black/60 hover:border-neo-black';

  const renderList = () => (
    // --bottom-stack-height keeps "show more" clear of the fixed AdMob banner.
    <div ref={setListEl} className="space-y-2 pb-[var(--bottom-stack-height)] md:pb-6">
      {win.above > 0 && (
        <button type="button" onClick={win.loadAbove} className={loadMoreClass}>
          <ChevronUp aria-hidden className="w-4 h-4" />
          {t('daily.showMore')} ({win.above} {t('daily.more')})
        </button>
      )}

      <AnimatePresence mode="popLayout">
        {activeTab === 'today' || activeTab === 'friends' ? (
          (visibleParticipants as DailyParticipant[]).map((participant, index) => {
            // The "words you missed" diff only makes sense against the SAME puzzle.
            const sameLanguage = !participant.language || participant.language === language;
            const key = participantKey(participant);
            return (
              <TodayParticipantRow
                key={key || `idx-${win.start + index}`}
                participant={participant}
                index={index}
                isCurrentUser={isMe(participant)}
                compact={compact}
                t={t}
                onViewWheelWords={myWheelWordsFound !== undefined && sameLanguage ? openWheelWords : undefined}
                onViewHuntWords={myHuntWordsDiscovered !== undefined && sameLanguage ? openHuntWords : undefined}
                scope={scope}
                showLanguage={languageScope === 'all'}
                movement={key && activeTab === 'today' ? movements.get(key) ?? null : null}
              />
            );
          })
        ) : activeTab === 'season' ? (
          (visibleParticipants as SeasonParticipant[]).map((participant, index) => (
            <SeasonParticipantRow
              key={participant.player_identifier || `idx-${win.start + index}`}
              participant={participant}
              index={index}
              isCurrentUser={isMe(participant)}
              compact={compact}
              t={t}
              accentColor={selectedIdentity.accentColor}
            />
          ))
        ) : (
          (visibleParticipants as AllTimeParticipant[]).map((participant, index) => (
            <AllTimeParticipantRow
              key={participant.player_identifier || `idx-${win.start + index}`}
              participant={participant}
              index={index}
              isCurrentUser={isMe(participant)}
              compact={compact}
              t={t}
            />
          ))
        )}
      </AnimatePresence>

      {win.below > 0 && (
        <button type="button" onClick={win.loadBelow} className={loadMoreClass}>
          <ChevronDown aria-hidden className="w-4 h-4" />
          {t('daily.showMore')} ({win.below} {t('daily.more')})
        </button>
      )}

      {readout && !(viewerInWindow && viewerRowInView) && (
        <YouReadoutBar t={t} readout={readout} onJump={jumpToViewer} />
      )}
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'connections') return <ConnectionsDailyTab puzzleDate={puzzleDate} />;
    if (isLoading) return <LeaderboardSkeleton rows={Math.min(maxVisible, 3)} />;
    if (error) return <LeaderboardError t={t} onRetry={board.reload} />;
    if (isEmpty) return <LeaderboardEmpty t={t} tab={activeTab} solversToday={solversToday} />;
    return renderList();
  };

  return (
    <>
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className={`
          relative overflow-clip
          bg-neo-navy-light rounded-neo-lg border-2 border-neo-black
          ${compact ? 'p-3' : 'p-4 sm:p-5'}
          shadow-hard
          ${accentIdentity.gridSkinClass}
        `}
        data-season-skin={accentIdentity.gridSkinClass}
      >
        {/* Season accent — the month's color runs along the top of every daily board. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accentIdentity.accentColor }} />

        <LeaderboardHeader
          t={t}
          scope={scope}
          activeTab={activeTab}
          language={language}
          languageScope={languageScope}
          onToggleLanguageScope={toggleLanguageScope}
          settled={!isLoading && !error}
          totalCount={totalCount}
          today={today.data}
        />

        {scope === 'combined' && activeTab === 'today' && (
          <p className="-mt-1.5 mb-3 text-[11px] sm:text-xs font-medium text-neo-white/60" data-testid="score-explainer">
            {t('daily.leaderboard.scoreExplainer')}
          </p>
        )}

        {/* Who to beat — today only: the other tabs rank on cumulative totals. */}
        {activeTab === 'today' && (
          <ChaseBanner
            participants={chaseRows}
            playerId={VIEWER}
            totalPlayers={totalCount}
            loading={isLoading}
            t={t}
            className="mb-4"
          />
        )}

        <div className="mb-4">
          <LeaderboardTabSwitch activeTab={activeTab} onTabChange={setActiveTab} t={t} idPrefix={idPrefix} />
        </div>

        {activeTab === 'season' && (
          <SeasonPicker
            t={t}
            seasons={season.seasons}
            selected={selectedSeason}
            selectedId={season.selectedSeasonId}
            onSelect={season.setSelectedSeasonId}
          />
        )}

        <div role="tabpanel" id={tabPanelId(idPrefix, activeTab)} aria-labelledby={`${tabPanelId(idPrefix, activeTab)}-tab`}>
          <AnimatePresence mode="wait">
            <m.div key={contentKey} variants={contentVariants} initial="enter" animate="center" exit="exit" transition={contentTransition}>
              {renderContent()}
            </m.div>
          </AnimatePresence>
        </div>
      </m.div>

      <WordWheelWordsModal
        isOpen={!!wordsModalPlayer}
        onClose={() => setWordsModalPlayer(null)}
        puzzleDate={puzzleDate}
        language={language}
        playerId={wordsModalPlayer?.player_id ?? null}
        guestFingerprint={wordsModalPlayer?.guest_fingerprint ?? null}
        playerName={wordsModalPlayer?.display_name ?? ''}
        myWordsFound={myWheelWordsFound}
        t={t}
      />

      <WordHuntWordsModal
        isOpen={!!huntWordsModalPlayer}
        onClose={() => setHuntWordsModalPlayer(null)}
        playerName={huntWordsModalPlayer?.display_name ?? ''}
        wordsDiscovered={huntWordsModalPlayer?.words_discovered ?? []}
        myWordsDiscovered={myHuntWordsDiscovered}
        t={t}
      />
    </>
  );
};

export default memo(TabbedDailyLeaderboard);
