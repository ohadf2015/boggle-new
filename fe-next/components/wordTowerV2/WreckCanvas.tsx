'use client';

import { Application, Container, Graphics } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { ParticlePool } from '@/lib/gameEngine/ParticleSystem';
import { ScreenShake } from '@/lib/gameEngine/ScreenShake';
import { RUBBLE_BURST, TOWER_DUST } from '@/lib/gameEngine/presets/particles';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';
import {
  BALL_RADIUS_PX,
  type WreckWorld,
  ballPath,
  ballSpent,
  buildWreckWorldFromTower,
  cutBall,
  hangBall,
  pathHitsTower,
  stepWreck,
  swingLeftPx,
  wreckBounds,
  wreckedIds,
} from '@/lib/wordTowerV2/wreck';
import { type BlockView, createBlockView, paintBlock } from './apartmentArt';
import { paintGround, paintWreckRig } from './towerArt';
import { paintAimArc, paintAimTarget, paintBallTrail, paintCalledShot, paintDamage, paintImpact } from './rivals/wreckArt';
import { SkyLayer } from './skyArt';
import { createCity, paintCity, placeCity } from './skylineArt';
import { skyAt } from '@/lib/wordTowerV2/biomes';
import { buildSkyline } from '@/lib/wordTowerV2/scenery';
import { BLOCK_HEIGHT_PX } from '@/lib/wordTowerV2/scoring';

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
  /** Cutting RIGHT NOW would land on the building — the button says so. */
  onTarget: boolean;
  /**
   * The moment of contact, held for as long as the burst lives.
   *
   * Round 2's evidence pack had no frame of the ball touching the tower: the
   * swing shot was pre-impact and the next shot was already the result card.
   * So the hit now publishes itself — where on SCREEN it landed and how many
   * floors it took — and the parent stamps a damage number on that spot.
   *
   * `key` bumps once per hit; `x`/`y` are frozen at contact so this object is
   * stable between hits (it is change-detected by value, and a per-frame
   * position would re-render React every frame).
   */
  impact: { key: number; floors: number; x: number; y: number } | null;
}

interface Props {
  /** The floors to smash: a rival's stored tower, or a share link's words. */
  tower: TowerBlock[];
  balls: number;
  reducedMotion?: boolean;
  /**
   * The raid is over and the payout is on screen: the rig and the aim are gone
   * and the camera holds on the damaged building, which is what the result is
   * read off. Threaded through the props ref — putting it in the effect's deps
   * would tear down Pixi and destroy the very wreckage being shown.
   */
  aftermath?: boolean;
  /** Floor the player called on the reveal screen — marked all round. */
  targetIndex?: number | null;
  /** Their shield held: leave the building unmarked, as the payout says. */
  hideDamage?: boolean;
  /** Review hook (`?demo=1&autohit=1`): cut the instant the arc is on target. */
  autoHit?: boolean;
  registerCut: (cut: () => void) => void;
  onUpdate: (u: WreckUpdate) => void;
  className?: string;
}

/** A spent ball's tower keeps tumbling; give the rubble time before judging. */
const SETTLE_AFTER_SPENT_MS = 900;
/**
 * …and if it is STILL moving after that, keep waiting (to this cap).
 *
 * At a flat 900ms the round was scored while the building was mid-collapse:
 * the payout screen said "no floors down" over a tower that finished toppling
 * behind it a second later. The damage is counted once the rubble is at rest.
 */
const MAX_SETTLE_MS = 3200;
const AT_REST_SPEED = 0.35;
/** Cut balls that never stop (rolling off) are called spent after this. */
const MAX_FLIGHT_MS = 3200;
/**
 * Contact freezes time — a 16ms collision is unreadable, and at 130ms it was
 * also unphotographable: every capture of round 2 landed either side of it.
 */
const HIT_STOP_MS = 300;
const HIT_STOP_RATE = 0.14;
/** How long the starburst at the contact point lives, ms. */
const IMPACT_LIFE_MS = 950;
/** Camera ease toward its target frame, per second. */
const CAM_EASE = 3.2;

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

    const world: WreckWorld = buildWreckWorldFromTower(propsRef.current.tower);
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
      // Same v2 sky + city as the climb, pinned to a sunset: no DOM layers under Pixi.
      const sky = new SkyLayer([]);
      const city = createCity();
      created.stage.addChild(sky.container, city.container, scene, flash);
      const sunset = skyAt(4);
      // Frame the widest floor, whatever the words were (was a fixed 130px).
      const towerRight = Math.max(...world.ids.map((id) => world.tower.blocks.get(id)?.bounds.max.x ?? 0), 130) + 24;
      const ground = new Graphics();
      const blocks = new Container();
      const rig = new Graphics();
      const aim = new Graphics();
      const mark = new Graphics();
      const damage = new Graphics();
      const called = new Graphics();
      const boom = new Graphics();
      const trailG = new Graphics();
      scene.addChild(blocks, damage, called, aim, mark, trailG, boom, rig, ground);
      /** Newest-first positions of the free ball — painted as a comet tail. */
      const trail: Array<{ x: number; y: number }> = [];
      const views = new Map<string, BlockView>();
      const shake = new ScreenShake();
      const particles = new ParticlePool(scene);
      let flashAlpha = 0;
      let groundKey = '';
      let lastTs = performance.now();
      let stopMs = 0;
      let burst: { x: number; y: number; dirX: number; dirY: number; age: number; life: number } | null = null;
      /** Published contact: screen px frozen at the blow, floors resolved after. */
      let impact: WreckUpdate['impact'] = null;
      let impactPending: { x: number; y: number } | null = null;
      let wreckedAtHit = 0;
      /**
       * Floors that have come down, monotonically. `wreckedIds` re-reads the
       * bodies every frame and a slab that topples then settles back inside its
       * baseline drops out of the set again — which made the HUD count flicker,
       * and let a hit stamp "-1 floor" that the result screen then denied.
       */
      const downEver = new Set<string>();
      let camScale = 0;
      let camCx = 0;

      const tick = (ts: number) => {
        raf = requestAnimationFrame(tick);
        const frameMs = Math.min(ts - lastTs, 100);
        lastTs = ts;
        const dt = frameMs / 1000;
        // Hit-stop: the world crawls for a tenth of a second on contact so the
        // blow registers instead of flicking past in one frame.
        const slow = stopMs > 0 && !propsRef.current.reducedMotion ? HIT_STOP_RATE : 1;
        stopMs = Math.max(0, stopMs - frameMs);
        // The payout describes the wreck the round was SCORED on, so the rubble
        // stops moving the moment the verdict is out. Letting it keep toppling
        // behind the card is how "no floors down" ended up printed over a tower
        // that had visibly fallen over.
        if (!propsRef.current.aftermath) stepWreck(world, frameMs * slow);
        if (burst) {
          burst.age += frameMs;
          if (burst.age > burst.life) burst = null;
        }

        const ballBody = world.ball;
        for (const pi of world.tower.pendingImpacts) {
          if (pi.speed <= 3) continue;
          const b = world.tower.blocks.get(pi.id);
          if (!b) continue;
          particles.burst(TOWER_DUST, b.position.x, b.position.y, 6);
          if (pi.speed > 7) {
            particles.burst(RUBBLE_BURST, b.position.x, b.position.y, 14);
            shake.shake({ intensity: Math.min(26, pi.speed * 1.6), duration: 0.45, decay: 'exponential' });
            flashAlpha = Math.max(flashAlpha, 0.22);
            hits += 1;
            // Paint the blow where the ball actually met the slab, pointing the
            // way it was travelling, so a single still reads as contact.
            if (ballBody && !world.chain) {
              const cx = Math.max(b.bounds.min.x, Math.min(b.bounds.max.x, ballBody.position.x));
              const cy = Math.max(b.bounds.min.y, Math.min(b.bounds.max.y, ballBody.position.y));
              burst = {
                x: (cx + ballBody.position.x) / 2,
                y: (cy + ballBody.position.y) / 2,
                dirX: ballBody.velocity.x || 1,
                dirY: ballBody.velocity.y,
                age: 0,
                life: IMPACT_LIFE_MS,
              };
              particles.burst(RUBBLE_BURST, burst.x, burst.y, 18);
              wreckedAtHit = wreckedIds(world).size;
              impactPending = { x: burst.x, y: burst.y };
              if (!propsRef.current.reducedMotion) stopMs = HIT_STOP_MS;
            }
          }
        }
        shake.update(dt);
        particles.update(dt);

        const w = created.renderer.width / created.renderer.resolution;
        const h = created.renderer.height / created.renderer.resolution;
        // The street sits low: at 0.8 a phone gave up a fifth of the screen to
        // empty navy under the pavement while the tower was cropped at the top.
        const groundY = h * 0.88;
        const after = !!propsRef.current.aftermath;
        const box = wreckBounds(world);
        // Three framings, eased into each other. On the chain: the whole swing
        // and the tower. In flight: the ball AND the building only, so the
        // camera closes in and the hit lands big. Aftermath: the wreck alone —
        // the rig is a quarter-screen of empty sky and the payout is read off
        // the damaged building, not off the crane.
        let left: number;
        let right: number;
        let top: number;
        if (after || (!world.chain && !ballBody)) {
          // Clamped to a few building-widths: a flattened tower scatters rubble
          // across thousands of px, and framing all of it shrank the wreck to a
          // strip at the bottom of the screen — the damage has to be READ here.
          const span = Math.max(towerRight, 220) * 2.1;
          left = Math.max(box.left - 60, -span);
          right = Math.min(box.right + 60, span);
          top = Math.min(box.top - 70, -240);
        } else if (world.chain) {
          left = swingLeftPx(world) - 8;
          right = Math.max(towerRight, box.right + 24);
          // A real rival tower can stand taller than the swing rig: frame BOTH,
          // or an 11-floor building loses its top floors off the top edge.
          top = Math.min(world.pivot.y - 60, box.top - 40);
        } else {
          const bx = ballBody ? ballBody.position.x : box.left;
          const by = ballBody ? ballBody.position.y : box.top;
          left = Math.min(box.left, bx - BALL_RADIUS_PX) - 50;
          right = Math.max(box.right, bx + BALL_RADIUS_PX) + 50;
          top = Math.min(box.top, by - BALL_RADIUS_PX) - 50;
        }
        const fitW = (w - 24) / Math.max(120, right - left);
        const fitH = (groundY - 90) / Math.max(120, -top);
        // On the swing, everything has to be on screen. In the aftermath the
        // wreck has to be BIG: a flattened tower is a wide, shallow pile, and
        // fitting all of it renders the damage as a 40px strip on the street.
        // So fill the frame vertically and let the far rubble crop off the side.
        // The payoff shot: fit what is left of the building, but never zoom out
        // past half scale — a flattened tower scatters rubble across a thousand
        // px and framing every last slab rendered the damage as a strip on the
        // street. The floors are what has to be legible, not the spread.
        const afterGroundY = h * 0.74;
        const wantScale = after
          ? Math.min(1.15, Math.max(0.72, Math.min((w - 24) / Math.max(280, right - left), (afterGroundY - 40) / Math.max(200, -top))))
          : Math.min(1.6, fitW, fitH);
        // Aim the payoff shot at where the floors ended up, not at the middle of
        // how far the debris scattered.
        const wantCx = after ? box.cx : (left + right) / 2;
        if (!camScale) {
          camScale = wantScale;
          camCx = wantCx;
        } else {
          const k = Math.min(1, dt * CAM_EASE);
          camScale += (wantScale - camScale) * k;
          camCx += (wantCx - camCx) * k;
        }
        const scale = camScale;
        scene.scale.set(scale);
        scene.x = w / 2 - camCx * scale + shake.offset.x;
        // The swing keeps the street at a fixed line. The aftermath instead
        // centres what is left of the building, so the verdict stamped over it
        // lands ON the wreck rather than on sky above it.
        // The payoff shot keeps the street low and gives everything above it to
        // the wreck: anchoring nearer the middle left a third of a phone as
        // empty navy under the rubble.
        const sceneY = after ? afterGroundY : groundY;
        scene.y = sceneY + shake.offset.y;
        // Freeze the contact point in SCREEN space on the frame it happened:
        // the camera keeps easing afterwards, and a position that tracked it
        // would republish this object (and re-render React) every frame.
        if (impactPending) {
          impact = {
            key: hits,
            floors: 0,
            x: Math.round(impactPending.x * scale + scene.x),
            y: Math.round(impactPending.y * scale + scene.y),
          };
          impactPending = null;
        }
        sky.update({ w, h, ts, dt, sky: sunset, groundY: scene.y, scale, floorPx: BLOCK_HEIGHT_PX, reducedMotion: !!propsRef.current.reducedMotion });
        const cityW = Math.ceil(w) + 120;
        paintCity(city, `n${cityW}`, () => buildSkyline(7, cityW, 36, 100), { fill: 0x3b1f4f, edge: 0x0b0e1c, windowAlpha: 0.85 });
        placeCity(city, -60 + shake.offset.x, scene.y, h, ts);

        const halfW = w / scale;
        const gk = `${Math.round(halfW)}|${scale.toFixed(3)}`;
        if (groundKey !== gk) {
          groundKey = gk;
          paintGround(ground, halfW * 2, scale);
        }

        world.ids.forEach((id, i) => {
          const body = world.tower.blocks.get(id);
          if (!body) return;
          let view = views.get(id);
          if (!view) {
            const bw = body.bounds.max.x - body.bounds.min.x;
            view = createBlockView(i, bw, body.bounds.max.y - body.bounds.min.y, world.floors[i]?.word ?? '', scale);
            blocks.addChild(view.container);
            views.set(id, view);
          }
          paintBlock(view, scale);
          view.container.position.set(body.position.x, body.position.y);
          view.container.rotation = body.angle;
        });

        const ball = world.ball;
        // Comet tail on the free ball: every airborne frame reads as incoming.
        if (ball && !world.chain && !after) {
          trail.unshift({ x: ball.position.x, y: ball.position.y });
          if (trail.length > 14) trail.pop();
        } else if (after) trail.length = 0;
        paintBallTrail(trailG, scale, trail, BALL_RADIUS_PX);
        if (after) rig.clear();
        else
          paintWreckRig(
            rig,
            scale,
            world.pivot,
            ball ? { x: ball.position.x, y: ball.position.y, r: BALL_RADIUS_PX, angle: ball.angle } : null,
            !!world.chain,
          );

        // Review hook: land the swing deterministically so a capture pass can
        // photograph contact instead of gambling on a human tap.
        if (propsRef.current.autoHit && world.chain && pathHitsTower(world)) {
          cutBall(world);
          cutAt = performance.now();
        }

        // Truthful flight path while armed, and it says whether THIS cut lands:
        // the arc goes lime and a bracket sits on the floor about to be hit.
        let onTarget = false;
        if (world.chain && !after) {
          const hit = pathHitsTower(world);
          onTarget = !!hit;
          const span = hit ? Math.max(120, hit.tMs) : 620;
          paintAimArc(aim, scale, ballPath(world, hit ? 12 : 10, span), !!hit);
          paintAimTarget(mark, scale, hit, 0.5 + 0.5 * Math.sin(ts / 140));
        } else {
          aim.clear();
          mark.clear();
        }


        // The floors that came down stay marked: cracked, scorched, tagged out.
        for (const id of wreckedIds(world)) downEver.add(id);
        const down = downEver;
        paintDamage(
          damage,
          scale,
          propsRef.current.hideDamage ? [] : [...down].map((id) => {
            const b = world.tower.blocks.get(id)!;
            return {
              x: b.position.x,
              y: b.position.y,
              w: b.bounds.max.x - b.bounds.min.x,
              h: BLOCK_HEIGHT_PX,
              angle: b.angle,
              seed: world.ids.indexOf(id) + 1,
            };
          }),
        );
        // The called floor stays ringed until it comes down (or the round ends).
        const ti = propsRef.current.targetIndex;
        const calledId = ti != null && ti >= 0 && ti < world.ids.length ? world.ids[ti] : null;
        const calledBody = calledId && !down.has(calledId) ? world.tower.blocks.get(calledId) : null;
        paintCalledShot(
          called,
          scale,
          calledBody && !after
            ? {
                x: calledBody.position.x,
                y: calledBody.position.y,
                w: calledBody.bounds.max.x - calledBody.bounds.min.x,
                h: BLOCK_HEIGHT_PX,
              }
            : null,
          0.5 + 0.5 * Math.sin(ts / 220),
        );

        paintImpact(boom, scale, burst);

        // Ball cycle: spent -> let the rubble fall -> next ball or done.
        const now = performance.now();
        if (ball && !world.chain && !spentAt && (ballSpent(world) || now - cutAt > MAX_FLIGHT_MS)) spentAt = now;
        const wrecked = down.size;
        const flattened = wrecked === world.ids.length;
        let moving = false;
        for (const id of world.ids) {
          const b = world.tower.blocks.get(id);
          if (b && b.speed > AT_REST_SPEED) {
            moving = true;
            break;
          }
        }
        const sinceSpent = spentAt ? now - spentAt : 0;
        const settled = !!spentAt && sinceSpent > SETTLE_AFTER_SPENT_MS && (!moving || sinceSpent > MAX_SETTLE_MS);
        if (settled && ballsLeft > 0 && !flattened) armNext();
        const done = settled && (ballsLeft === 0 || flattened);
        // The blow's toll, resolved as the floors actually come down, then
        // cleared with the burst so the stamp does not outlive the beat.
        if (impact) {
          // The payout overlay owns the screen from here: a leftover "DIRECT
          // HIT!" stamped across the verdict is just two headlines at once.
          if (!burst || after) impact = null;
          else if (wrecked - wreckedAtHit !== impact.floors) impact = { ...impact, floors: Math.max(0, wrecked - wreckedAtHit) };
        }
        const update: WreckUpdate = { wrecked, total: world.ids.length, ballsLeft, armed: !!world.chain, done, hits, onTarget, impact };
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
