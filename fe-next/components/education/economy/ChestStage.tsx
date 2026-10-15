'use client';

/**
 * The chest itself: rarity rays behind it, an anticipation shake, then a pop
 * that throws coins and confetti out. Only small elements move, and only by
 * transform/opacity; the rays rotate (static under reduced motion).
 */
import { forwardRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { GodRays } from '@/components/wordTowerV2/rewards/GodRays';
import { CoinArt } from '@/components/ui/CoinArt';
import type { ChestRarity } from '@/shared/constants/classroomEconomy';
import { chestArtSrc, chestRays, chestSrcForPhase, type ChestPhase } from './chestPhase';

const PIECES = Array.from({ length: 16 }, (_, i) => i);
const CONFETTI = ['#c6f432', '#ff5fa2', '#38e1ff', '#ffd23f', '#ffffff'];
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function piece(i: number) {
  const angle = (i / PIECES.length) * Math.PI * 2 - Math.PI / 2 + (i % 2) * 0.2;
  const reach = 120 + (i % 4) * 26;
  return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach - 30, spin: (i % 2 ? 1 : -1) * (180 + i * 20) };
}

interface Props {
  phase: ChestPhase;
  rarity: ChestRarity;
  onTap: () => void;
  openLabel: string;
}

const ChestStage = forwardRef<HTMLDivElement, Props>(function ChestStage({ phase, rarity, onTap, openLabel }, chestRef) {
  const reduced = useReducedMotion() ?? false;
  const rays = chestRays(rarity);
  const lit = phase === 'bursting' || phase === 'revealed';

  return (
    <div data-testid="chest-stage" data-phase={phase} className="relative grid min-h-0 w-full flex-1 place-items-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
        <GodRays rays={lit ? rays.rays : Math.max(4, rays.rays / 2)} hex={rays.hex} strength={lit ? rays.strength : 0.3} reducedMotion={reduced} />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[42%] h-[min(60vw,30vh)] w-[min(60vw,30vh)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: `radial-gradient(circle, ${rays.hex}88 0%, transparent 65%)` }}
      />

      <m.div
        ref={chestRef}
        className="relative h-[min(64vw,32vh,320px)] w-[min(64vw,32vh,320px)]"
        animate={
          reduced
            ? undefined
            : phase === 'sealed'
              ? { rotate: [0, -3, 3, -2, 0], y: [0, -4, 0] }
              : phase === 'shaking'
                ? { rotate: [0, -9, 9, -11, 11, -6, 0], scale: [1, 1.04, 0.97, 1.06, 1] }
                : phase === 'bursting'
                  ? { scale: [0.92, 1.16, 1], y: [8, -14, 0], rotate: 0 }
                  : { scale: 1, y: 0, rotate: 0 }
        }
        transition={
          phase === 'sealed'
            ? { duration: 1, repeat: Infinity, repeatDelay: 1.2 }
            : phase === 'shaking'
              ? { duration: 0.6, ease: 'easeInOut' }
              : { duration: 0.45, ease: EASE_OUT }
        }
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTap();
          }}
          tabIndex={phase === 'revealed' ? -1 : 0}
          aria-hidden={phase === 'revealed' ? true : undefined}
          aria-label={openLabel}
          className="h-full w-full cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized chest art; the optimizer would re-encode it */}
          <img src={chestSrcForPhase(phase, rarity)} alt="" draggable={false} className="h-full w-full select-none object-contain drop-shadow-[6px_6px_0_#000]" />
          {/* eslint-disable-next-line @next/next/no-img-element -- warms the open art so the burst frame never shows the shut chest */}
          {!lit && <img src={chestArtSrc(rarity, true)} alt="" aria-hidden="true" className="hidden" />}
        </button>
      </m.div>

      {phase === 'bursting' && !reduced && (
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
          {PIECES.map((i) => {
            const p = piece(i);
            const coin = i % 3 === 0;
            return (
              <m.span
                key={i}
                className="absolute -ml-3 -mt-3 block"
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
                animate={{ x: [0, p.x * 0.85, p.x], y: [0, p.y * 0.85, p.y + 24], opacity: [1, 1, 0], scale: [0.6, 1, 1], rotate: [0, p.spin * 0.7, p.spin] }}
                transition={{ duration: 0.65, ease: EASE_OUT, times: [0, 0.55, 1] }}
              >
                {coin ? (
                  <CoinArt size={26} />
                ) : (
                  <span className="block h-3.5 w-2.5 rounded-[2px] border border-black/40" style={{ background: CONFETTI[i % CONFETTI.length] }} />
                )}
              </m.span>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default ChestStage;
