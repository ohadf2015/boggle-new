'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCoinContext } from '@/contexts/CoinContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCelebrationIntensity } from '@/contexts/AccessibilityContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COIN_EARNED_EVENT, COIN_SPENT_EVENT, findCoinAvoidRects, findCoinCounter, markCoinsInFlight, selectCoinFxMode, type CoinEarnedDetail } from '@/utils/coinEarnedFx';
import { planCoinReward, type CoinRewardTier } from '@/lib/audio/coinSoundPlan';
import { DomCoinBurst, coinFlightTiming } from './DomCoinBurst';
import { CoinRewardHud } from './CoinRewardHud';
import type { Rect } from './coinFlightPath';
import { safeToLocaleString } from '@/utils/bcp47Locale';

// Re-export for back-compat with existing importers.
export { COIN_EARNED_EVENT };

type Point = { x: number; y: number };

function getTargetPosition(): Point {
  if (typeof document === 'undefined') return { x: 0, y: 0 };
  const target = findCoinCounter();
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
  avoid: Rect[];
  big: boolean;
  amountLabel: string;
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
 *  3. fling coins toward the counter (DOM flight; none under reduced motion)
 *  4. pop the CoinRewardHud counter — ALWAYS, even under reduced motion, since
 *     it's the a11y-friendly replacement for the retired "+X gold" toast —
 *     except for inline earns, where the on-screen counter rolls the amount itself.
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
  const languageRef = useRef(language);
  languageRef.current = language;

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

      const mode = selectCoinFxMode({ reduced });
      const coinCount = detail?.coins ?? plan.coinCount;
      // The first chime is the launch; the rest ring as the coins land in the counter.
      const landLead = mode === 'dom' ? coinFlightTiming(coinCount).firstLandMs : 0;
      if (mode === 'dom' && !isSpend) markCoinsInFlight(landLead);

      if (plan.cascade && !isSpend) {
        playCoinCascadeSound({ volume: 0.6 });
      }
      // Spend reverses the pitch order (descending) but keeps the ascending timing schedule.
      const order = isSpend ? plan.chimes.slice().reverse() : plan.chimes;
      order.forEach((chime, i) => {
        const delayMs = i === 0 ? 0 : plan.chimes[i].delayMs + landLead;
        const vol = isSpend ? chime.volume * 0.7 : chime.volume;
        const fire = () => playCoinCollectSound({ rate: chime.rate, volume: vol });
        if (delayMs <= 0) {
          fire();
        } else {
          const t = setTimeout(fire, delayMs);
          timersRef.current.push(t);
        }
      });

      // Earn flies into the counter; spend flies out of it toward where the money went.
      const counter = getTargetPosition();
      const spendPoint = getSourcePosition(detail);
      const source = isSpend ? counter : spendPoint;
      const target = isSpend ? spendPoint : counter;

      if (mode === 'dom') {
        const id = (idRef.current += 1);
        const big = !isSpend && detail?.big === true;
        const amountLabel = `+${safeToLocaleString(amount, languageRef.current)}`;
        setBursts((b) => [...b, { id, source, target, count: coinCount, avoid: isSpend ? [] : findCoinAvoidRects(), big, amountLabel }]);
      }

      if (detail?.inline && !isSpend) return;

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
          avoid={b.avoid}
          big={b.big}
          amountLabel={b.amountLabel}
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
