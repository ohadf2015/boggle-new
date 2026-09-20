'use client';

import { useEffect, useState, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import type { ChestRoll, ChestTier } from '@/lib/wordTowerV2/estate';
import { ChestReveal } from './ChestReveal';
import { RewardsLayer } from './RewardsLayer';
import type { ChestState, RewardsFlow } from './useRewardsFlow';

/** Same modal RivalBoard's guest teaser opens — signing in never leaves the run. */
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  flow: RewardsFlow;
  /** Points the latest landing scored (`game.callout`), shown ON the block. */
  points: number;
  /** Another full-screen surface is up (smash round, district): stay out of it. */
  hideInRun?: boolean;
  /** The run is over and the tower has finished falling: reveal the chest. */
  showChest?: boolean;
  /** TowerCanvas's own className — the impact overlay shares its box. */
  canvasClass: string;
  /** The top bar's coin chip — landing coins fly into it. */
  counterRef: RefObject<HTMLDivElement | null>;
  /** Desktop/TV: the wheel is in a side panel. */
  wide?: boolean;
  reducedMotion?: boolean;
}

const DEMO_ROLL: Record<ChestTier, ChestRoll> = {
  common: { tier: 'common', coins: 45, shields: 0, bricks: 0, blueprints: 0 },
  rare: { tier: 'rare', coins: 180, shields: 0, bricks: 1, blueprints: 0 },
  epic: { tier: 'epic', coins: 420, shields: 1, bricks: 1, blueprints: 1 },
};

/**
 * Review hook: `?demo=1&chest=epic` opens the reveal on its own, so the payout
 * can be looked at without playing a whole run out first. Read after mount —
 * the server has no query string, and a first paint that disagreed with it
 * would be a hydration mismatch.
 */
function useDemoChest(): { demo: ChestState | null; dismiss: () => void } {
  const [demo, setDemo] = useState<ChestState | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tier = params.get('chest');
    if (!params.has('demo') || !tier || !(tier in DEMO_ROLL)) return;
    setDemo({
      coins: 260,
      chest: DEMO_ROLL[tier as ChestTier],
      tease: { kind: 'perfects', n: 2, tier: tier === 'epic' ? 'epic' : 'rare' },
      guest: false,
    });
  }, []);
  return { demo, dismiss: () => setDemo(null) };
}

/** The whole reward loop on screen: the in-run rail and the end-of-run chest. */
export function RunRewards({ t, flow, points, canvasClass, counterRef, hideInRun, showChest, wide, reducedMotion }: Props) {
  const { demo, dismiss } = useDemoChest();
  const chest = demo ?? (showChest ? flow.chest : null);
  /*
   * The guest's sign-in offer opens HERE, over the reveal. It used to be a
   * `window.location.href` to `/{locale}/login`, a route that does not exist:
   * the one player most worth converting was sent to the 404 page and lost the
   * run, the chest and the guest estate on the way.
   */
  const [signIn, setSignIn] = useState(false);
  return (
    <>
      {hideInRun ? null : (
        <RewardsLayer
          t={t}
          rewards={flow.rewards}
          fx={flow.fx}
          points={points}
          canvasClass={canvasClass}
          counterRef={counterRef}
          wide={wide}
          reducedMotion={reducedMotion}
        />
      )}
      {chest ? (
        <ChestReveal
          t={t}
          coins={chest.coins}
          chest={chest.chest}
          tease={chest.tease}
          guest={chest.guest}
          onSignIn={() => setSignIn(true)}
          onBeat={flow.onBeat}
          onDone={demo ? dismiss : flow.onDone}
          reducedMotion={reducedMotion}
        />
      ) : null}
      {signIn ? <AuthModal isOpen onClose={() => setSignIn(false)} initialMode="signin" /> : null}
    </>
  );
}
