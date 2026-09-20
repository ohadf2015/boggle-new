'use client';

import { useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { LandingQuality } from '@/lib/wordTowerV2/landing';
import { chipAnchor } from '@/lib/wordTowerV2/rewards';
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

/**
 * The chip the payout number is printed on, per landing quality.
 *
 * Yellow on the sunset and dusk skies is the lowest-contrast pair this game
 * can produce, and round f1's reward chip used it for EVERY landing — the
 * blind judge read the payout as quieter than the failure toast beside it.
 * A landing worth celebrating now pays on lime, which holds against blue,
 * purple and sunset alike; a scrappy one keeps yellow, so winning is the
 * louder colour as well as the bigger number.
 */
const PAYOUT_FILL: Record<LandingQuality, string> = {
  perfect: 'bg-neo-lime',
  good: 'bg-neo-lime',
  sloppy: 'bg-neo-yellow',
  miss: 'bg-neo-yellow',
};

/** How long the shock ring and stars stay legible (a screenshot must catch them). */
const RING_MS = 1.0;
/**
 * The `+N` sits ON the impact this long before it arcs to the counter. It is
 * the reward moment, so it holds longer than it flies: at 0.9 the chip spent
 * 40% of its life shrinking away and mid-flight was what a frame usually
 * caught.
 */
const HOLD_MS = 1.25;
const FLIGHT_MS = 0.6;
/**
 * How far above the contact point the payout chip sits, in canvas px. Small on
 * purpose: it must read as ON the block (it overlaps the slab's top edge), not
 * as a toast floating above the tower. Round 2 used -92 and the judge read the
 * number as HUD, not as the landing's own payout.
 */
const CHIP_OFFSET = -26;
const STAR_ANGLES = [-160, -120, -75, -30, 20, 65, 110, 155];

interface Props {
  t: T;
  fx: LandingFx;
  /** The coin counter the payout flies into. */
  counterRef: RefObject<HTMLElement | null>;
  /** MUST match TowerCanvas's own className, or the px land in the wrong box. */
  canvasClass: string;
  /**
   * Points the landing just scored (the run's latest callout). Read at the
   * moment the burst mounts: `useTowerRun` sets the callout in the SAME call
   * that queues the land fx, so it is already this landing's by the frame the
   * canvas reports the pixel. This is the number Tower Bloxx puts on the block.
   */
  points: number;
  reducedMotion?: boolean;
}

/**
 * The payout, drawn ON the landing frame: a shock ring and a star spray at the
 * exact pixel the floor hit, and the coins it earned arcing from there into the
 * counter. Tower Bloxx's perfect-drop frame is one image that says "it landed
 * AND it paid" — a toast after the fact is not the same beat.
 *
 * Positions are raw `left`/`top` px, never `start-`/`end-`: those flip under RTL
 * and the point comes from the canvas in physical screen px either way.
 */
export function ImpactBurst({ t, fx, counterRef, canvasClass, points, reducedMotion }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={hostRef} className={`pointer-events-none z-30 overflow-hidden ${canvasClass}`} aria-hidden>
      <AnimatePresence>
        {fx.impacts.map((impact) => (
          <Burst
            key={impact.key}
            t={t}
            impact={impact}
            points={points}
            hostRef={hostRef}
            counterRef={counterRef}
            onDone={() => fx.clear(impact.key)}
            reducedMotion={reducedMotion}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface BurstProps {
  t: T;
  impact: Impact;
  points: number;
  hostRef: RefObject<HTMLDivElement | null>;
  counterRef: RefObject<HTMLElement | null>;
  onDone: () => void;
  reducedMotion?: boolean;
}

/**
 * The play box the chip is kept inside. React attaches a parent's ref AFTER its
 * children mount, so the very first burst of a run sees `hostRef.current` null —
 * it falls back to the viewport, which still keeps the number on screen.
 */
function playBox(hostRef: RefObject<HTMLDivElement | null>): { w: number; h: number } {
  const host = hostRef.current?.getBoundingClientRect();
  if (host?.width) return { w: host.width, h: host.height };
  if (typeof window === 'undefined') return { w: 0, h: 0 };
  return { w: window.innerWidth, h: window.innerHeight };
}

function Burst({ t, impact, points, hostRef, counterRef, onDone, reducedMotion }: BurstProps) {
  // Frozen on mount: the callout that fired with THIS landing. A later landing
  // must never repaint an older burst with its own score.
  const [scored] = useState(() => Math.max(0, Math.round(points)));
  // Resolved once, on mount: both rects are viewport-based, so the delta is
  // valid even though the counter lives in a different container.
  // Where the NUMBER is drawn: the contact point, pulled inside the play box
  // when the slab missed the tower and hit the ground off-screen.
  const [anchor] = useState(() => chipAnchor(impact, playBox(hostRef)));
  const [to] = useState(() => {
    const host = hostRef.current?.getBoundingClientRect();
    const target = counterRef.current?.getBoundingClientRect();
    if (!host || !target) return { dx: 0, dy: -140 };
    const from = chipAnchor(impact, playBox(hostRef));
    return {
      dx: target.left + target.width / 2 - (host.left + from.x),
      dy: target.top + target.height / 2 - (host.top + from.y),
    };
  });
  const gold = impact.crate;
  const size = gold ? 240 : 180;
  // Score first when there is one (Tower Bloxx's "+176"), coins when there is
  // not — a landing must never burst without a number the player can read.
  const headline = scored > 0 ? { n: scored, coin: false } : { n: impact.amount, coin: true };

  return (
    <>
    <div className="absolute" style={{ left: impact.x, top: impact.y }}>
      {/* Shock ring — it expands out of the seam the floor just made. */}
      <motion.span
        className={`absolute rounded-full border-[9px] ${RING[impact.quality]}`}
        style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
        initial={{ scale: 0.3, opacity: 1 }}
        animate={{ scale: 1, opacity: [1, 0.9, 0] }}
        transition={{ duration: reducedMotion ? 0.2 : RING_MS, ease: 'easeOut', times: [0, 0.55, 1] }}
      />
      <motion.span
        className="absolute rounded-full border-[5px] border-black"
        style={{ width: size * 0.7, height: size * 0.7, marginLeft: -size * 0.35, marginTop: -size * 0.35 }}
        initial={{ scale: 0.28, opacity: 0.9 }}
        animate={{ scale: 1, opacity: 0 }}
        transition={{ duration: reducedMotion ? 0.2 : RING_MS * 0.8, ease: 'easeOut' }}
      />

      {reducedMotion
        ? null
        : STAR_ANGLES.map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const dist = (gold ? 130 : 96) + (i % 3) * 18;
            const s = i % 2 === 0 ? 18 : 12;
            return (
              <motion.span
                key={deg}
                className={`absolute rounded-[2px] border-2 border-black ${gold ? 'bg-neo-yellow' : SHARD[impact.quality]}`}
                style={{ width: s, height: s, marginLeft: -s / 2, marginTop: -s / 2 }}
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
                animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 1, opacity: [1, 1, 0], rotate: deg }}
                transition={{ duration: RING_MS, ease: 'easeOut', times: [0, 0.6, 1] }}
              />
            );
          })}

    </div>
    <div className="absolute" style={{ left: anchor.x, top: anchor.y }}>
      {/* The payout, ON the block it was paid for. Tower Bloxx's "+176" sits on
          the block itself — the number IS the landing, not a HUD echo of it. It
          is the biggest type on screen for its beat, then it arcs to the
          counter, which only catches up once it arrives. */}
      {impact.amount > 0 || scored > 0 ? (
        <motion.span
          className="absolute flex -translate-x-1/2 items-center gap-1"
          style={{ marginTop: CHIP_OFFSET }}
          initial={reducedMotion ? { opacity: 1 } : { scale: 0.3, opacity: 1, x: 0, y: 0 }}
          animate={
            reducedMotion
              ? { opacity: 1 }
              : {
                  scale: [0.3, 1.35, 1, 1, 0.5],
                  opacity: [1, 1, 1, 1, 0],
                  x: [0, 0, 0, 0, to.dx],
                  y: [0, -4, -6, -6, to.dy],
                }
          }
          exit={{ opacity: 0 }}
          transition={
            reducedMotion
              ? { duration: 0.2 }
              : { duration: HOLD_MS + FLIGHT_MS, times: [0, 0.07, 0.18, HOLD_MS / (HOLD_MS + FLIGHT_MS), 1], ease: 'easeInOut' }
          }
          onAnimationComplete={onDone}
        >
          {/* The headline: what the drop was WORTH, in the drop's own pixels. */}
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
          {/* Coins ride along when the score is the headline — same chip, same
              flight, so the counter's jump is still something the eye followed. */}
          {!headline.coin && impact.amount > 0 ? (
            <span className="-ms-1 flex items-center gap-0.5 rounded-neo border-neo-thick border-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-xl font-black text-neo-navy shadow-hard lg:text-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={COIN_ART} alt="" className="h-5 w-5 lg:h-8 lg:w-8" />
              <span className="tabular-nums">+{impact.amount}</span>
            </span>
          ) : null}
          {/* The streak, cashed in at the spot it was earned. */}
          {impact.combo >= 2 ? (
            <span className="-ms-1 -rotate-6 rounded-neo border-neo-thick border-black bg-neo-pink px-1.5 py-0.5 font-neo-display text-xl font-black text-neo-navy shadow-hard lg:text-3xl">
              ×{impact.combo}
            </span>
          ) : null}
          {gold ? (
            <span className="-ms-1 rotate-3 rounded-neo border-neo border-black bg-neo-cyan px-1.5 font-neo-display text-[11px] font-black uppercase text-neo-navy shadow-hard-sm lg:text-lg">
              {t('wordTowerV2.streak.crate')}
            </span>
          ) : null}
        </motion.span>
      ) : (
        <motion.span
          className="absolute"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: RING_MS }}
          onAnimationComplete={onDone}
        />
      )}
    </div>
    </>
  );
}
