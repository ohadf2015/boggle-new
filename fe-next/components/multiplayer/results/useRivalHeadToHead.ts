'use client';

import { useEffect, useState } from 'react';
import type { RivalRecord } from './mpResultsStory';

type Rival = { username: string; userId: string } | null;

/** Shorter than any round, so each results screen reads the record the server has written since. */
export const RIVAL_H2H_CACHE_MS = 20_000;

const cache = new Map<string, { at: number; p: Promise<RivalRecord | null> }>();

export function __resetRivalHeadToHeadCache() {
  cache.clear();
}

function load(rival: NonNullable<Rival>): Promise<RivalRecord | null> {
  const key = `${rival.userId}:${rival.username}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < RIVAL_H2H_CACHE_MS) return hit.p;
  const p = import('@/utils/friendsHeadToHead')
    .then(({ getHeadToHead }) => getHeadToHead(rival.userId))
    .then((r) => (r ? { name: rival.username, myWins: r.myWins, theirWins: r.theirWins, meetings: r.totalGames } : null))
    .catch(() => null);
  cache.set(key, { at: Date.now(), p });
  return p;
}

/** Non-blocking all-time record vs the callout rival; null for guests, unknown or failed lookups. */
export function useRivalHeadToHead(rival: Rival, signedIn: boolean): RivalRecord | null {
  const [record, setRecord] = useState<RivalRecord | null>(null);
  const userId = rival?.userId;
  const username = rival?.username;
  useEffect(() => {
    setRecord(null);
    if (!signedIn || !userId || !username) return undefined;
    let live = true;
    void load({ userId, username }).then((r) => {
      if (live) setRecord(r);
    });
    return () => {
      live = false;
    };
  }, [signedIn, userId, username]);
  return record;
}

/** Follows `value` until `frozen`, then holds the last value seen before it froze. */
export function useFrozenAfter<T>(value: T, frozen: boolean): T {
  const [held, setHeld] = useState(value);
  if (!frozen && held !== value) setHeld(value);
  return frozen ? held : value;
}
