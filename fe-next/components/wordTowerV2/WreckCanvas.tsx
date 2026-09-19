'use client';

import { Application, Container, Graphics } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { ParticlePool } from '@/lib/gameEngine/ParticleSystem';
import { ScreenShake } from '@/lib/gameEngine/ScreenShake';
import { RUBBLE_BURST, TOWER_DUST } from '@/lib/gameEngine/presets/particles';
import {
  BALL_RADIUS_PX,
  type WreckWorld,
  ballPath,
  ballSpent,
  buildWreckWorld,
  cutBall,
  hangBall,
  stepWreck,
  swingLeftPx,
  wreckedCount,
} from '@/lib/wordTowerV2/wreck';
import { type BlockView, createBlockView, paintBlock, paintGround, paintThrowArc, paintWreckRig } from './towerArt';

/**
 * Pixi view of the smash round. Owns the ball cycle: hang -> (player cuts) ->
 * fly -> spent -> hang the next one while any are left. The parent only draws
 * the HUD from `onUpdate` and forwards taps through `registerCut`.
 */

export interface WreckUpdate {
  wrecked: number;
  total: number;
  ballsLeft: number;
  /** Ball on the chain right now (tap would cut it). */
  armed: boolean;
  done: boolean;
  /** Bumps on every heavy hit — the parent pops a CRASH! on change. */
  hits: number;
}

interface Props {
  words: string[];
  balls: number;
  registerCut: (cut: () => void) => void;
  onUpdate: (u: WreckUpdate) => void;
  className?: string;
}

/** A spent ball's tower keeps tumbling; give the rubble time before judging. */
const SETTLE_AFTER_SPENT_MS = 900;
/** Cut balls that never stop (rolling off) are called spent after this. */
const MAX_FLIGHT_MS = 3200;

export default function WreckCanvas({ className, ...props }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let app: Application | null = null;

    const world: WreckWorld = buildWreckWorld(propsRef.current.words);
    let ballsLeft = propsRef.current.balls;
    let cutAt = 0;
    let spentAt = 0;
    let hits = 0;
    let lastReport = '';

    const armNext = () => {
      if (ballsLeft <= 0) return;
      ballsLeft -= 1;
      hangBall(world);
      cutAt = 0;
      spentAt = 0;
    };
    armNext();

    propsRef.current.registerCut(() => {
      if (!world.chain) return;
      cutBall(world);
      cutAt = performance.now();
    });

    void (async () => {
      const created = new Application();
      await created.init({
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: host,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (disposed) {
        created.destroy(true);
        return;
      }
      app = created;
      host.appendChild(created.canvas);

      const scene = new Container();
      const flash = new Graphics();
      created.stage.addChild(scene, flash);
      const ground = new Graphics();
      const blocks = new Container();
      const rig = new Graphics();
      const aim = new Graphics();
      scene.addChild(blocks, aim, rig, ground);
      const views = new Map<string, BlockView>();
      const shake = new ScreenShake();
      const particles = new ParticlePool(scene);
      let flashAlpha = 0;
      let groundKey = '';
      let lastTs = performance.now();

      const tick = (ts: number) => {
        raf = requestAnimationFrame(tick);
        const frameMs = Math.min(ts - lastTs, 100);
        lastTs = ts;
        const dt = frameMs / 1000;
        stepWreck(world, frameMs);

        for (const impact of world.tower.pendingImpacts) {
          if (impact.speed <= 3) continue;
          const b = world.tower.blocks.get(impact.id);
          if (!b) continue;
          particles.burst(TOWER_DUST, b.position.x, b.position.y, 6);
          if (impact.speed > 7) {
            particles.burst(RUBBLE_BURST, b.position.x, b.position.y, 14);
            shake.shake({ intensity: Math.min(22, impact.speed * 1.4), duration: 0.35, decay: 'exponential' });
            flashAlpha = Math.max(flashAlpha, 0.22);
            hits += 1;
          }
        }
        shake.update(dt);
        particles.update(dt);

        // Frame the pivot's full swing and the tower, above a bottom band.
        const w = created.renderer.width / created.renderer.resolution;
        const h = created.renderer.height / created.renderer.resolution;
        const groundY = h * 0.8;
        const left = swingLeftPx(world) - 8;
        const right = 130;
        const top = world.pivot.y - 60;
        const scale = Math.min(1.6, (w - 24) / (right - left), (groundY - 90) / -top);
        scene.scale.set(scale);
        scene.x = w / 2 - ((left + right) / 2) * scale + shake.offset.x;
        scene.y = groundY + shake.offset.y;

        const halfW = w / scale;
        if (groundKey !== `${halfW}|${scale}`) {
          groundKey = `${halfW}|${scale}`;
          paintGround(ground, halfW * 2, scale);
        }

        world.ids.forEach((id, i) => {
          const body = world.tower.blocks.get(id);
          if (!body) return;
          let view = views.get(id);
          if (!view) {
            const bw = body.bounds.max.x - body.bounds.min.x;
            view = createBlockView(i, bw, body.bounds.max.y - body.bounds.min.y, propsRef.current.words[i] ?? '', scale);
            blocks.addChild(view.container);
            views.set(id, view);
          }
          paintBlock(view, scale);
          view.container.position.set(body.position.x, body.position.y);
          view.container.rotation = body.angle;
        });

        const ball = world.ball;
        paintWreckRig(
          rig,
          scale,
          world.pivot,
          ball ? { x: ball.position.x, y: ball.position.y, r: BALL_RADIUS_PX, angle: ball.angle } : null,
          !!world.chain,
        );

        // Truthful flight path while armed: the cut is a timing skill, not a guess.
        if (world.chain) paintThrowArc(aim, scale, ballPath(world, 14, 520));
        else aim.clear();

        // Ball cycle: spent -> let the rubble fall -> next ball or done.
        const now = performance.now();
        if (ball && !world.chain && !spentAt && (ballSpent(world) || now - cutAt > MAX_FLIGHT_MS)) spentAt = now;
        const wrecked = wreckedCount(world);
        const flattened = wrecked === world.ids.length;
        const settled = !!spentAt && now - spentAt > SETTLE_AFTER_SPENT_MS;
        if (settled && ballsLeft > 0 && !flattened) armNext();
        const done = settled && (ballsLeft === 0 || flattened);
        const update: WreckUpdate = { wrecked, total: world.ids.length, ballsLeft, armed: !!world.chain, done, hits };
        const key = JSON.stringify(update);
        if (key !== lastReport) {
          lastReport = key;
          propsRef.current.onUpdate(update);
        }

        flashAlpha = Math.max(0, flashAlpha - dt * 1.8);
        flash.clear();
        if (flashAlpha > 0) flash.rect(0, 0, w, h).fill({ color: 0xffffff, alpha: flashAlpha });
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      app?.destroy(true, { children: true });
    };
  }, []);

  return <div ref={hostRef} className={className} />;
}
