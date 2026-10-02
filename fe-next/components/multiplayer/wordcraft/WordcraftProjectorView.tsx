'use client';

/**
 * WordcraftProjectorView — the classroom screen for a live Wordcraft race.
 *
 * Three layers, all reuse: the standings are the SAME leaderboard every other
 * live mode projects (passed in as a prop), the ticker rides the room-wide
 * wordcraft:activity broadcast, and the lesson-target checklist ticks off as
 * anyone banks a list word. The host is a spectator here: the only emit is
 * the projectorState pull on mount (a reload restores the checklist mid-race)
 * — it never emits requestState, which would deal the host a player seat.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Crown, Hammer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tr } from '@/components/education/lobby/eduText';
import {
  WORDCRAFT_LIVE_EVENTS,
  type WordcraftLiveActivity,
  type WordcraftLiveInit,
  type WordcraftLiveProjectorState,
} from '@/shared/types/wordcraftLive';
import type { WordcraftLiveSocket } from './useWordcraftLive';
import { useClassroomPressure } from '@/hooks/gameState/classroomPressureStore';
import {
  isLeaderboardHidden,
  isStudentTimerHidden,
  trimLeaderboardForPressure,
} from '@/shared/utils/classroomPressure';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export interface WordcraftProjectorViewProps {
  socket: WordcraftLiveSocket | null;
  leaderboard: { username: string; score: number }[];
  t: Translate;
  remainingTime?: number | null;
  /** Absent on the teacher broadcast, where the control strip owns End round. */
  onQuit?: () => void;
  /** Fills a parent flex column instead of claiming the whole viewport. */
  embedded?: boolean;
}

const MAX_TICKER = 6;

function formatClock(sec: number | null | undefined): string {
  const s = Math.max(0, Math.floor(sec ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function WordcraftProjectorView({
  socket,
  leaderboard,
  t,
  remainingTime,
  onQuit,
  embedded = false,
}: WordcraftProjectorViewProps) {
  const reduceMotion = useReducedMotion();
  const keyRef = useRef(0);
  const [activity, setActivity] = useState<(WordcraftLiveActivity & { key: number })[]>([]);
  const [targets, setTargets] = useState<{ word: string; built: boolean }[]>([]);
  // The teacher's pressure dials (null outside a classroom room = loud
  // default). The projector is a class-facing student surface: hidden swaps
  // the standings for the reveal beat, top3 trims to the podium, timer-off
  // drops the countdown.
  const pressure = useClassroomPressure();
  const leaderboardHidden = pressure ? isLeaderboardHidden(pressure) : false;
  const timerHidden = pressure ? isStudentTimerHidden(pressure) : false;

  useEffect(() => {
    if (!socket) return;
    const onInit = (p: unknown) => {
      const init = p as WordcraftLiveInit;
      setTargets(init.targets.map((word) => ({ word, built: false })));
    };
    const onProjectorState = (p: unknown) => {
      const state = p as WordcraftLiveProjectorState;
      setTargets(state.targets);
    };
    const onActivity = (p: unknown) => {
      const a = p as WordcraftLiveActivity;
      keyRef.current += 1;
      setActivity((prev) => [{ ...a, key: keyRef.current }, ...prev].slice(0, MAX_TICKER));
      if (a.lessonWord) {
        setTargets((prev) =>
          prev.map((x) => (x.word === a.lessonWord ? { ...x, built: true } : x)),
        );
      }
    };
    socket.on(WORDCRAFT_LIVE_EVENTS.init, onInit);
    socket.on(WORDCRAFT_LIVE_EVENTS.projectorState, onProjectorState);
    socket.on(WORDCRAFT_LIVE_EVENTS.activity, onActivity);
    // The init broadcast only fires once per round — a projector that mounts
    // mid-race (reload, reconnect) pulls the checklist explicitly. The pull
    // never deals the host a seat.
    socket.emit(WORDCRAFT_LIVE_EVENTS.projectorState);
    return () => {
      socket.off(WORDCRAFT_LIVE_EVENTS.init, onInit);
      socket.off(WORDCRAFT_LIVE_EVENTS.projectorState, onProjectorState);
      socket.off(WORDCRAFT_LIVE_EVENTS.activity, onActivity);
    };
  }, [socket]);

  const ranked = [...leaderboard].sort((a, b) => b.score - a.score);
  const standings = pressure ? trimLeaderboardForPressure(ranked, pressure) : ranked;
  const builtCount = targets.filter((x) => x.built).length;

  return (
    <div
      data-testid="wordcraft-projector"
      className={cn(
        'flex flex-col gap-3 bg-neo-navy p-3 text-neo-cream font-neo-body md:gap-4 md:p-5',
        embedded ? 'min-h-0 flex-1 overflow-hidden' : 'min-h-[100dvh]'
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-cyan px-3 py-1.5 text-neo-black shadow-hard">
          <Hammer className="h-5 w-5 md:h-7 md:w-7" aria-hidden />
          <span className="font-neo-display text-base font-black uppercase md:text-2xl">
            {t('academy.hq.modes.wordcraft')}
          </span>
        </div>
        {!timerHidden ? (
          <div
            data-testid="race-clock"
            className="rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-4 py-1 font-neo-display text-2xl font-black tabular-nums shadow-hard md:text-5xl"
          >
            {formatClock(remainingTime)}
          </div>
        ) : null}
        {onQuit ? (
          <button
            type="button"
            onClick={onQuit}
            className="rounded-neo border-2 border-neo-red bg-neo-red/15 px-3 py-1.5 text-sm font-bold text-neo-red shadow-hard-sm"
          >
            {t('common.stop')}
          </button>
        ) : null}
      </div>

      {targets.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2 md:items-start">
          <span
            data-testid="lesson-targets-count"
            className="shrink-0 whitespace-nowrap rounded-full border-2 border-neo-black bg-neo-yellow px-2.5 py-0.5 font-neo-display text-xs font-black uppercase tracking-wide text-neo-black md:mt-1 md:text-sm"
          >
            {t('education.wordcraftLive.lessonWords')} · {builtCount}/{targets.length}
          </span>
          {/* 30 chips wrap to ~450px on a phone, so there they ride one sideways row. */}
          <div
            data-testid="lesson-targets-row"
            className="flex min-w-0 flex-1 items-center gap-2 pb-1 max-md:flex-nowrap max-md:overflow-x-auto max-md:overscroll-x-contain max-md:[scrollbar-width:none] max-md:[mask-image:linear-gradient(to_right,#000_80%,transparent)] max-md:rtl:[mask-image:linear-gradient(to_left,#000_80%,transparent)] md:flex-wrap"
          >
            {targets.map((target) => (
              <m.span
                key={target.word}
                data-testid={`target-${target.word}`}
                data-built={target.built}
                initial={false}
                animate={target.built && !reduceMotion ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.45 }}
                className={
                  target.built
                    ? 'shrink-0 whitespace-nowrap rounded-neo border-[3px] border-neo-black bg-neo-lime px-2.5 py-1 font-neo-display text-sm font-black text-neo-black shadow-hard-sm md:text-lg'
                    : 'shrink-0 whitespace-nowrap rounded-neo border-2 border-dashed border-neo-cream/60 px-2.5 py-1 font-neo-display text-sm font-bold text-neo-cream/85 md:text-lg'
                }
              >
                {target.built ? `✓ ${target.word}` : target.word}
              </m.span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 max-md:grid-rows-[minmax(7.5rem,1fr)_auto] md:grid-cols-2 md:gap-4">
        <div data-testid="wordcraft-standings" className="min-h-0 overflow-y-auto rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-3 shadow-hard">
          {leaderboardHidden ? (
            <p
              data-testid="leaderboard-reveal-note"
              className="text-center text-sm font-neo-body text-neo-cream/80"
            >
              {t('education.classroomGame.pressure.revealAtEnd')}
            </p>
          ) : (
            <ol className="space-y-2">
              {standings.map((row, i) => {
                const leads = i === 0 && row.score > 0;
                return (
                <m.li
                  key={row.username}
                  layout={!reduceMotion}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  data-testid={`standing-${row.username}`}
                  className={cn(
                    'flex items-center gap-3 rounded-neo border-[3px] px-3 py-2 md:py-3',
                    leads ? 'border-neo-black bg-neo-lime text-neo-black shadow-hard' : 'border-neo-cream/30 bg-neo-navy'
                  )}
                >
                  {leads ? <Crown className="h-5 w-5 shrink-0 md:h-7 md:w-7" aria-hidden /> : null}
                  <span className={cn('w-7 text-center font-neo-display text-lg font-black md:text-2xl', leads ? '' : 'text-neo-cream/70')}>
                    {i + 1}
                  </span>
                  <span dir="auto" className="flex-1 truncate font-neo-display text-lg font-black md:text-2xl">{row.username}</span>
                  <span className={cn('font-neo-display text-xl font-black tabular-nums md:text-3xl', leads ? '' : 'text-neo-lime')}>
                    {row.score}
                  </span>
                </m.li>
                );
              })}
            </ol>
          )}
        </div>

        <div data-testid="race-activity-panel" className="min-h-0 overflow-hidden rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-3 shadow-hard max-md:max-h-[6.5rem]">
          <div data-testid="race-activity" className="space-y-2">
            {activity.length === 0 ? (
              <p className="py-2 text-center font-neo-display text-base font-bold text-neo-cream/80 md:py-6 md:text-2xl">
                {tr(t, 'eduLive.wordcraft.waiting', 'Waiting for the first word…')}
              </p>
            ) : null}
            <AnimatePresence initial={false}>
              {activity.map((a) => (
                <m.div
                  key={a.key}
                  initial={reduceMotion ? false : { scale: 0.7, x: -24 }}
                  animate={{ scale: 1, x: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                  className={cn(
                    'flex items-center gap-2 rounded-neo border-2 px-3 py-2 text-sm md:text-lg',
                    a.bingo ? 'border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm' : 'border-neo-cream/25 bg-neo-navy'
                  )}
                >
                  {a.bingo ? <span className="font-neo-display font-black">{tr(t, 'eduLive.wordcraft.bingo', 'BINGO!')}</span> : null}
                  <span className="min-w-0 flex-1 truncate">
                    {t('education.wordcraftLive.builtBy', {
                      name: a.username,
                      word: a.words[0]?.word ?? '',
                    })}
                  </span>
                  <span className={cn('font-neo-display font-black', a.bingo ? '' : 'text-neo-lime')}>+{a.score}</span>
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WordcraftProjectorView;
