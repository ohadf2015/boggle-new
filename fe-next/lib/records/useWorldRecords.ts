'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { WorldRecord } from './worldRecordTypes';

type Status = 'loading' | 'ready' | 'error';

interface Snapshot {
  status: Status;
  records: WorldRecord[];
}

const TTL_MS = 60_000;
const EMPTY: WorldRecord[] = [];
const INITIAL: Snapshot = { status: 'loading', records: EMPTY };

let snapshot: Snapshot = INITIAL;
let loadedAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: Snapshot) {
  snapshot = next;
  for (const l of listeners) l();
}

function load(force = false): void {
  if (inflight) return;
  if (!force && snapshot.status === 'ready' && Date.now() - loadedAt < TTL_MS) return;
  if (snapshot.status === 'error') set(INITIAL);
  inflight = fetch('/api/records/world')
    .then(async (res) => {
      if (!res.ok) throw new Error(`world records ${res.status}`);
      const body = (await res.json()) as { records?: WorldRecord[] };
      loadedAt = Date.now();
      set({ status: 'ready', records: Array.isArray(body.records) ? body.records : EMPTY });
    })
    .catch(() => set({ status: 'error', records: EMPTY }))
    .finally(() => {
      inflight = null;
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => INITIAL;

/** Every world record, fetched once per minute and shared by every chip, crown and hall of fame on the page. */
export function useWorldRecords(): Snapshot & { retry: () => void } {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    load();
  }, []);
  const retry = useCallback(() => load(true), []);
  return { ...current, retry };
}

/** @internal tests only */
export function _resetWorldRecordsClient(): void {
  snapshot = INITIAL;
  loadedAt = 0;
  inflight = null;
  listeners.clear();
}
