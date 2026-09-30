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
import { useEffect, useState } from 'react';
import { Crown, Hammer } from 'lucide-react';
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
  onQuit: () => void;
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
}: WordcraftProjectorViewProps) {
  const [activity, setActivity] = useState<WordcraftLiveActivity[]>([]);
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
      setActivity((prev) => [a, ...prev].slice(0, MAX_TICKER));
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

  return (
    <div className="flex min-h-[100dvh] flex-col gap-4 bg-neo-navy p-4 text-neo-cream font-neo-body">
      {/* Header: mode badge + clock + stop */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-neo border-2 border-neo-cyan bg-neo-navy-light px-3 py-1.5 shadow-hard">
          <Hammer className="h-5 w-5 text-neo-cyan" aria-hidden />
          <span className="font-neo-display font-black uppercase text-neo-cyan">
            {t('academy.hq.modes.wordcraft')}
          </span>
        </div>
        {!timerHidden ? (
          <div
            data-testid="race-clock"
            className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-4 py-1.5 font-neo-display text-2xl font-black shadow-hard"
          >
            {formatClock(remainingTime)}
          </div>
        ) : null}
        <button
          type="button"
          onClick={onQuit}
          className="rounded-neo border-2 border-neo-red bg-neo-red/15 px-3 py-1.5 text-sm font-bold text-neo-red shadow-hard-sm"
        >
          {t('common.stop')}
        </button>
      </div>

      {/* Lesson targets */}
      {targets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase text-neo-cream/60">
            {t('education.wordcraftLive.lessonWords')}
          </span>
          {targets.map((target) => (
            <span
              key={target.word}
              data-testid={`target-${target.word}`}
              data-built={target.built}
              className={
                target.built
                  ? 'rounded-neo border-2 border-neo-lime bg-neo-lime/15 px-2.5 py-1 font-neo-display text-sm font-bold text-neo-lime'
                  : 'rounded-neo border-2 border-neo-cream/40 px-2.5 py-1 font-neo-display text-sm font-bold text-neo-cream/80'
              }
            >
              {target.built ? `✓ ${target.word}` : target.word}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid flex-1 gap-4 md:grid-cols-2">
        {/* Standings — the shared leaderboard, ranked. Hidden swaps the list
            for the reveal beat; an empty list would read as "no scores yet". */}
        <div className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-3 shadow-hard">
          {leaderboardHidden ? (
            <p
              data-testid="leaderboard-reveal-note"
              className="text-center text-sm font-neo-body text-neo-cream/80"
            >
              {t('education.classroomGame.pressure.revealAtEnd')}
            </p>
          ) : (
            <ol className="space-y-1.5">
              {standings.map((row, i) => (
                <li
                  key={row.username}
                  data-testid={`standing-${row.username}`}
                  className={`flex items-center gap-2 rounded-neo border-2 px-3 py-1.5 ${
                    i === 0
                      ? 'border-neo-lime bg-neo-lime/15'
                      : 'border-neo-cream/20 bg-neo-navy'
                  }`}
                >
                  {i === 0 ? <Crown className="h-4 w-4 text-neo-yellow" aria-hidden /> : null}
                  <span className="w-6 text-center font-neo-display font-bold text-neo-cream/60">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-bold">{row.username}</span>
                  <span className="font-neo-display text-lg font-black text-neo-lime">{row.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Race ticker */}
        <div className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-3 shadow-hard">
          <div data-testid="race-activity" className="space-y-1.5">
            {activity.map((a, i) => (
              <div
                key={`${a.username}-${i}`}
                className="rounded-neo border border-neo-cream/20 bg-neo-navy px-3 py-1.5 text-sm"
              >
                {a.bingo ? <span className="mr-1 font-black text-neo-yellow">BINGO!</span> : null}
                {t('education.wordcraftLive.builtBy', {
                  name: a.username,
                  word: a.words[0]?.word ?? '',
                })}
                <span className="ml-1 font-neo-display font-black text-neo-lime">+{a.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WordcraftProjectorView;
