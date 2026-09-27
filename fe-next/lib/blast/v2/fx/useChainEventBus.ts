'use client';
import { useEffect, useRef } from 'react';
import { classifyOvation, type OvationTier } from '../engine';

export const BLAST_CHAIN_OVATION_EVENT = 'blast:chain-ovation';

const CASCADE_BEAT_MS = 350;

export type ChainOvationDetail = {
  tier: OvationTier;
  chainDepth: number;
  chainEventKey: number;
};

type Args = { chainEventKey: number; chainDepth: number };

function dispatchOvation(detail: ChainOvationDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ChainOvationDetail>(BLAST_CHAIN_OVATION_EVENT, { detail }));
}

export function useChainEventBus({ chainEventKey, chainDepth }: Args) {
  const lastKey = useRef<number | undefined>(undefined);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (chainEventKey === lastKey.current) return;
    lastKey.current = chainEventKey;

    // Cancel any pending replay from a previous chain.
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];

    // No real chain — nothing to replay.
    if (chainDepth < 2) return;

    // Emit one beat per cascade beat that has a non-none tier.
    // First flash fires immediately; subsequent flashes stagger at CASCADE_BEAT_MS.
    let visibleBeatIndex = 0;
    for (let beatDepth = 1; beatDepth <= chainDepth; beatDepth++) {
      const tier = classifyOvation(beatDepth);
      if (tier === 'none') continue;
      const delay = visibleBeatIndex * CASCADE_BEAT_MS;
      visibleBeatIndex += 1;
      const detail: ChainOvationDetail = {
        tier,
        chainDepth: beatDepth,
        chainEventKey: chainEventKey + beatDepth * 0.0001,
      };
      if (delay === 0) {
        dispatchOvation(detail);
      } else {
        timersRef.current.push(setTimeout(() => dispatchOvation(detail), delay));
      }
    }
  }, [chainEventKey, chainDepth]);

  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
    };
  }, []);
}
