'use client';

/**
 * DEV-ONLY QA seam: `/en/adventure?node=shop` (or rest / treasure / event)
 * opens the run's act map and walks the shortest legal path to that node kind,
 * so the node screens can be opened in a browser before the act map itself is
 * on screen. Every move goes through the real endpoint — nothing is faked.
 *
 * It does nothing in a production build, and nothing without the query param.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { NodeKind, RunMap } from '@/lib/adventure/play/runMap';
import type { RunPhase } from '../runTypes';
import { stepToward } from './demoPath';

const KINDS: NodeKind[] = ['fight', 'elite', 'treasure', 'shop', 'rest', 'event', 'boss'];

interface Options {
  phase: RunPhase;
  map: RunMap | null;
  currentNode: string | null;
  openMap: () => void;
  chooseNode: (id: string) => void;
}

export function useNodeDemo({ phase, map, currentNode, openMap, chooseNode }: Options) {
  const want = useMemo<NodeKind | null>(() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('node');
    return KINDS.find((k) => k === raw) ?? null;
  }, []);
  const opened = useRef(false);
  const lastStep = useRef<string | null>(null);

  useEffect(() => {
    if (!want || opened.current) return;
    opened.current = true;
    openMap();
  }, [want, openMap]);

  useEffect(() => {
    // 'ready' = a fight board was dealt on the way; 'node' = the run is standing
    // on a node screen it has to step off. The walk stops on its own once the
    // current node IS the wanted kind (`stepToward` returns null).
    if (!want || !map || (phase !== 'map' && phase !== 'ready' && phase !== 'node')) return;
    const next = stepToward(map, currentNode, want);
    if (!next || next === lastStep.current) return;
    lastStep.current = next;
    chooseNode(next);
  }, [want, map, currentNode, phase, chooseNode]);
}
