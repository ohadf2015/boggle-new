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
import { roundModeMeta, timerColor } from './roundModes';
import { useRoundJuice } from './useRoundJuice';
import styles from './round.module.css';

interface FoundWordLike {
  word: string;
  score?: number;
  timestamp?: number;
  isValid?: boolean | null;
  duplicate?: boolean;
}

const counts = (w: FoundWordLike) => w.isValid !== false && !w.duplicate;

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
}: MpRoundLayoutProps) {
  const { t } = useLanguage();
  const reduceMotion = useShouldReduceMotion();
  const mode = roundModeMeta(gameMode);

  // One roster source for host and joiner (lib/multiplayer/roster).
  const prevRoster = useRef<MpRosterPlayer[] | undefined>(undefined);
  const roster = useMemo(() => {
    const next = toMpRoster(leaderboard, users, meId, { previous: prevRoster.current });
    prevRoster.current = next;
    return next;
  }, [leaderboard, users, meId]);
  const standings = useMemo(() => roster.map((p) => ({ username: p.id, score: p.score })), [roster]);
  const { rank, total } = rankOf(roster, meId);
  const myScore = roster.find((p) => p.id === meId)?.score ?? 0;

  const juice = useRoundJuice({ meId, standings, remainingTime });

  const validCount = useMemo(() => foundWords.filter(counts).length, [foundWords]);
  // Ladder points: the server's per-word points (mpFeedback), never a client sum.
  const ladder = useMemo<LadderWord[]>(
    () =>
      foundWords.filter(counts).map((w, i) => ({
        word: w.word,
        score: w.score || juice.pointsByWord.get(w.word.toLowerCase()) || 0,
        ts: w.timestamp ?? i,
        userId: meId,
      })),
    [foundWords, meId, juice.pointsByWord],
  );

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
        <MpRosterStrip players={roster} meId={meId} layout="row" max={6} showScores className="justify-center" />
      </div>

      {/* Desktop: roster rail */}
      <aside className={cn(styles.areaLeft, 'min-h-0 flex-col gap-2 pt-3')} aria-label={t('mpUi.round.players')}>
        <h2 className="font-neo-display font-bold uppercase tracking-wider text-xs tv:text-lg text-neo-white/60 px-1">{t('mpUi.round.players')}</h2>
        <div className="min-h-0 overflow-y-auto rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard p-3">
          <MpRosterStrip players={roster} meId={meId} layout="rail" showScores />
        </div>
      </aside>

      {/* The play surface — mounted from the start, hidden until GO */}
      <div
        data-testid="mp-round-canvas"
        aria-hidden={revealed ? undefined : 'true'}
        className={cn(
          styles.areaBoard,
          styles.fillBoard,
          'relative min-h-0 min-w-0 flex flex-col',
          !revealed && 'invisible',
          // The drop runs once, when the class lands (the GO render).
          revealed && !reduceMotion && styles.boardDrop,
        )}
      >
        {canvas}
        <span
          data-testid="mp-found-pill"
          className="pointer-events-none absolute bottom-1 end-2 z-10 rounded-full border-2 border-neo-black bg-neo-navy-light px-2.5 py-0.5 text-xs tv:text-lg font-bold text-neo-white/80 shadow-hard-sm tabular-nums"
        >
          {t('mpUi.round.found', { count: validCount })}
        </span>
      </div>

      {/* Desktop: my words */}
      <aside className={cn(styles.areaRight, 'min-h-0 flex-col gap-2 pt-3')} aria-label={t('mpUi.round.yourWords')}>
        <h2 className="font-neo-display font-bold uppercase tracking-wider text-xs tv:text-lg text-neo-white/60 px-1">{t('mpUi.round.yourWords')}</h2>
        <div className="flex-1 min-h-0 overflow-hidden rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard flex flex-col">
          {ladder.length > 0 ? (
            <WordsLadder words={ladder} meId={meId} />
          ) : (
            <p className="m-auto p-4 text-center text-sm tv:text-xl text-neo-white/60">{t('mpUi.round.noWords')}</p>
          )}
        </div>
      </aside>

      {/* Juice lanes: callouts/banners over the board, floaters toward the score */}
      <div className={cn(styles.areaBoard, 'pointer-events-none relative z-30')}>
        {/* The callout stage sits in the board area's free band: above the pill
            for classic, below the clue strip + life bar for word-hunt. */}
        <div data-testid="mp-callout-stage" className={cn('absolute inset-x-0 top-0', mode.slug === 'wordHunt' && 'top-[calc(132px*var(--mp-u,1))]')}>
          <MpCallouts callout={juice.callout} banners={juice.banners} onBannerDone={juice.dropBanner} />
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
