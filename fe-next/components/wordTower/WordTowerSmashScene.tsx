'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Container, Graphics } from 'pixi.js';
import { cn } from '@/lib/utils';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine';
import type { ParticleConfig } from '@/lib/gameEngine/types';
import type { RivalMarker } from '@/lib/wordTower/rivals';
import {
  asyncWreckDamageFloors,
  smashVerdict,
  heightToBlocks,
  SABOTAGE_M_PER_FLOOR,
  SMASH_SWEET_SPOT,
} from '@/lib/wordTower/sabotage';

interface WordTowerSmashSceneProps {
  target: RivalMarker;
  /** Attacker's height (m) — feeds the shared damage formula so the floors the
   *  scene SHOWS match what the rail + server actually apply. */
  attackerHeightM: number;
  /** Called once with the captured strike power (0..1) — the caller turns it into
   *  authoritative damage via {@link asyncWreckDamageFloors}. */
  onDone: (accuracy: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  reducedMotion?: boolean;
}

type Phase = 'aim' | 'impact' | 'result';

// Neo palette (hex ints for Pixi).
const C = {
  navy: 0x1a1a2e,
  navyLight: 0x16213e,
  black: 0x000000,
  white: 0xffffff,
  pink: 0xff1493,
  yellow: 0xffe135,
  red: 0xff3366,
  lime: 0xbfff00,
  cyan: 0x00ffff,
} as const;

/** Brick-chunk debris — opaque rect shards in tower-block colours. */
const BRICK_DEBRIS: ParticleConfig = {
  maxParticles: 60,
  frequency: 0.001,
  emitterLifetime: 0.12,
  particlesPerWave: 60,
  lifetime: { min: 0.4, max: 1.0 },
  speed: { min: 220, max: 620 },
  gravity: { x: 0, y: 900 },
  scale: { start: 1.3, end: 0.2 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -360, max: 360 },
  colors: ['ffe135', 'ff1493', 'ff3366', 'ffffff', 'bfff00'],
  spawnShape: 'burst',
  spawnConfig: { directions: 22 },
  shape: 'rect',
};

/** Power oscillator — smooth 0→1→0 sweep; `speed` is cycles/sec. */
function powerAt(elapsedSec: number, speed: number): number {
  return (1 - Math.cos(elapsedSec * speed * Math.PI * 2)) / 2;
}

/**
 * WordTowerSmashScene — an interactive Pixi wrecking-ball mini-game.
 *
 * The player TIMES a strike: a power meter sweeps up and down with a green
 * sweet-spot band, and the wrecking ball winds further back as power rises. Tap
 * STRIKE to capture the power at that instant — nailing the green zone launches a
 * full-force swing that shatters the max floors; a mistimed tap barely dents it.
 * The captured power (0..1) is handed to `onDone`, which turns it into
 * authoritative damage through the shared {@link asyncWreckDamageFloors} formula
 * (skill raises damage up to the same cap a big height-lead reaches).
 *
 * Reduced motion: a compact DOM fallback keeps the essential skill meter (a
 * functional, user-driven control) but drops the canvas, particles, and shake.
 */
export function WordTowerSmashScene({
  target,
  attackerHeightM,
  onDone,
  t,
  reducedMotion,
}: WordTowerSmashSceneProps) {
  const [phase, setPhase] = useState<Phase>('aim');
  const [accuracy, setAccuracy] = useState(0);
  const powerRef = useRef(0);
  const doneRef = useRef(false);
  const autoCloseRef = useRef<NodeJS.Timeout | null>(null);

  const floors = asyncWreckDamageFloors(attackerHeightM, target.heightM, accuracy);
  const verdict = smashVerdict(accuracy);
  const newHeightM = Math.max(0, target.heightM - floors * SABOTAGE_M_PER_FLOOR);

  // Canvas size — fixed at mount from the viewport (no resize observer needed).
  const size = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 380;
    const w = Math.min(360, vw - 40);
    return { w, h: Math.round(w * 1.15) };
  }, []);

  const finish = useCallback(() => {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(powerRef.current);
  }, [onDone]);

  const handleStrike = useCallback(() => {
    if (phase !== 'aim') return;
    setAccuracy(powerRef.current);
    setPhase('impact');
  }, [phase]);

  // Impact → result → auto-close beat.
  const handleImpactDone = useCallback(() => {
    setPhase('result');
    autoCloseRef.current = setTimeout(finish, 2400);
  }, [finish]);

  useEffect(() => () => {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
  }, []);

  // Reduced motion has no Pixi stage to drive the impact→result beat, so advance
  // it here (a short pause to register the tap, then the result readout).
  useEffect(() => {
    if (!reducedMotion || phase !== 'impact') return;
    const id = setTimeout(handleImpactDone, 350);
    return () => clearTimeout(id);
  }, [reducedMotion, phase, handleImpactDone]);

  const verdictColor =
    verdict === 'perfect' ? 'text-neo-lime' : verdict === 'solid' ? 'text-neo-yellow' : 'text-neo-white';

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('wordTower.sabotage.smashTitle')}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-neo border-neo-thick border-black bg-neo-navy p-5 shadow-hard">
        <div className="w-full text-center">
          <h2 className="font-neo-display text-lg font-black uppercase text-neo-white">
            {phase === 'result'
              ? t('wordTower.sabotage.floorsDestroyed', { n: floors })
              : t('wordTower.sabotage.smashTitle')}
          </h2>
          <p className="mt-0.5 font-neo-body text-sm text-neo-white/70">{target.name}</p>
        </div>

        {reducedMotion ? (
          <SmashDomFallback
            phase={phase}
            powerRef={powerRef}
            blockCount={heightToBlocks(target.heightM)}
            floors={floors}
          />
        ) : (
          <GameCanvas
            config={{ width: size.w, height: size.h, background: C.navyLight }}
            usePhysics={false}
            className="rounded-neo overflow-hidden border-neo border-black"
          >
            <SmashStage
              phase={phase}
              powerRef={powerRef}
              floors={floors}
              blockCount={heightToBlocks(target.heightM)}
              onImpactDone={handleImpactDone}
            />
          </GameCanvas>
        )}

        {phase === 'result' && (
          <div className="flex w-full flex-col items-center gap-1.5">
            <div className={cn('font-neo-display text-2xl font-black uppercase', verdictColor)}>
              {t(`wordTower.sabotage.verdict.${verdict}`)}
            </div>
            <div className="flex items-center gap-2 rounded-neo border-neo border-black bg-neo-navy-light px-3 py-1.5">
              <span className="font-neo-body text-xs text-neo-white/70">
                {t('wordTower.sabotage.newHeight')}
              </span>
              <span className="font-neo-display text-lg font-black text-neo-cyan">
                {Math.round(newHeightM)}m
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={phase === 'aim' ? handleStrike : phase === 'result' ? finish : undefined}
          disabled={phase === 'impact'}
          className={cn(
            'w-full rounded-neo border-neo-thick border-black px-4 py-3 font-neo-display text-base font-black uppercase shadow-hard transition-transform active:translate-y-px',
            phase === 'aim' && 'bg-neo-pink text-neo-white hover:scale-105',
            phase === 'impact' && 'bg-neo-navy-light text-neo-white/40',
            phase === 'result' && 'bg-neo-lime text-neo-black hover:scale-105',
          )}
        >
          {phase === 'aim'
            ? t('wordTower.sabotage.strikeCta')
            : phase === 'impact'
              ? '…'
              : t('wordTower.sabotage.done')}
        </button>

        {phase === 'aim' && (
          <p className="-mt-1 font-neo-body text-[11px] text-neo-white/50">
            {t('wordTower.sabotage.strikeHint')}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Pixi stage ────────────────────────────────────────────────────────

interface StageProps {
  phase: Phase;
  powerRef: React.RefObject<number>;
  floors: number;
  blockCount: number;
  onImpactDone: () => void;
}

/** The WebGL scene: crane + swinging ball + rival tower + power meter, plus the
 *  impact choreography. Lives inside <GameCanvas> so it can pull the engine. */
function SmashStage({ phase, powerRef, floors, blockCount, onImpactDone }: StageProps) {
  const engine = useGameEngine();
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const floorsRef = useRef(floors);
  floorsRef.current = floors;

  // Persistent scene refs across ticker frames.
  const refs = useRef<{
    ball: Container;
    chain: Graphics;
    meterFill: Graphics;
    blocks: Graphics[];
    pivot: { x: number; y: number };
    chainLen: number;
    blockW: number;
    meter: { x: number; y: number; w: number; h: number };
    elapsed: number;
  } | null>(null);

  // Build the scene once.
  useEffect(() => {
    const { camera, width: W, height: H } = engine;
    const root = new Container();
    camera.addChild(root);

    // Ground line — sits above a reserved bottom strip that holds the power
    // meter, so the meter never hides behind the tower.
    const groundY = H - 46;
    const ground = new Graphics();
    ground.rect(0, groundY, W, 5).fill(C.navy);
    root.addChild(ground);

    // Rival tower — stacked blocks, top `floors` tinted danger-red.
    const blockW = Math.round(W * 0.24);
    const blockH = Math.round(H * 0.06);
    const baseX = Math.round(W * 0.6);
    const baseY = groundY;
    const blocks: Graphics[] = [];
    for (let i = 0; i < blockCount; i++) {
      const g = new Graphics();
      const doomed = i >= blockCount - floorsRef.current;
      g.roundRect(-blockW / 2, -blockH, blockW, blockH - 3, 4)
        .fill(doomed ? C.red : C.yellow)
        .stroke({ width: 3, color: C.black });
      g.x = baseX;
      g.y = baseY - i * blockH;
      root.addChild(g);
      blocks.push(g);
    }

    // Crane: mast + jib.
    const crane = new Graphics();
    const pivot = { x: Math.round(W * 0.3), y: Math.round(H * 0.14) };
    crane.rect(Math.round(W * 0.13) - 4, pivot.y, 8, H - pivot.y - 8).fill(C.navy).stroke({ width: 3, color: C.black });
    crane.rect(Math.round(W * 0.13) - 4, pivot.y - 4, pivot.x - Math.round(W * 0.13) + 8, 8).fill(C.navy).stroke({ width: 3, color: C.black });
    root.addChild(crane);

    // Chain (redrawn each frame) + ball.
    const chain = new Graphics();
    root.addChild(chain);
    const chainLen = Math.round(H * 0.3);
    const ball = new Container();
    const ballG = new Graphics();
    const ballR = Math.round(W * 0.075);
    ballG.circle(0, 0, ballR).fill(C.pink).stroke({ width: 3, color: C.black });
    ballG.circle(-ballR * 0.3, -ballR * 0.3, ballR * 0.25).fill(C.white); // highlight
    ball.addChild(ballG);
    root.addChild(ball);

    // Power meter (bottom): track, green sweet-spot band, live fill.
    const meter = { x: Math.round(W * 0.12), y: H - 30, w: Math.round(W * 0.76), h: 16 };
    const track = new Graphics();
    track.roundRect(meter.x, meter.y, meter.w, meter.h, 6).fill(C.navy).stroke({ width: 3, color: C.black });
    const sweet = new Graphics();
    sweet
      .rect(meter.x + meter.w * SMASH_SWEET_SPOT, meter.y, meter.w * (1 - SMASH_SWEET_SPOT), meter.h)
      .fill({ color: C.lime, alpha: 0.35 });
    const meterFill = new Graphics();
    root.addChild(track, sweet, meterFill);

    refs.current = { ball, chain, meterFill, blocks, pivot, chainLen, blockW, meter, elapsed: 0 };

    // Aim + swing ticker.
    const tick = (ticker: { deltaMS: number }) => {
      const r = refs.current;
      if (!r || phaseRef.current !== 'aim') return;
      r.elapsed += ticker.deltaMS / 1000;
      const p = powerAt(r.elapsed, 0.72); // ~0.72 cycles/sec sweep
      powerRef.current = p;

      // Ball winds further back (away from building) as power rises.
      const angleDeg = 10 - p * 78; // +10° (loaded) → −68° (wound)
      const a = (angleDeg * Math.PI) / 180;
      r.ball.x = r.pivot.x + Math.sin(a) * r.chainLen;
      r.ball.y = r.pivot.y + Math.cos(a) * r.chainLen;

      r.chain.clear();
      r.chain.moveTo(r.pivot.x, r.pivot.y).lineTo(r.ball.x, r.ball.y).stroke({ width: 3, color: C.black });

      const inSweet = p >= SMASH_SWEET_SPOT;
      r.meterFill.clear();
      r.meterFill
        .roundRect(r.meter.x + 2, r.meter.y + 2, Math.max(0, (r.meter.w - 4) * p), r.meter.h - 4, 4)
        .fill(inSweet ? C.lime : C.cyan);
    };
    engine.app.ticker.add(tick);

    return () => {
      engine.app.ticker.remove(tick);
      if (!root.destroyed) root.destroy({ children: true });
      refs.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Impact choreography — fires when phase flips to 'impact'.
  useEffect(() => {
    if (phase !== 'impact') return;
    const r = refs.current;
    if (!r) {
      onImpactDone();
      return;
    }
    const topBlock = r.blocks[r.blocks.length - 1];
    const impactX = topBlock.x - r.blockW / 2;
    const n = floorsRef.current;
    const power = powerRef.current;

    const tl = gsap.timeline({ onComplete: onImpactDone });

    // Ball swings THROUGH into the building, spinning.
    tl.to(r.ball, {
      x: impactX,
      y: r.blocks[Math.max(0, r.blocks.length - n)].y - 20,
      rotation: 2.2,
      duration: 0.3 + (1 - power) * 0.12,
      ease: 'power2.in',
      onUpdate: () => {
        if (!r.chain.destroyed) {
          r.chain.clear();
          r.chain.moveTo(r.pivot.x, r.pivot.y).lineTo(r.ball.x, r.ball.y).stroke({ width: 3, color: C.black });
        }
      },
    });

    // Impact: FX + shatter the top `n` blocks.
    tl.add(() => {
      engine.particles.burst(BRICK_DEBRIS, impactX, r.blocks[r.blocks.length - 1].y - 10, 30 + n * 12);
      engine.flash.flash({ color: 0xffe135, duration: 0.18, intensity: 0.25 + power * 0.2 });
      engine.shake.shake({ intensity: 6 + n * 3, duration: 0.35, decay: 'exponential' });
      for (let k = 0; k < n; k++) {
        const b = r.blocks[r.blocks.length - 1 - k];
        if (!b || b.destroyed) continue;
        gsap.to(b, {
          x: b.x + (Math.random() - 0.5) * r.blockW * 2.4,
          y: b.y - 40 - Math.random() * 120,
          rotation: (Math.random() - 0.5) * 5,
          alpha: 0,
          duration: 0.55,
          ease: 'power2.out',
          delay: k * 0.05,
        });
      }
    });

    // Ball rebounds down + fades.
    tl.to(r.ball, { y: `+=${Math.round(engine.height * 0.25)}`, alpha: 0, duration: 0.5, ease: 'power1.in' }, '>-0.1');

    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return null;
}

// ─── Reduced-motion DOM fallback ──────────────────────────────────────

interface FallbackProps {
  phase: Phase;
  powerRef: React.RefObject<number>;
  blockCount: number;
  floors: number;
}

/** Keeps the skill meter (a functional control) but no canvas / particles /
 *  shake — a slower sweep respects prefers-reduced-motion. */
function SmashDomFallback({ phase, powerRef, blockCount, floors }: FallbackProps) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== 'aim') return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const p = powerAt((now - start) / 1000, 0.5); // slower sweep
      powerRef.current = p;
      if (fillRef.current) {
        fillRef.current.style.width = `${p * 100}%`;
        fillRef.current.style.background = p >= SMASH_SWEET_SPOT ? '#BFFF00' : '#00FFFF';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, powerRef]);

  return (
    <div className="flex w-full flex-col items-center gap-4 py-2">
      <div className="flex flex-col gap-1">
        {Array.from({ length: blockCount }).map((_, i) => {
          const doomed = phase !== 'aim' && i >= blockCount - floors;
          return (
            <div
              key={i}
              className={cn(
                'h-4 w-20 rounded-sm border-neo border-black shadow-hard transition-colors',
                doomed ? 'bg-neo-navy/40' : i >= blockCount - floors ? 'bg-neo-red/70' : 'bg-neo-yellow',
              )}
            />
          );
        })}
      </div>
      {phase === 'aim' && (
        <div className="relative h-4 w-full max-w-xs overflow-hidden rounded-neo border-neo border-black bg-neo-navy">
          {/* green sweet-spot band */}
          <div
            className="absolute inset-y-0 bg-neo-lime/30"
            style={{ left: `${SMASH_SWEET_SPOT * 100}%`, right: 0 }}
          />
          <div ref={fillRef} className="h-full bg-neo-cyan" style={{ width: '0%' }} />
        </div>
      )}
    </div>
  );
}
