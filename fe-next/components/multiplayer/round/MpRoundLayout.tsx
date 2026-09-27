'use client';

import { memo, useMemo, useRef, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { toMpRoster, rankOf, type MpRosterPlayer, type MpRosterScoreLike, type MpRosterUserLike } from '@/lib/multiplayer/roster';
import { cn } from '@/lib/utils';
import { MpCallouts, MpRosterStrip } from '../shell';
import { WordsLadder, type LadderWord } from '../desktop/WordsLadder';
import { MpRoundHud } from './MpRoundHud';
import { MpScoreFloaters } from './MpScoreFloaters';
import { MpRecentWords } from './MpRecentWords';
import { MODE_TEXT, FALLBACK_MODE_ICON, MODE_ICONS, roundModeMeta, timerColor } from './roundModes';
import { useRoundJuice, type RoundSocket } from './useRoundJuice';
import { mergeServerWords, useServerAcceptedWords } from './useServerAcceptedWords';
import { useRoundFrameToastLane } from './useRoundToastLane';
import styles from './round.module.css';

interface FoundWordLike {
  word: string;
  score?: number;
  timestamp?: number;
  isValid?: boolean | null;
  duplicate?: boolean;
}

const counts = (w: FoundWordLike) => w.isValid !== false && !w.duplicate;

/** Valid, non-duplicate words, each once (an optimistic add + the server echo can list a word twice). */
function uniqueFound(words: readonly FoundWordLike[]): FoundWordLike[] {
  const seen = new Set<string>();
  return words.filter((w) => {
    const key = w.word.toLowerCase();
    if (!counts(w) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface MpRoundLayoutProps {
  meId: string;
  gameMode: string | null | undefined;
  remainingTime: number | null | undefined;
  totalTime: number | null | undefined;
  /** Live standings (server scores). */
  leaderboard: readonly MpRosterScoreLike[] | undefined;
  /** Seat list (updateUsers) — merged so a fresh round never reads "0 players". */
  users?: readonly MpRosterUserLike[];
  /** My found words (drives the found pill and the desktop ladder). */
  foundWords: readonly FoundWordLike[];
  /** Client combo chain — drives the meter only, never the points. */
  comboLevel: number;
  /** False while the countdown (or mode reveal) is up: board mounted, hidden. */
  revealed: boolean;
  onExit: () => void;
  /** The mode's play surface (board + word pill), rendered unchanged. */
  canvas: ReactNode;
  /** Live room socket, for server moments mpFeedback does not carry (special word). */
  socket?: RoundSocket | null;
}

/**
 * The in-round frame for host AND joiner, every grid mode. Board isolation
 * (perf rule 4): `canvas` is an element the view builds once per its own
 * render; the HUD, roster and juice read their own inputs in sibling
 * subtrees, so a timer tick or a leaderboard update never touches the board.
 */
function MpRoundLayoutImpl({
  meId,
  gameMode,
  remainingTime,
  totalTime,
  leaderboard,
  users,
  foundWords,
  comboLevel,
  revealed,
  onExit,
  canvas,
  socket,
}: MpRoundLayoutProps) {
  const { t } = useLanguage();
  const reduceMotion = useShouldReduceMotion();
  const mode = roundModeMeta(gameMode);
  const ModeIcon = MODE_ICONS[mode.icon] ?? FALLBACK_MODE_ICON;

  // One roster source for host and joiner (lib/multiplayer/roster).
  const prevRoster = useRef<MpRosterPlayer[] | undefined>(undefined);
  const roster = useMemo(() => {
    const next = toMpRoster(leaderboard, users, meId, { previous: prevRoster.current });
    // In-round the crown would read as "the leader" — hosting is a lobby fact.
    for (const p of next) p.isHost = false;
    prevRoster.current = next;
    return next;
  }, [leaderboard, users, meId]);
  const standings = useMemo(() => roster.map((p) => ({ username: p.id, score: p.score })), [roster]);
  const { rank, total } = rankOf(roster, meId);
  const myScore = roster.find((p) => p.id === meId)?.score ?? 0;

  const juice = useRoundJuice({ meId, standings, remainingTime, socket });
  // react-hot-toast leaves the HUD row for this frame's lane (phone: under the roster strip; desktop/TV: start rail).
  useRoundFrameToastLane();

  // My words, each once, with the SERVER's points: the view's list (optimistic
  // add + echo) merged with every server accept — blast submits straight to
  // the socket, so only the server knows its words (pitfall class 3).
  const accepted = useServerAcceptedWords();
  const ladder = useMemo<LadderWord[]>(
    () =>
      mergeServerWords(
        uniqueFound(foundWords).map((w, i) => ({ word: w.word, score: w.score ?? 0, ts: w.timestamp ?? i, userId: meId })),
        accepted,
        meId,
      ),
    [foundWords, accepted, meId],
  );
  const isBlast = mode.slug === 'blast';

  return (
    <div data-testid="mp-round-layout" data-mode={mode.slug} className={cn(styles.layout, 'relative flex-1 min-h-0 w-full h-full bg-neo-navy')}>
      <div className={cn(styles.areaHud, 'relative z-20 min-w-0')}>
        <MpRoundHud
          remainingTime={Math.max(0, remainingTime ?? 0)}
          totalTime={totalTime ?? 0}
          score={myScore}
          gain={juice.gain}
          rank={rank}
          total={total}
          rankFlipKey={juice.rankFlipKey}
          comboLevel={comboLevel}
          timerColor={timerColor(mode.color)}
          onExit={onExit}
        />
      </div>

      {/* Phone: live roster strip under the HUD */}
      <div className={cn(styles.areaRoster, 'min-w-0 px-3 pb-1')}>
        {/* At most four seats (the rest fold into "+N"; I always stay visible). From
            four seats a name only fits as "P…", so names go screen-reader-only and
            the avatars + scores carry the strip. */}
        <MpRosterStrip
          players={roster}
          meId={meId}
          layout="row"
          max={4}
          showScores
          className={cn('justify-center gap-1.5', roster.length >= 4 && '[&_[data-player]>span[dir=auto]]:sr-only')}
        />
      </div>

      {/* Desktop: roster rail */}
      <aside className={cn(styles.areaLeft, 'min-h-0 flex-col gap-2 pt-3')} aria-label={t('mpUi.round.players')}>
        <h2 className="font-neo-display font-bold uppercase tracking-wider text-xs tv:text-lg text-neo-white/60 px-1">{t('mpUi.round.players')}</h2>
        {/* Full height, like YOUR WORDS opposite: the column is framed, never a void under a short roster. */}
        <div data-testid="mp-rail-roster" className="flex-1 min-h-0 overflow-y-auto rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard p-3 tv:p-4">
          <MpRosterStrip
            players={roster}
            meId={meId}
            layout="rail"
            showScores
            className={cn(
              // A name shows whole or wraps to two lines (handles have no spaces:
              // break anywhere) — never "RndHostclassicho…". The score keeps its width.
              '[&_[data-player]>span[dir=auto]]:whitespace-normal [&_[data-player]>span[dir=auto]]:line-clamp-2 [&_[data-player]>span[dir=auto]]:[overflow-wrap:anywhere] [&_[data-player]>span[dir=auto]]:flex-1 [&_[data-player]>span[dir=auto]]:min-w-0 [&_[data-player]>span[dir=auto]]:leading-tight',
              // 10-ft TV: names + scores at 24px (14px vanishes across a room).
              'tv:gap-4 tv:[&_[data-player]]:gap-3 tv:[&_[data-player]>span:not(:first-child)]:text-2xl',
            )}
          />
        </div>
        {/* The mode, anchoring the column's foot: what everyone is playing, for the room. */}
        <div
          data-testid="mp-rail-mode"
          className="mt-auto shrink-0 rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard p-3 tv:p-5"
        >
          <p className={cn('flex items-center gap-2 font-neo-display font-bold uppercase tracking-wide text-base tv:text-3xl', MODE_TEXT[mode.color])}>
            <ModeIcon aria-hidden="true" className="shrink-0 w-5 h-5 tv:w-8 tv:h-8" />
            <span dir="auto">{t(mode.nameKey)}</span>
          </p>
          <p dir="auto" className="mt-1 tv:mt-2 text-sm tv:text-xl font-bold leading-snug text-neo-white/70 text-balance">
            {t(mode.ruleKey)}
          </p>
        </div>
      </aside>

      {/* The play surface — mounted from the start, hidden until GO */}
      <div
        data-testid="mp-round-canvas"
        aria-hidden={revealed ? undefined : 'true'}
        className={cn(
          styles.areaBoard,
          styles.fillBoard,
          // Blast keeps its board, word area and clear strip; the round HUD owns exit, clock and score.
          isBlast && styles.blastCanvas,
          'relative min-h-0 min-w-0 flex flex-col',
          !revealed && 'invisible',
          // The drop runs once, when the class lands (the GO render).
          revealed && !reduceMotion && styles.boardDrop,
        )}
      >
        {canvas}
        {/* Phone only: desktop counts in the YOUR WORDS header; blast's clear strip counts its own. */}
        {!isBlast && (
          <span
            data-testid="mp-found-pill"
            className="lg:hidden pointer-events-none absolute bottom-1 end-2 z-10 rounded-full border-2 border-neo-black bg-neo-navy-light px-2.5 py-0.5 text-xs font-bold text-neo-white/80 shadow-hard-sm tabular-nums"
          >
            {t('mpUi.round.found', { count: ladder.length })}
          </span>
        )}
      </div>

      {/* Desktop: my words */}
      <aside className={cn(styles.areaRight, 'min-h-0 flex-col gap-2 pt-3')} aria-label={t('mpUi.round.yourWords')}>
        <h2 className="flex items-baseline justify-between gap-2 font-neo-display font-bold uppercase tracking-wider text-xs tv:text-lg text-neo-white/60 px-1">
          {t('mpUi.round.yourWords')}
          <span data-testid="mp-words-count" className="rounded-full bg-neo-lime px-2 text-neo-black tabular-nums">{ladder.length}</span>
        </h2>
        <div className="flex-1 min-h-0 overflow-hidden rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard flex flex-col">
          {ladder.length > 0 ? (
            <WordsLadder words={ladder} meId={meId} />
          ) : (
            <div data-testid="mp-words-empty" className="m-auto flex flex-col items-center gap-3 tv:gap-5 p-6 text-center">
              {/* A ghost of the first ladder row: shows WHAT lands here, not "nothing". */}
              <div aria-hidden="true" className="flex w-40 tv:w-64 items-center justify-between rounded-neo border-2 border-dashed border-neo-white/30 px-3 py-1.5 tv:py-3 font-neo-display font-bold uppercase text-neo-white/40 text-sm tv:text-2xl">
                <span>• • •</span>
                <span dir="ltr" className="tabular-nums">+?</span>
              </div>
              <p dir="auto" className="font-neo-display font-bold uppercase tracking-wide text-base tv:text-3xl text-neo-white text-balance [overflow-wrap:anywhere]">{t('mpUi.round.wordsEmpty.title')}</p>
              <p dir="auto" className="max-w-[16rem] tv:max-w-[22rem] text-sm tv:text-xl font-bold leading-snug text-neo-white/60 text-balance">{t('mpUi.round.wordsEmpty.body')}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Juice lanes: callouts/banners over the board, floaters toward the score */}
      <div className={cn(styles.areaBoard, 'pointer-events-none relative z-30')}>
        {/* The callout stage sits in the board area's free band: above the pill
            for classic, below the clue strip + life bar for word-hunt, below
            the clear strip for blast. */}
        <div
          data-testid="mp-callout-stage"
          className={cn('absolute inset-x-0 top-0 px-3', mode.slug === 'wordHunt' && 'top-[calc(132px*var(--mp-u,1))]', isBlast && 'top-[52px]')}
        >
          {/* Word-hunt's clue strip already teaches; its rule stays on the countdown. */}
          <MpRecentWords words={ladder} label={t('mpUi.round.yourWords')} emptyHint={mode.slug === 'wordHunt' ? undefined : t(mode.ruleKey)} />
          <div className="relative">
            <MpCallouts callout={juice.callout} banners={juice.banners} onBannerDone={juice.dropBanner} />
          </div>
        </div>
        <span data-testid="mp-reject-sr" aria-live="polite" className="sr-only">{juice.rejectText ?? ''}</span>
        <MpScoreFloaters floaters={juice.floaters} />
      </div>
      {juice.timeUp && (
        <div className={cn(styles.areaBoard, 'pointer-events-none relative z-40 flex items-center justify-center')}>
          <span
            data-testid="mp-time-up"
            className={cn(
              'rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-2 shadow-hard-lg font-neo-display font-bold uppercase text-5xl lg:text-7xl text-neo-black',
              !reduceMotion && styles.timeSlam,
            )}
          >
            {t('mpUi.round.timeUp')}
          </span>
        </div>
      )}
    </div>
  );
}

export const MpRoundLayout = memo(MpRoundLayoutImpl);
MpRoundLayout.displayName = 'MpRoundLayout';
