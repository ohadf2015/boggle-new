'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Check } from 'lucide-react';
import gsap from 'gsap';
import { Container, Graphics } from 'pixi.js';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine';
import type { ParticleConfig } from '@/lib/gameEngine/types';
import type { RivalMarker } from '@/lib/wordTower/rivals';
import { blockMaterial } from '@/lib/wordTower/blockGrade';
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
  maxParticles: 110,
  frequency: 0.001,
  emitterLifetime: 0.16,
  particlesPerWave: 90,
  lifetime: { min: 0.5, max: 1.35 },
  speed: { min: 280, max: 820 },
  gravity: { x: 0, y: 980 },
  scale: { start: 1.6, end: 0.15 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -480, max: 480 },
  colors: ['ffe135', 'ff1493', 'ff3366', 'ffffff', 'bfff00', '00ffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 28 },
  shape: 'rect',
};

/** Secondary dust / spark ring for the perfect smash aftershock. */
const IMPACT_SPARKS: ParticleConfig = {
  maxParticles: 80,
  frequency: 0.001,
  emitterLifetime: 0.1,
  particlesPerWave: 70,
  lifetime: { min: 0.25, max: 0.7 },
  speed: { min: 160, max: 540 },
  gravity: { x: 0, y: 200 },
  scale: { start: 1.1, end: 0.05 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -200, max: 200 },
  colors: ['ffffff', 'ffe135', '00ffff', 'bfff00'],
  spawnShape: 'burst',
  spawnConfig: { directions: 24 },
  shape: 'circle',
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
      className={cn(
        'pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4',
        phase === 'impact' && !reducedMotion && 'wt-smash-screen-shake',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={t('wordTower.sabotage.smashTitle')}
      data-testid="wt-smash-stage"
      data-phase={phase}
    >
      <style>{`
        @keyframes wt-smash-screen-shake {
          0%,100% { transform: translate(0,0); }
          20% { transform: translate(-6px, 3px); }
          40% { transform: translate(7px, -4px); }
          60% { transform: translate(-5px, -2px); }
          80% { transform: translate(4px, 5px); }
        }
        .wt-smash-screen-shake { animation: wt-smash-screen-shake 0.45s ease-out; }
      `}</style>
      <div className="relative flex w-full max-w-md flex-col items-center gap-4 rounded-neo border-neo-thick border-black bg-neo-navy p-5 shadow-hard">
        {(phase === 'impact' || phase === 'result') && (
          <div
            data-testid="wt-smash-debris"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-neo"
            aria-hidden
          >
            {!reducedMotion &&
              Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute h-2 w-2 rounded-[2px] border border-black bg-neo-yellow"
                  style={{
                    left: `${8 + (i * 7) % 84}%`,
                    top: `${20 + (i * 11) % 50}%`,
                    animation: `wt-debris-fall 0.7s ease-in both`,
                    animationDelay: `${i * 0.03}s`,
                    backgroundColor: ['#ffe135', '#ff1493', '#00ffff', '#bfff00'][i % 4],
                  }}
                />
              ))}
            <style>{`
              @keyframes wt-debris-fall {
                0% { transform: translateY(-12px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(90px) rotate(220deg); opacity: 0; }
              }
            `}</style>
          </div>
        )}
        <div className="flex w-full flex-col items-center gap-1.5 text-center">
          <Avatar
            customAvatar={target.customAvatar ?? undefined}
            userId={target.playerId ?? target.id}
            pixelSize={40}
            disableEffects
            className="rounded-full border-neo border-black shadow-hard-sm"
          />
          <h2 className="font-neo-display text-lg font-black uppercase text-neo-white">
            {phase === 'result'
              ? t('wordTower.sabotage.floorsDestroyed', { n: floors })
              : t('wordTower.sabotage.smashTitle')}
          </h2>
          <p className="font-neo-body text-sm text-neo-white/70">{target.name}</p>
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
              material={blockMaterial(target.highestBiome ?? 'city')}
              onImpactDone={handleImpactDone}
            />
          </GameCanvas>
        )}

        {phase === 'result' && (
          <div className="flex w-full flex-col items-center gap-1.5">
            <div className={cn('font-neo-display text-2xl font-black uppercase', verdictColor, !reducedMotion && 'animate-neo-pop')}>
              {t(`wordTower.sabotage.verdict.${verdict}`)}
            </div>
            <div className="flex items-center gap-2 rounded-neo border-neo border-black bg-neo-navy-light px-3 py-1.5">
              <span className="font-neo-body text-xs text-neo-white/70">
                {t('wordTower.sabotage.newHeight')}
              </span>
              <span className="font-neo-display text-lg font-black text-neo-cyan">
                {t('wordTower.sabotage.newHeightValue', { m: Math.round(newHeightM) })}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={phase === 'aim' ? handleStrike : phase === 'result' ? finish : undefined}
          disabled={phase === 'impact'}
          className={cn(
            'group relative flex w-full min-h-[52px] items-center justify-center gap-2 overflow-hidden rounded-full border-neo-thick border-black px-6 py-3.5 font-neo-display text-base font-black uppercase tracking-wider shadow-hard transition-all',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan',
            phase === 'aim' &&
              'bg-gradient-to-b from-neo-pink via-neo-pink to-neo-pink/85 text-neo-white hover:shadow-hard-lg hover:brightness-110 active:scale-[0.98] active:shadow-hard-pressed',
            phase === 'impact' && 'cursor-wait bg-neo-navy-light text-neo-white/40',
            phase === 'result' &&
              'bg-gradient-to-b from-neo-lime via-neo-lime to-neo-lime/85 text-neo-black hover:shadow-hard-lg hover:brightness-110 active:scale-[0.98] active:shadow-hard-pressed',
          )}
        >
          {/* Premium sheen sweep on hover. */}
          {phase !== 'impact' && (
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" aria-hidden />
          )}
          {phase === 'aim' && <Crosshair className="h-5 w-5" aria-hidden />}
          {phase === 'result' && <Check className="h-5 w-5" aria-hidden />}
          <span>
            {phase === 'aim'
              ? t('wordTower.sabotage.strikeCta')
              : phase === 'impact'
                ? t('wordTower.sabotage.smashReleasing')
                : t('wordTower.sabotage.done')}
          </span>
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
  /** The rival's actual highest-zone material colour (from {@link blockMaterial})
   *  so the mini-game shows THEIR building, not a generic yellow stand-in. */
  material: number;
  onImpactDone: () => void;
}

/** The WebGL scene: crane + swinging ball + rival tower + power meter, plus the
 *  impact choreography. Lives inside <GameCanvas> so it can pull the engine. */
function SmashStage({ phase, powerRef, floors, blockCount, material, onImpactDone }: StageProps) {
  const engine = useGameEngine();
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const floorsRef = useRef(floors);
  floorsRef.current = floors;

  // Persistent scene refs across ticker frames.
  const refs = useRef<{
    root: Container;
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

    // Rival tower — stacked blocks in THEIR actual highest-zone material (not a
    // generic yellow stand-in), top `floors` tinted danger-red so the doomed
    // floors read clearly against their real building's colour.
    const blockW = Math.round(W * 0.24);
    const blockH = Math.round(H * 0.06);
    const baseX = Math.round(W * 0.6);
    const baseY = groundY;
    const blocks: Graphics[] = [];
    for (let i = 0; i < blockCount; i++) {
      const g = new Graphics();
      const doomed = i >= blockCount - floorsRef.current;
      const fill = doomed ? C.red : material;
      g.roundRect(-blockW / 2, -blockH, blockW, blockH - 3, 4)
        .fill(fill)
        .stroke({ width: 3, color: C.black });
      // Pixel-block bevel — light top edge, dark bottom edge — matching the
      // real tower tiles' inset-highlight look so this reads as the SAME
      // material, not a flat mini-game placeholder.
      g.rect(-blockW / 2, -blockH, blockW, 3).fill({ color: C.white, alpha: 0.28 });
      g.rect(-blockW / 2, -6, blockW, 3).fill({ color: C.black, alpha: 0.3 });
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

    // Chain (redrawn each frame) + heavy metal wrecking ball.
    const chain = new Graphics();
    root.addChild(chain);
    const chainLen = Math.round(H * 0.3);
    const ball = new Container();
    const ballG = new Graphics();
    const ballR = Math.round(W * 0.085);
    // Layered metallic sphere: cast-iron base + warm mid-tone + cool highlight +
    // bottom shadow rim so it reads as solid iron, not a flat toy ball.
    ballG.circle(0, 0, ballR).fill({ color: 0x3a3a44 });
    ballG.circle(0, 0, ballR * 0.95).fill({ color: 0x555560 });
    ballG.circle(0, 0, ballR * 0.78).fill({ color: 0x6e6e7a });
    // Broad top-left specular sheen — steel glint that tracks the swing.
    ballG.ellipse(-ballR * 0.34, -ballR * 0.36, ballR * 0.32, ballR * 0.22).fill({ color: 0xd8d8e0, alpha: 0.45 });
    // Tighter hot spot inside the sheen.
    ballG.ellipse(-ballR * 0.3, -ballR * 0.32, ballR * 0.12, ballR * 0.08).fill({ color: 0xffffff, alpha: 0.55 });
    // Bottom-right contact shadow rim.
    ballG.ellipse(ballR * 0.32, ballR * 0.34, ballR * 0.26, ballR * 0.18).fill({ color: 0x1a1a22, alpha: 0.7 });
    ballG.circle(0, 0, ballR).stroke({ width: 2.5, color: 0x111116 });
    ball.addChild(ballG);
    // Shackle ring on top — the chain bolts through it.
    const shackle = new Graphics();
    shackle.circle(0, -ballR, ballR * 0.24).stroke({ width: 4, color: 0x111116 });
    shackle.circle(0, -ballR, ballR * 0.24).stroke({ width: 2, color: 0x6e6e7a });
    shackle.circle(0, -ballR, ballR * 0.1).fill({ color: 0x4a4a55 });
    ball.addChild(shackle);
    root.addChild(ball);

    /** Draw a linked chain between pivot and ball so it looks like real rigging. */
    const drawChain = (g: Graphics, x1: number, y1: number, x2: number, y2: number) => {
      g.clear();
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const linkCount = Math.max(8, Math.round(len / 11));
      for (let i = 0; i <= linkCount; i++) {
        const t = i / linkCount;
        const x = x1 + dx * t;
        const y = y1 + dy * t;
        const alt = i % 2 === 0;
        const lw = alt ? 3.2 : 2.6;
        const lh = alt ? 5.5 : 4.4;
        g.ellipse(x, y, lw, lh).stroke({ width: 2, color: 0x111116 });
        g.ellipse(x, y, lw - 0.8, lh - 0.8).stroke({ width: 1.2, color: 0x6e6e7a });
        // Small inner gap so the links read as rings, not pills.
        g.ellipse(x, y, lw * 0.35, lh * 0.35).fill({ color: 0x22222b });
      }
    };

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

    refs.current = { root, ball, chain, meterFill, blocks, pivot, chainLen, blockW, meter, elapsed: 0 };

    // Aim + swing ticker.
    const tick = (ticker: { deltaMS: number }) => {
      const r = refs.current;
      if (!r || phaseRef.current !== 'aim') return;
      r.elapsed += ticker.deltaMS / 1000;
      const p = powerAt(r.elapsed, 0.6); // ~0.6 cycles/sec — slower, more deliberate
      powerRef.current = p;

      // Ball winds further back (away from building) as power rises, plus a slow
      // heavy pendulum swing so the wrecking ball feels weighty and alive.
      const swayDeg = Math.sin(r.elapsed * 1.3) * 12;
      const bobPx = Math.sin(r.elapsed * 2.1) * 2;
      const angleDeg = 10 - p * 78 + swayDeg; // +10° (loaded) → −68° (wound)
      const a = (angleDeg * Math.PI) / 180;
      const len = r.chainLen + bobPx;
      r.ball.x = r.pivot.x + Math.sin(a) * len;
      r.ball.y = r.pivot.y + Math.cos(a) * len;
      r.ball.rotation = -a * 0.45; // natural twist with the arc

      if (!r.chain.destroyed) {
        drawChain(r.chain, r.pivot.x, r.pivot.y, r.ball.x, r.ball.y);
      }

      const inSweet = p >= SMASH_SWEET_SPOT;
      if (r.meterFill.destroyed) return;
      r.meterFill.clear();
      r.meterFill
        .roundRect(r.meter.x + 2, r.meter.y + 2, Math.max(0, (r.meter.w - 4) * p), r.meter.h - 4, 4)
        .fill(inSweet ? C.lime : C.cyan);
    };
    engine.app.ticker.add(tick);

    return () => {
      // engine.app.ticker can already be null here — Pixi's Application.destroy()
      // nulls its own `ticker` property, and this cleanup can run after a sibling
      // scene already tore down the shared engine (Sentry JAVASCRIPT-NEXTJS-1R6/1R7).
      engine.app.ticker?.remove(tick);
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

    // Impact: bigger FX + shatter the top `n` blocks with cascading debris.
    tl.add(() => {
      const hitY = r.blocks[r.blocks.length - 1].y - 10;
      const burstN = 48 + n * 18 + Math.round(power * 24);
      engine.particles.burst(BRICK_DEBRIS, impactX, hitY, burstN);
      engine.particles.burst(IMPACT_SPARKS, impactX, hitY, 30 + Math.round(power * 40));
      // Dual flash — white core + pink rim for a heavier "demolition" beat.
      engine.flash.flash({ color: 0xffffff, duration: 0.12, intensity: 0.45 + power * 0.35 });
      engine.flash.flash({ color: 0xffe135, duration: 0.28, intensity: 0.3 + power * 0.35 });
      engine.shake.shake({
        intensity: 12 + n * 4 + power * 10,
        duration: 0.55 + power * 0.25,
        decay: 'exponential',
      });

      // Ball squash-stretch on collision — a heavy object hitting a solid wall
      // deforms for a couple frames before rebounding; sells weight far better
      // than the swing alone.
      if (!r.ball.destroyed) {
        gsap
          .timeline()
          .to(r.ball.scale, { x: 1.6, y: 0.5, duration: 0.07, ease: 'power2.out' })
          .to(r.ball.scale, { x: 0.85, y: 1.15, duration: 0.1, ease: 'power1.inOut' })
          .to(r.ball.scale, { x: 1, y: 1, duration: 0.18, ease: 'elastic.out(1,0.5)' });
      }

      // Shockwave ring — an expanding, fading stroke from the impact point so
      // the hit reads as striking a SOLID structure, not empty air.
      const ring = new Graphics();
      ring.circle(0, 0, 30).stroke({ width: 6, color: C.white, alpha: 0.9 });
      ring.x = impactX;
      ring.y = hitY;
      r.root.addChild(ring);
      gsap.to(ring.scale, { x: 3.4, y: 3.4, duration: 0.5, ease: 'power2.out' });
      gsap.to(ring, {
        alpha: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => { if (!ring.destroyed) ring.destroy(); },
      });

      for (let k = 0; k < n; k++) {
        const b = r.blocks[r.blocks.length - 1 - k];
        if (!b || b.destroyed) continue;
        gsap.to(b, {
          x: b.x + (Math.random() - 0.5) * r.blockW * 3.2,
          y: b.y - 60 - Math.random() * 180,
          rotation: (Math.random() - 0.5) * 8,
          alpha: 0,
          duration: 0.7,
          ease: 'power3.out',
          delay: k * 0.04,
        });
      }

      // Structural shudder — the SURVIVING floors below the hit visibly rock
      // sideways, strongest right under the impact and decaying with depth, so
      // the whole building reacts instead of only the destroyed blocks moving
      // (founder ask: "should look like it is hurting the real building").
      const survivors = r.blocks.length - n;
      for (let s = 0; s < survivors; s++) {
        const b = r.blocks[survivors - 1 - s];
        if (!b || b.destroyed) continue;
        const mag = (6 - s) * 1.6 * (0.4 + power * 0.6);
        if (mag < 0.5) break; // decayed to nothing — deeper floors stay still
        const restX = b.x;
        gsap
          .timeline({ delay: s * 0.025 })
          .to(b, { x: restX + mag, duration: 0.06, ease: 'power1.out' })
          .to(b, { x: restX - mag * 0.6, duration: 0.08, ease: 'power1.inOut' })
          .to(b, { x: restX, duration: 0.14, ease: 'elastic.out(1,0.4)' });
      }

      // Secondary aftershock burst for solid/perfect power — extra spectacle without
      // changing the authoritative floors count (already computed from accuracy).
      if (power >= SMASH_SWEET_SPOT) {
        gsap.delayedCall(0.12, () => {
          engine.particles.burst(BRICK_DEBRIS, impactX + 10, hitY + 18, 28 + n * 8);
          engine.shake.shake({ intensity: 8 + n * 2, duration: 0.28, decay: 'exponential' });
        });
      }
    });

    // Ball rebounds down + fades with a heavier spin.
    tl.to(
      r.ball,
      {
        y: `+=${Math.round(engine.height * 0.28)}`,
        rotation: '+=3.5',
        alpha: 0,
        duration: 0.55,
        ease: 'power1.in',
      },
      '>-0.05',
    );

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
    <div className="relative flex w-full flex-col items-center gap-4 py-2">
      <div className="flex flex-col gap-1">
        {Array.from({ length: blockCount }).map((_, i) => {
          const doomed = phase !== 'aim' && i >= blockCount - floors;
          const vulnerable = phase === 'aim' && i >= blockCount - Math.max(1, floors || 1);
          return (
            <div
              key={i}
              className={cn(
                'h-4 w-20 rounded-sm border-neo border-black shadow-hard transition-all duration-300',
                doomed && 'translate-x-3 -translate-y-2 rotate-12 scale-75 bg-neo-navy/30 opacity-40',
                !doomed && vulnerable && 'bg-neo-red/80 ring-2 ring-neo-yellow/60',
                !doomed && !vulnerable && 'bg-neo-yellow',
              )}
            />
          );
        })}
      </div>
      {phase === 'aim' && (
        <div className="relative h-5 w-full max-w-xs overflow-hidden rounded-neo border-neo-thick border-black bg-neo-navy shadow-hard-sm">
          {/* green sweet-spot band — thicker, higher-contrast vulnerable signal */}
          <div
            className="absolute inset-y-0 bg-neo-lime/45"
            style={{ left: `${SMASH_SWEET_SPOT * 100}%`, right: 0 }}
          />
          <div ref={fillRef} className="h-full bg-neo-cyan" style={{ width: '0%' }} />
        </div>
      )}
    </div>
  );
}
