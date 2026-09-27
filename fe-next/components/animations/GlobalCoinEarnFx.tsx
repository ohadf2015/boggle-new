'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCoinContext } from '@/contexts/CoinContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCelebrationIntensity } from '@/contexts/AccessibilityContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { isNative } from '@/utils/platform';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COIN_EARNED_EVENT, COIN_SPENT_EVENT, selectCoinFxMode, type CoinEarnedDetail } from '@/utils/coinEarnedFx';
import { planCoinReward, type CoinRewardTier } from '@/lib/audio/coinSoundPlan';
import { DomCoinBurst } from './DomCoinBurst';
import { CoinRewardHud } from './CoinRewardHud';

// Re-export for back-compat with existing importers.
export { COIN_EARNED_EVENT };

type Point = { x: number; y: number };

function getTargetPosition(): Point {
  if (typeof document === 'undefined') return { x: 0, y: 0 };
  const target = document.querySelector<HTMLElement>('[data-coin-counter="true"]');
  if (!target) {
    return { x: window.innerWidth - 40, y: 40 };
  }
  const rect = target.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function getSourcePosition(detail?: CoinEarnedDetail): Point {
  if (detail?.source) return detail.source;
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/**
 * Keep the centred HUD pill fully on-screen. Coins still fly to the raw target
 * (e.g. an edge-hugging counter), but the rolling-counter pill clamps inward so
 * it never clips off the viewport — notably the top-right fallback position.
 */
function clampAnchor(p: Point): Point {
  if (typeof window === 'undefined') return p;
  const marginX = 96;
  const marginY = 40;
  return {
    x: Math.min(Math.max(p.x, marginX), window.innerWidth - marginX),
    y: Math.min(Math.max(p.y, marginY), window.innerHeight - marginY),
  };
}

interface ActiveBurst {
  id: number;
  source: Point;
  target: Point;
  count: number;
}

interface ActiveMoment {
  id: number;
  total: number;
  delta: number;
  tier: CoinRewardTier;
  direction: 'earn' | 'spend';
  anchor: Point;
}

interface GlobalCoinEarnFxProps {
  /** Injected RNG for the casino surprise-jackpot roll (tests pin this). */
  rand?: () => number;
}

/**
 * Single owner of the coin-reward "moment". On every `lexiclash:coin-earned`:
 *  1. plan the moment once (planCoinReward) so sound + visual + counter agree
 *  2. play an ascending coin-chime arpeggio (casino "ding-ding-ding"), + a
 *     cascade layer on a jackpot — ALWAYS (even reduced motion / menus)
 *  3. fling coins toward the counter (WebGL stream / DOM fallback / none)
 *  4. pop the CoinRewardHud counter — ALWAYS, even under reduced motion, since
 *     it's the a11y-friendly replacement for the retired "+X gold" toast.
 *
 * Mount once inside CoinProvider + SoundEffectsProvider.
 */
export const GlobalCoinEarnFx: React.FC<GlobalCoinEarnFxProps> = ({ rand = Math.random }) => {
  const { playCoinCollectSound, playCoinCascadeSound } = useSoundEffects();
  const { coins } = useCoinContext();
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const calm = useCelebrationIntensity() === 'calm';

  const [bursts, setBursts] = useState<ActiveBurst[]>([]);
  const [moments, setMoments] = useState<ActiveMoment[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Latest coin total without re-binding the event handler on every balance change.
  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const randRef = useRef(rand);
  randRef.current = rand;

  const removeBurst = useCallback((id: number) => {
    setBursts((b) => b.filter((x) => x.id !== id));
  }, []);
  const removeMoment = useCallback((id: number) => {
    setMoments((m) => m.filter((x) => x.id !== id));
  }, []);

  const runMoment = useCallback(
    (evt: Event, direction: 'earn' | 'spend') => {
      const detail = (evt as CustomEvent<CoinEarnedDetail>).detail;
      const amount = detail?.amount ?? 0;
      if (amount <= 0) return;

      const isSpend = direction === 'spend';
      const plan = planCoinReward(amount, randRef.current);

      // --- Sound: earn climbs (ascending arpeggio + cascade on jackpot);
      //     spend drains (the same notes reversed, descending, softer, never a
      //     cascade). requiresGameActive:false is baked into the sound fns. ---
      if (plan.cascade && !isSpend) {
        playCoinCascadeSound({ volume: 0.6 });
      }
      // Reverse the pitch order for spend (descending), but keep the timing
      // schedule ascending by position so it still plays as a quick run.
      const order = isSpend ? plan.chimes.slice().reverse() : plan.chimes;
      order.forEach((chime, i) => {
        const delayMs = plan.chimes[i].delayMs;
        const vol = isSpend ? chime.volume * 0.7 : chime.volume;
        const fire = () => playCoinCollectSound({ rate: chime.rate, volume: vol });
        if (delayMs <= 0) {
          fire();
        } else {
          const t = setTimeout(fire, delayMs);
          timersRef.current.push(t);
        }
      });

      // The counter is where coins live. Earn flies into it; spend flies out of
      // it toward where the money was spent.
      const counter = getTargetPosition();
      const spendPoint = getSourcePosition(detail);
      const source = isSpend ? counter : spendPoint;
      const target = isSpend ? spendPoint : counter;

      // --- Flying coins: WebGL stream / DOM fallback / none (reduced). ---
      const mode = selectCoinFxMode({
        reduced,
        fxActive: SharedFxApp.isInitialized(),
        native: isNative(),
      });
      if (mode === 'webgl') {
        SharedFxApp.spawnCoinStream({ source, target, count: plan.coinCount });
      } else if (mode === 'dom') {
        const id = (idRef.current += 1);
        setBursts((b) => [...b, { id, source, target, count: plan.coinCount }]);
      }

      // --- Counter HUD: ALWAYS (the retired-toast replacement). delta is the
      //     amount; total is the post-transaction balance from context. ---
      const momentId = (idRef.current += 1);
      setMoments((m) => [
        ...m,
        {
          id: momentId,
          total: coinsRef.current,
          delta: amount,
          tier: plan.tier,
          direction,
          anchor: clampAnchor(counter),
        },
      ]);
    },
    [playCoinCollectSound, playCoinCascadeSound, reduced],
  );

  useEffect(() => {
    const onEarned = (e: Event) => runMoment(e, 'earn');
    const onSpent = (e: Event) => runMoment(e, 'spend');
    window.addEventListener(COIN_EARNED_EVENT, onEarned);
    window.addEventListener(COIN_SPENT_EVENT, onSpent);
    return () => {
      window.removeEventListener(COIN_EARNED_EVENT, onEarned);
      window.removeEventListener(COIN_SPENT_EVENT, onSpent);
    };
  }, [runMoment]);

  // Clear any pending chime timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  if ((bursts.length === 0 && moments.length === 0) || typeof document === 'undefined') return null;
  return createPortal(
    <>
      {bursts.map((b) => (
        <DomCoinBurst
          key={b.id}
          source={b.source}
          target={b.target}
          count={b.count}
          onDone={() => removeBurst(b.id)}
        />
      ))}
      {moments.map((mo) => (
        <CoinRewardHud
          key={mo.id}
          total={mo.total}
          delta={mo.delta}
          tier={mo.tier}
          direction={mo.direction}
          anchor={mo.anchor}
          reduced={reduced}
          calm={calm}
          language={language}
          onDone={() => removeMoment(mo.id)}
        />
      ))}
    </>,
    document.body,
  );
};

export default GlobalCoinEarnFx;
