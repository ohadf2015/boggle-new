'use client';

import { useEffect, useState } from 'react';
import { getLesson } from '@/lib/supabase/education/lessons';
import type { SavedList } from './SavedListCard';

export type SavedListRead = SavedList | { status: 'idle' } | { status: 'missing' };

/** Reads the list saved at setup once; a failed or empty read is 'missing', so the step falls back to the paste box. */
export function useSavedList(lessonId: string | null, fallbackName: string): SavedListRead {
  const [state, setState] = useState<{ id: string | null; read: SavedListRead }>({ id: null, read: { status: 'idle' } });
  useEffect(() => {
    if (!lessonId) return;
    let live = true;
    getLesson(lessonId)
      .then(({ data }) => {
        if (!live) return;
        const words = (data?.words ?? []).map((w) => w.word).filter(Boolean);
        setState({ id: lessonId, read: words.length > 0 ? { status: 'ready', name: data?.name || fallbackName, words } : { status: 'missing' } });
      })
      .catch(() => live && setState({ id: lessonId, read: { status: 'missing' } }));
    return () => {
      live = false;
    };
  }, [lessonId, fallbackName]);
  if (!lessonId) return { status: 'idle' };
  return state.id === lessonId ? state.read : { status: 'loading' };
}
