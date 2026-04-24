'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

export const COIN_EARNED_EVENT = 'lexiclash:coin-earned';

interface CoinEarnedDetail {
  amount: number;
  /** Optional source {x, y} to fly coins from (defaults to screen center). */
  source?: { x: number; y: number };
}

interface FlyingCoin {
  id: number;
  delay: number;
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const CASCADE_THRESHOLD = 100;
const MAX_COINS_PER_BURST = 10;

function getTargetPosition(): { x: number; y: number } {
  if (typeof document === 'undefined') return { x: 0, y: 0 };
  const target = document.querySelector<HTMLElement>('[data-coin-counter="true"]');
  if (!target) {
    // Default to top-right of viewport
    return { x: window.innerWidth - 40, y: 40 };
  }
  const rect = target.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function getSourcePosition(detail?: CoinEarnedDetail): { x: number; y: number } {
  if (detail?.source) return detail.source;
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/**
 * GlobalCoinEarnFx
 *
 * App-wide listener that, on every `lexiclash:coin-earned` event, plays the
 * coin-collect sound and flies a small burst of coin sprites to whichever
 * element is tagged `data-coin-counter="true"` (the HUD coin counter).
 *
 * Mount once inside SoundEffectsProvider.
 */
export const GlobalCoinEarnFx: React.FC = () => {
  const { playCoinCollectSound, playCoinCascadeSound } = useSoundEffects();
  const [coins, setCoins] = useState<FlyingCoin[]>([]);
  const nextIdRef = useRef(0);

  const handleCoinEarned = useCallback(
    (evt: Event) => {
      const detail = (evt as CustomEvent<CoinEarnedDetail>).detail;
      const amount = detail?.amount ?? 0;
      if (amount <= 0) return;

      if (amount >= CASCADE_THRESHOLD) {
        playCoinCascadeSound();
      } else {
        playCoinCollectSound();
      }

      const source = getSourcePosition(detail);
      const target = getTargetPosition();
      const count = Math.min(MAX_COINS_PER_BURST, Math.max(4, Math.ceil(amount / 25)));
      const startId = nextIdRef.current;
      nextIdRef.current += count;

      const burst: FlyingCoin[] = Array.from({ length: count }, (_, i) => ({
        id: startId + i,
        delay: i * 40,
        dx: (Math.random() - 0.5) * 40,
        dy: (Math.random() - 0.5) * 40,
        startX: source.x,
        startY: source.y,
        endX: target.x,
        endY: target.y,
      }));

      setCoins((prev) => [...prev, ...burst]);

      // Remove after animation completes
      const TTL = 1200;
      window.setTimeout(() => {
        setCoins((prev) => prev.filter((c) => c.id < startId || c.id >= startId + count));
      }, TTL + count * 40);
    },
    [playCoinCollectSound, playCoinCascadeSound],
  );

  useEffect(() => {
    window.addEventListener(COIN_EARNED_EVENT, handleCoinEarned);
    return () => window.removeEventListener(COIN_EARNED_EVENT, handleCoinEarned);
  }, [handleCoinEarned]);

  if (coins.length === 0) return null;

  return (
    <div
      data-testid="coin-earn-fx-layer"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9998]"
    >
      {coins.map((c) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${c.startX + c.dx}px, ${c.startY + c.dy}px)`,
          animation: `coin-fly-${c.id} 900ms cubic-bezier(0.55, 0.1, 0.3, 1) ${c.delay}ms forwards`,
          fontSize: '22px',
          filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,0.85))',
          willChange: 'transform, opacity',
        };
        const keyframes = `@keyframes coin-fly-${c.id} {
          0% { transform: translate(${c.startX + c.dx}px, ${c.startY + c.dy}px) scale(1) rotate(0deg); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(${c.endX}px, ${c.endY}px) scale(0.6) rotate(540deg); opacity: 0; }
        }`;
        return (
          <React.Fragment key={c.id}>
            <style>{keyframes}</style>
            <span style={style} role="img" aria-label="coin">🪙</span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default GlobalCoinEarnFx;
