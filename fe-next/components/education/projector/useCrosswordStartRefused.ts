'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CROSSWORD_CLASSROOM_EVENTS, type CrosswordStartRefused } from '@/shared/types/crosswordClassroom';
import { getSharedSocketIfExists } from '@/utils/SocketContext';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export const CROSSWORD_REFUSED_KEY = 'eduCrossword.tooFewWords';

/** True once the server refused to deal this room's crossword; the teacher is toasted the moment it happens. */
export function useCrosswordStartRefused(gameCode: string, t: Translate): [boolean, () => void] {
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    const socket = getSharedSocketIfExists();
    if (!socket) return;
    const onRefused = (data?: Partial<CrosswordStartRefused>) => {
      if (data?.gameCode && data.gameCode !== gameCode) return;
      setRefused(true);
      toast.error(t(CROSSWORD_REFUSED_KEY));
    };
    socket.on(CROSSWORD_CLASSROOM_EVENTS.startRefused, onRefused);
    return () => {
      socket.off(CROSSWORD_CLASSROOM_EVENTS.startRefused, onRefused);
    };
  }, [gameCode, t]);

  return [refused, () => setRefused(false)];
}
