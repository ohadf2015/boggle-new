'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useModeBed } from '@/hooks/useModeBed';
import { PLAY_HEIGHT } from '@/components/wordTowerV2/safeArea';

/**
 * Holds the game's exact box while auth resolves and the chunk loads. Without
 * it the page painted the rules section first and the game then pushed it a
 * whole screen down: CLS ~0.98 on /word-tower (PostHog web vitals, Nov 2026).
 */
function PlaceholderStage() {
  return <div data-testid="word-tower-stage" aria-hidden="true" className="w-full shrink-0 bg-neo-navy" style={{ height: PLAY_HEIGHT }} />;
}

/**
 * Pixi touches `window` at import time, so the game must never be server
 * rendered. `ssr: false` is only legal inside a Client Component, which is what
 * this wrapper exists to provide — the same shape v1 uses.
 */
const loadWordTowerV2 = () => import('@/components/wordTowerV2/WordTowerV2');
// Fetch the game chunk while auth resolves, not after.
if (typeof window !== 'undefined') void loadWordTowerV2().catch(() => undefined);
const WordTowerV2 = dynamic(loadWordTowerV2, { ssr: false, loading: PlaceholderStage });

/**
 * Word Tower v2 — now public (GA).
 * The physics rebuild is now the default Word Tower for all players.
 */
export function WordTowerV2PageClient({ daily = false }: { daily?: boolean } = {}) {
  useModeBed('WORD_TOWER');
  const { loading, user, profile } = useAuth();

  // No gate — Word Tower v2 is now public for all players.
  // Still wait for auth to resolve so the UI state is consistent.
  const resolving = loading || (!!user && !profile);
  // Wait once per player. If auth re-resolves later (loading or profile flips
  // back), unmounting would end the run in play and shove the page a screen up
  // and down, so the game stays.
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const who = user?.id ?? 'guest';
  if (!resolving && readyFor !== who) setReadyFor(who);

  if (readyFor === null) return <PlaceholderStage />;

  return <WordTowerV2 key={readyFor} daily={daily} />;
}
