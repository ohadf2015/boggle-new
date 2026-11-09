'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { BlastGemKind } from '@/shared/types/blast';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import { vibrateBlastGem } from '@/components/grid/hapticFeedback';
import { emitGemLanded, subscribeGemsCollected } from '@/lib/blast/gemCollectBus';
import { BlastGemArt } from '../BlastGemArt';
import { GEM_PALETTE, GEM_RARITY } from '../blastGemVisuals';
import { playGemCollect } from './blastFxAudio';

/** Seconds between gems of one haul, so each lands (and rings) on its own beat. */
const HAUL_STAGGER = 0.14;
/** Most gems flown at once; any more land at once without a flight. */
const MAX_FLIGHTS = 10;

interface Flight {
  id: number;
  gem: BlastGemKind;
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
  delay: number;
  haulIndex: number;
}

function land(gem: BlastGemKind, haulIndex: number): void {
  const rarity = GEM_RARITY[gem];
  emitGemLanded(gem);
  playGemCollect(rarity, haulIndex);
  vibrateBlastGem(rarity);
}

/** One gem: bursts out of its tile with its name, then arcs into the gem counter. */
function GemFlight({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const p = GEM_PALETTE[flight.gem];
  const rarity = GEM_RARITY[flight.gem];

  useGSAP(
    () => {
      const q = gsap.utils.selector(rootRef);
      const dx = flight.tx - flight.x;
      const dy = flight.ty - flight.y;
      gsap
        .timeline({ delay: flight.delay, onComplete: () => onDone(flight.id) })
        .set(q('[data-fx]'), { autoAlpha: 1 })
        .fromTo(q('[data-fx="ring"]'), { scale: 0.3, opacity: 1 }, { scale: 2.4 + rarity * 0.3, opacity: 0, duration: 0.5, ease: 'power2.out' })
        .fromTo(q('[data-fx="label"]'), { y: 0, scale: 0.6 }, { y: -flight.size * 0.9, scale: 1, duration: 0.35, ease: 'back.out(2.2)' }, '<')
        .to(q('[data-fx="label"]'), { autoAlpha: 0, y: -flight.size * 1.3, duration: 0.3, ease: 'power1.in' }, '+=0.35')
        .fromTo(q('[data-fx="gem"]'), { scale: 0, rotate: -30 }, { scale: 1.35, rotate: 0, duration: 0.22, ease: 'back.out(3)' }, 0)
        .to(q('[data-fx="gem"]'), { scale: 1, duration: 0.1 }, '>')
        // x and y on different eases bend the flight into an arc that dips before it rises.
        .to(q('[data-fx="gem"]'), { x: dx, duration: 0.55, ease: 'power1.inOut' }, '>+0.05')
        .to(q('[data-fx="gem"]'), { y: dy, duration: 0.55, ease: 'back.in(1.6)' }, '<')
        .to(q('[data-fx="gem"]'), { scale: 0.45, rotate: 360, duration: 0.55, ease: 'power1.in' }, '<')
        .add(() => land(flight.gem, flight.haulIndex))
        .to(q('[data-fx="gem"]'), { autoAlpha: 0, duration: 0.08 });
    },
    { scope: rootRef },
  );

  const half = flight.size / 2;
  return (
    <div ref={rootRef} data-testid="blast-gem-flight" data-gem={flight.gem}>
      <span
        data-fx="ring"
        className="invisible absolute rounded-full border-4"
        style={{ left: flight.x - half, top: flight.y - half, width: flight.size, height: flight.size, borderColor: p.face, boxShadow: `0 0 18px ${p.glow}` }}
      />
      <span
        data-fx="label"
        className="invisible absolute -translate-x-1/2 whitespace-nowrap font-neo-display font-black uppercase leading-none tracking-wide"
        style={{
          left: flight.x,
          top: flight.y - half,
          color: p.light,
          fontSize: 12 + rarity * 2,
          WebkitTextStroke: '1.5px #0b1530',
          textShadow: '2px 2px 0 #0b1530',
        }}
        >
        {t(`blastProgress.gem_${flight.gem}`)}{rarity >= 3 ? '!' : ''}
      </span>
      <span
        data-fx="gem"
        className="invisible absolute"
        style={{ left: flight.x - half * 0.8, top: flight.y - half * 0.8, width: flight.size * 0.8, height: flight.size * 0.8, filter: `drop-shadow(0 0 10px ${p.glow})` }}
      >
        <BlastGemArt gem={flight.gem} className="h-full w-full" />
      </span>
    </div>
  );
}

/**
 * Makes collecting a gem a moment: each gem pops out of its tile with a burst and its
 * points, then arcs into the HUD gem counter, which ticks up as it lands with a chime
 * that climbs through the haul. Rarest gems fly last so a haul ends on its best find.
 */
export function BlastGemCollectFx({ boardRef, gridSize }: { boardRef: RefObject<HTMLElement | null>; gridSize: number }) {
  const reducedMotion = useReducedMotion();
  const [flights, setFlights] = useState<Flight[]>([]);
  const idRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(
    () =>
      subscribeGemsCollected((events) => {
        const haul = [...events].sort((a, b) => GEM_RARITY[a.gem] - GEM_RARITY[b.gem]);
        const board = boardRef.current?.getBoundingClientRect();
        if (reducedMotion || !board || board.width === 0) {
          haul.forEach((e, i) => land(e.gem, i));
          return;
        }
        const cell = board.width / gridSize;
        const counter = document.querySelector('[data-board-diamond-target]')?.getBoundingClientRect();
        // MP has no gem counter in its HUD: gems rise off the top of the board instead.
        const tx = counter ? counter.left + counter.width / 2 : board.left + board.width / 2;
        const ty = counter ? counter.top + counter.height / 2 : board.top - cell;
        const flown = haul.slice(0, MAX_FLIGHTS);
        haul.slice(MAX_FLIGHTS).forEach((e) => land(e.gem, MAX_FLIGHTS));
        setFlights((prev) => [
          ...prev,
          ...flown.map((e, i) => ({
            id: ++idRef.current,
            gem: e.gem,
            x: board.left + (e.col + 0.5) * cell,
            y: board.top + (e.row + 0.5) * cell,
            tx,
            ty,
            size: Math.max(28, Math.min(64, cell)),
            delay: i * HAUL_STAGGER,
            haulIndex: i,
          })),
        ]);
      }),
    [boardRef, gridSize, reducedMotion],
  );

  const done = (id: number) => setFlights((prev) => prev.filter((f) => f.id !== id));

  if (!mounted || flights.length === 0) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true" data-testid="blast-gem-collect-fx">
      {flights.map((f) => <GemFlight key={f.id} flight={f} onDone={done} />)}
    </div>,
    document.body,
  );
}
