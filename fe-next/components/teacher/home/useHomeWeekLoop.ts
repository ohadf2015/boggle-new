'use client';

import { useMemo } from 'react';
import type { HomeReplay } from './HomeHero';
import { useLastClassGame } from './useLastClassGame';
import { followUpGame, missedLastGame, playAgainTarget, readyForTest, replayDetail, type ReadyForTest, type WeekLoopLesson } from './weekLoopModel';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface HomeWeekLoopState {
  replay?: HomeReplay;
  ready: ReadyForTest | null;
  missed: string[];
  listId?: string;
}

const NONE: HomeWeekLoopState = { ready: null, missed: [] };

/** `fresh` skips the read so a first-week teacher's Start live never flips to Play again under them. */
export function useHomeWeekLoop({ classroomId, fresh, lessons, lessonsReady, language, nowMs, t }: {
  classroomId: string;
  fresh: boolean;
  lessons: readonly WeekLoopLesson[];
  lessonsReady: boolean;
  language: string;
  nowMs: number;
  t: T;
}): HomeWeekLoopState {
  const readId = fresh ? '' : classroomId;
  const last = useLastClassGame(readId, t('teacher.lastGame.studentFallback'));
  return useMemo(() => {
    if (!readId || last.status === 'error' || last.status === 'idle') return NONE;
    if (last.status === 'loading' || (last.game && !lessonsReady)) return { ...NONE, replay: { kind: 'pending' } };
    const target = playAgainTarget({ game: last.game, lessons, classroomId: readId, locale: language });
    if (!target) return NONE;
    const recent = followUpGame(last.game, nowMs);
    return {
      replay: { kind: 'ready', href: target.href, detail: replayDetail(target, t) },
      ready: readyForTest(recent),
      missed: missedLastGame(recent),
      listId: target.list?.id,
    };
  }, [readId, last.status, last.game, lessons, lessonsReady, language, nowMs, t]);
}
