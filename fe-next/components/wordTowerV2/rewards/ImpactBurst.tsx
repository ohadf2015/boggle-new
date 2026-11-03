'use client';

import { useRef, useState, type RefObject } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import type { LandingQuality } from '@/lib/wordTowerV2/landing';
import { comboTier, type ComboTier } from '../hud/hudFormat';
import { CHIP_PEAK_SCALE, useBurstGeometry } from '../hud/useBurstGeometry';
import type { Impact, LandingFx } from './useLandingFx';

type T = (key: string, params?: Record<string, string | number>) => string;

const COIN_ART = '/images/word-tower-v2/empire/coin.webp';

/** Ring colour per landing quality — a perfect reads green, a miss reads red. */
const RING: Record<LandingQuality, string> = {
  perfect: 'border-neo-lime',
  good: 'border-neo-cyan',
  sloppy: 'border-neo-yellow',
  miss: 'border-neo-pink',
};

/** Shards thrown out of the seam. Solid neo blocks, not art: nothing to fail to load. */
const SHARD: Record<LandingQuality, string> = {
  perfect: 'bg-neo-lime',
  good: 'bg-neo-cyan',
  sloppy: 'bg-neo-yellow',
  miss: 'bg-neo-pink',
};

/** Winning pays on lime (holds against every sky); a scrappy landing keeps yellow. */
const PAYOUT_FILL: Record<LandingQuality, string> = {
  perfect: 'bg-neo-lime',
  good: 'bg-neo-lime',
  sloppy: 'bg-neo-yellow',
  miss: 'bg-neo-yellow',
};

/** The streak chip grows with the streak: a hot run must look hotter than a lucky pair. */
const COMBO_CHIP: Record<ComboTier, string> = {
  0: 'text-xl lg:text-3xl shadow-hard',
  1: 'text-xl lg:text-3xl shadow-hard',
  2: 'text-2xl lg:text-4xl shadow-hard-lg',
  3: 'text-3xl lg:text-5xl shadow-hard-lg',
};

const RING_MS = 1.0;
/** The `+N` holds ON the impact longer than it flies: the hold is the reward moment. */
const HOLD_MS = 1.25;
const FLIGHT_MS = 0.6;
const STAR_ANGLES = [-160, -120, -75, -30, 20, 65, 110, 155];
const HOT_STAR_ANGLES = [-140, -97, -52, -8, 42, 88, 132, 178];

interface Props {
  t: T;
  fx: LandingFx;
  /** The coin counter the payout flies into. */
  counterRef: RefObject<HTMLElement | null>;
  /** MUST match TowerCanvas's own className: canvas px are resolved against this box. */
  canvasClass: string;
  /** Points the landing just scored, frozen when the burst mounts. */
  points: number;
  reducedMotion?: boolean;
}

/**
 * The payout, drawn ON the landing frame: a shock ring and star spray at the
 * pixel the floor hit, and the chip it earned arcing into the coin counter.
 *
 * The canvas-shaped host is only a ruler (canvas px -> viewport px). Everything
 * visible draws in one fixed viewport layer with no clipping box, and the chip
 * is clamped inside the safe area and under the HUD, so a landing at the edge
 * of a narrow phone or the side rails of a TV can never cut its number off.
 * Positions are physical px on purpose: the canvas reports physical px in RTL too.
 */
export function ImpactBurst({ t, fx, counterRef, canvasClass, points, reducedMotion }: Props) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);

  return (
    <>
      <div ref={setHost} className={`pointer-events-none invisible ${canvasClass}`} aria-hidden />
      <div
        ref={setLayer}
        data-wt2-burst-layer
        className="pointer-events-none fixed inset-0 z-[45] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]"
        aria-hidden
      >
        {host ? (
          <AnimatePresence>
            {fx.impacts.map((impact) => (
              <Burst
                key={impact.key}
                t={t}
                impact={impact}
                points={points}
                host={host}
                layer={layer}
                counterRef={counterRef}
                onDone={() => fx.clear(impact.key)}
                reducedMotion={reducedMotion}
              />
            ))}
          </AnimatePresence>
        ) : null}
      </div>
    </>
  );
}

interface BurstProps {
  t: T;
  impact: Impact;
  points: number;
  host: HTMLElement;
  layer: HTMLElement | null;
  counterRef: RefObject<HTMLElement | null>;
  onDone: () => void;
  reducedMotion?: boolean;
}

function Burst({ t, impact, points, host, layer, counterRef, onDone, reducedMotion }: BurstProps) {
  const [scored] = useState(() => Math.max(0, Math.round(points)));
  const chipRef = useRef<HTMLSpanElement | null>(null);
  const geo = useBurstGeometry(impact, host, layer, chipRef, counterRef);
  const gold = impact.crate;
  const tier = comboTier(impact.combo);
  const size = gold || tier >= 3 ? 240 : 180;
  const headline = scored > 0 ? { n: scored, coin: false } : { n: impact.amount, coin: true };
  const pays = impact.amount > 0 || scored > 0;
  const angles = tier >= 3 || gold ? [...STAR_ANGLES, ...HOT_STAR_ANGLES] : STAR_ANGLES;
  const hold = HOLD_MS / (HOLD_MS + FLIGHT_MS);
  const dx = geo?.to.dx ?? 0;
  const dy = geo?.to.dy ?? 0;
  const apex = Math.min(dy, 0) * 0.45 - 36;

  return (
    <>
      {geo ? (
        <div className="absolute" style={{ left: geo.impact.x, top: geo.impact.y }}>
          <m.span
            className={`absolute rounded-full border-[9px] ${RING[impact.quality]}`}
            style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 1, opacity: [1, 0.9, 0] }}
            transition={{ duration: reducedMotion ? 0.2 : RING_MS, ease: 'easeOut', times: [0, 0.55, 1] }}
          />
          <m.span
            className="absolute rounded-full border-[5px] border-black"
            style={{ width: size * 0.7, height: size * 0.7, marginLeft: -size * 0.35, marginTop: -size * 0.35 }}
            initial={{ scale: 0.28, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.2 : RING_MS * 0.8, ease: 'easeOut' }}
          />
          {reducedMotion
            ? null
            : angles.map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const dist = (gold || tier >= 3 ? 130 : 96) + (i % 3) * 18;
                const s = i % 2 === 0 ? 18 : 12;
                return (
                  <m.span
                    key={`${deg}-${i}`}
                    className={`absolute rounded-[2px] border-2 border-black ${gold ? 'bg-neo-yellow' : SHARD[impact.quality]}`}
                    style={{ width: s, height: s, marginLeft: -s / 2, marginTop: -s / 2 }}
                    initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
                    animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 1, opacity: [1, 1, 0], rotate: deg }}
                    transition={{ duration: RING_MS, ease: 'easeOut', times: [0, 0.6, 1] }}
                  />
                );
              })}
        </div>
      ) : null}

      {pays ? (
        <div
          data-wt2-payout-box
          className="absolute"
          style={{ left: geo?.box.left ?? 0, top: geo?.box.top ?? 0, visibility: geo ? 'visible' : 'hidden' }}
        >
          <m.span
            ref={chipRef}
            className="flex items-center gap-1"
            initial={reducedMotion ? { opacity: 1 } : { scale: 0.3, opacity: 1, x: 0, y: 0 }}
            animate={
              !geo
                ? undefined
                : reducedMotion
                  ? { opacity: [1, 1, 0] }
                  : {
                      scale: [0.3, CHIP_PEAK_SCALE, 1, 1, 0.85, 0.45],
                      opacity: [1, 1, 1, 1, 1, 0],
                      x: [0, 0, 0, 0, dx * 0.45, dx],
                      y: [0, -4, -6, -6, apex, dy],
                    }
            }
            exit={{ opacity: 0 }}
            transition={
              reducedMotion
                ? { duration: 1.2, times: [0, 0.8, 1] }
                : {
                    duration: HOLD_MS + FLIGHT_MS,
                    times: [0, 0.07, 0.18, hold, hold + (1 - hold) * 0.45, 1],
                    ease: ['easeOut', 'easeOut', 'linear', 'easeOut', 'easeIn'],
                  }
            }
            onAnimationComplete={geo ? onDone : undefined}
          >
            <span
              data-wt2-payout={impact.quality}
              className={`flex items-center gap-1 whitespace-nowrap rounded-neo border-neo-thick border-black px-2.5 py-0.5 font-neo-display text-4xl font-black text-neo-navy shadow-hard-lg lg:px-4 lg:text-6xl ${
                gold ? 'bg-neo-lime' : PAYOUT_FILL[impact.quality]
              }`}
            >
              {headline.coin ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={COIN_ART} alt="" className="h-7 w-7 lg:h-11 lg:w-11" />
              ) : null}
              <span className="tabular-nums">+{headline.n}</span>
            </span>
            {!headline.coin && impact.amount > 0 ? (
              <span className="-ms-1 flex items-center gap-0.5 whitespace-nowrap rounded-neo border-neo-thick border-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-xl font-black text-neo-navy shadow-hard lg:text-3xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={COIN_ART} alt="" className="h-5 w-5 lg:h-8 lg:w-8" />
                <span className="tabular-nums">+{impact.amount}</span>
              </span>
            ) : null}
            {impact.combo >= 2 ? (
              <m.span
                data-wt2-burst-combo={tier}
                className={`-ms-1 whitespace-nowrap rounded-neo border-neo-thick border-black bg-neo-pink px-1.5 py-0.5 font-neo-display font-black text-neo-navy ${COMBO_CHIP[tier]}`}
                initial={{ rotate: -6 }}
                animate={reducedMotion || tier < 2 ? { rotate: -6 } : { rotate: [-6, 8, -10, 6, -6] }}
                transition={{ duration: tier >= 3 ? 0.5 : 0.35, delay: 0.12, repeat: tier >= 3 ? 1 : 0 }}
              >
                ×{impact.combo}
              </m.span>
            ) : null}
            {gold ? (
              <span className="-ms-1 rotate-3 whitespace-nowrap rounded-neo border-neo border-black bg-neo-cyan px-1.5 font-neo-display text-[11px] font-black uppercase text-neo-navy shadow-hard-sm lg:text-lg">
                {t('wordTowerV2.streak.crate')}
              </span>
            ) : null}
          </m.span>
        </div>
      ) : geo ? (
        <m.span
          className="absolute"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: RING_MS }}
          onAnimationComplete={onDone}
        />
      ) : null}
    </>
  );
}
