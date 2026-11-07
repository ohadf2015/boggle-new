'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getRecentClassroomGames, type RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import logger from '@/utils/logger';

export type LastClassGameStatus = 'idle' | 'loading' | 'ready' | 'error';
export interface LastClassGame {
  status: LastClassGameStatus;
  game: RecentClassroomGame | null;
}

export const LAST_GAME_CAP_MS = 1500;

export function useLastClassGame(classroomId: string, fallbackName: string, capMs = LAST_GAME_CAP_MS): LastClassGame {
  const [state, setState] = useState<{ key: string } & LastClassGame>({ key: '', status: 'idle', game: null });

  useEffect(() => {
    if (!classroomId || !supabase) return;
    let done = false;
    const settle = (next: LastClassGame) => {
      if (done) return;
      done = true;
      setState({ key: classroomId, ...next });
    };
    const timer = setTimeout(() => settle({ status: 'error', game: null }), capMs);
    getRecentClassroomGames(classroomId, 1, { fallbackName })
      .then(({ data, error }) => settle(error ? { status: 'error', game: null } : { status: 'ready', game: data[0] ?? null }))
      .catch((err: unknown) => {
        logger.warn('last class game unavailable', err);
        settle({ status: 'error', game: null });
      });
    return () => {
      done = true;
      clearTimeout(timer);
    };
  }, [classroomId, fallbackName, capMs]);

  if (!classroomId) return { status: 'idle', game: null };
  if (!supabase) return { status: 'error', game: null };
  if (state.key !== classroomId) return { status: 'loading', game: null };
  return { status: state.status, game: state.game };
}
