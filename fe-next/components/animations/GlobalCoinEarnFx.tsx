'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { isNative } from '@/utils/platform';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COIN_EARNED_EVENT, selectCoinFxMode, type CoinEarnedDetail } from '@/utils/coinEarnedFx';
import { DomCoinBurst } from './DomCoinBurst';

// Re-export for back-compat with existing importers.
export { COIN_EARNED_EVENT };

type Point = { x: number; y: number };

const CASCADE_THRESHOLD = 100;
const MAX_COINS_PER_BURST = 10;
const MIN_COINS_PER_BURST = 4;
const COINS_PER_25_GOLD = 25;

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

interface ActiveBurst {
  id: number;
  source: Point;
  target: Point;
  count: number;
}

/**
 * Bridge: CoinContext / server-grant CustomEvent → sound + coin visuals.
 * Mount once inside SoundEffectsProvider.
 *
 * Sound plays on every platform (including reduced motion). The visual is
 * chosen by selectCoinFxMode: WebGL stream on web, a DOM fallback on native
 * (where the Pixi canvas is disabled), and nothing under reduced motion.
 */
export const GlobalCoinEarnFx: React.FC = () => {
  const { playCoinCollectSound, playCoinCascadeSound } = useSoundEffects();
  const reduced = useReducedMotion();
  const [bursts, setBursts] = useState<ActiveBurst[]>([]);
  const idRef = useRef(0);

  const removeBurst = useCallback((id: number) => {
    setBursts((b) => b.filter((x) => x.id !== id));
  }, []);

  const handleCoinEarned = useCallback(
    (evt: Event) => {
      const detail = (evt as CustomEvent<CoinEarnedDetail>).detail;
      const amount = detail?.amount ?? 0;
      if (amount <= 0) return;

      // Sound first — plays everywhere, even under reduced motion.
      if (amount >= CASCADE_THRESHOLD) {
        playCoinCascadeSound();
      } else {
        playCoinCollectSound();
      }

      const count = Math.min(
        MAX_COINS_PER_BURST,
        Math.max(MIN_COINS_PER_BURST, Math.ceil(amount / COINS_PER_25_GOLD)),
      );
      const source = getSourcePosition(detail);
      const target = getTargetPosition();

      const mode = selectCoinFxMode({
        reduced,
        fxActive: SharedFxApp.isInitialized(),
        native: isNative(),
      });

      if (mode === 'webgl') {
        SharedFxApp.spawnCoinStream({ source, target, count });
      } else if (mode === 'dom') {
        const id = (idRef.current += 1);
        setBursts((b) => [...b, { id, source, target, count }]);
      }
    },
    [playCoinCollectSound, playCoinCascadeSound, reduced],
  );

  useEffect(() => {
    window.addEventListener(COIN_EARNED_EVENT, handleCoinEarned);
    return () => window.removeEventListener(COIN_EARNED_EVENT, handleCoinEarned);
  }, [handleCoinEarned]);

  if (bursts.length === 0 || typeof document === 'undefined') return null;
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
    </>,
    document.body,
  );
};

export default GlobalCoinEarnFx;
