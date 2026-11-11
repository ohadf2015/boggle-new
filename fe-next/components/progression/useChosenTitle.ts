'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { supabase } from '@/lib/supabase';

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface Entry {
  status: Status;
  title: string | null;
}

const IDLE: Entry = { status: 'idle', title: null };
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function set(userId: string, entry: Entry) {
  entries.set(userId, entry);
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

async function load(userId: string) {
  set(userId, { status: 'loading', title: null });
  if (!supabase) return set(userId, { status: 'error', title: null });
  const { data, error } = await supabase.from('profiles').select('chosen_title').eq('id', userId).maybeSingle();
  if (error) return set(userId, { status: 'error', title: null });
  set(userId, { status: 'ready', title: (data?.chosen_title as string | null) ?? null });
}

/** The player's picked title. Shared across profile surfaces so a save shows everywhere at once. */
export function useChosenTitle(userId: string | null | undefined) {
  const entry = useSyncExternalStore(
    subscribe,
    () => (userId ? entries.get(userId) ?? IDLE : IDLE),
    () => IDLE,
  );

  useEffect(() => {
    if (!userId) return;
    const cur = entries.get(userId);
    if (!cur || cur.status === 'idle') void load(userId);
  }, [userId]);

  const save = useCallback(
    async (title: string | null): Promise<boolean> => {
      if (!userId || !supabase) return false;
      const { error } = await supabase.from('profiles').update({ chosen_title: title }).eq('id', userId);
      if (error) return false;
      set(userId, { status: 'ready', title });
      if (title) trackGrowthEvent('title_picked', { title });
      return true;
    },
    [userId],
  );

  const retry = useCallback(() => {
    if (userId) void load(userId);
  }, [userId]);

  return { ...entry, save, retry };
}

export function __resetChosenTitleForTests() {
  entries.clear();
  listeners.clear();
}
