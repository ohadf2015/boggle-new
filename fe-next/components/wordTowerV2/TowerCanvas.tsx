'use client';

import { Application, Container, Graphics, type Text } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { PX_PER_M, type TowerWorld, snapshotWorld, stepWorld } from '@/lib/wordTowerV2/engine';
import { CRANE_ARM_PX, CRANE_CLEARANCE_PX, fallTimeMs, predictLandingX, throwArc } from '@/lib/wordTowerV2/crane';
import { type LandingQuality, PERFECT_RATIO } from '@/lib/wordTowerV2/landing';
import { rulerTicks } from '@/lib/wordTowerV2/scenery';
import { BLOCK_HEIGHT_PX } from '@/lib/wordTowerV2/scoring';
import { frameCamera } from '@/lib/wordTowerV2/camera';
import { ParticlePool } from '@/lib/gameEngine/ParticleSystem';
import { ScreenShake } from '@/lib/gameEngine/ScreenShake';
import { COMBO_FLASH, CONFETTI_BURST, GOLD_STARS, RUBBLE_BURST, TOWER_DUST } from '@/lib/gameEngine/presets/particles';
import {
  type BlockView,
  createBestLabel,
  createBlockView,
  createGhost,
  paintBestLine,
  paintBlock,
  paintCrane,
  paintGhost,
  paintGround,
  paintLandingMark,
  paintRuler,
  paintThrowArc,
  setBlockGold,
  tickBlock,
} from './towerArt';

/**
 * Pixi renderer + the rAF loop that drives the fixed-timestep world.
 *
 * The canvas is TRANSPARENT: v1's DOM sky (gradient, parallax, sightings) sits
 * behind it. Pixi owns only what physics owns — blocks, crane, ground, FX.
 *
 * ponytail: no interpolation. Physics runs at 120Hz and displays run at 60-120Hz,
 * so there is always at least one fresh substep per frame.
 */

export type TowerFx =
  | { kind: 'land'; id: string; quality: LandingQuality }
  | { kind: 'gold'; id: string }
  | { kind: 'collapse' };

export interface FrameStats {
  p95Ms: number;
  fps: number;
  bodies: number;
}

export interface GhostPreview {
  word: string;
  widthPx: number;
  valid: boolean;
}

interface Props {
  world: TowerWorld;
  labels: Map<string, string>;
  getDockPx: () => number;
  getHangingId: () => string | null;
  /** Sideways speed (px/ms) the hanging block would be released with now. */
  getHangVx: () => number;
  /** The slab being spelled (composing phase), or null. */
  getGhost: () => GhostPreview | null;
  /** Best height so far (metres) for the goal line, or null. */
  getBestM: () => number | null;
  /** Effects queued by game logic; the loop drains it every frame. */
  fxQueue: TowerFx[];
  bestLabel: string;
  /** Screen edge for the altitude ruler — the side the HUD is NOT on. */
  rulerSide: 'left' | 'right';
  onFrameStats?: (stats: FrameStats) => void;
  onBeforeStep?: (nowMs: number) => void;
  className?: string;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const FLASH_COLOUR: Partial<Record<LandingQuality, number>> = { perfect: 0xbfff00, miss: 0xff3366 };

export default function TowerCanvas(props: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Everything the rAF loop reads, in one ref, so the loop is created once and
  // never torn down by a re-render mid-run.
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let app: Application | null = null;

    const views = new Map<string, BlockView>();
    const frameTimes: number[] = [];
    let lastStatsAt = 0;
    let cameraY = 0;
    let groundKey = '';
    let flashAlpha = 0;
    let flashColour = 0xffffff;

    void (async () => {
      const created = new Application();
      await created.init({
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: host,
        // Capping DPR is the single biggest mobile win: a 3x device would shade
        // 9x the pixels for no visible gain on 34px blocks.
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

      const ruler = new Graphics();
      const rulerLayer = new Container();
      const rulerLabels = new Map<number, Text>();
      const bestLine = new Graphics();
      let bestText = propsRef.current.bestLabel;
      let bestLabel = createBestLabel(bestText);
      const guide = new Graphics();
      const landingMark = new Graphics();
      const crane = new Graphics();
      const blocks = new Container();
      const ghost = createGhost();
      const ground = new Graphics();
      scene.addChild(ruler, rulerLayer, bestLine, bestLabel, guide, crane, blocks, landingMark, ghost.container, ground);

      const shake = new ScreenShake();
      const particles = new ParticlePool(scene);

      let lastTs = performance.now();

      const tick = (ts: number) => {
        raf = requestAnimationFrame(tick);
        const p = propsRef.current;
        const world = p.world;

        const frameMs = ts - lastTs;
        lastTs = ts;
        const dt = frameMs / 1000;
        frameTimes.push(frameMs);

        p.onBeforeStep?.(ts);
        stepWorld(world, Math.min(frameMs, 100));
        const snap = snapshotWorld(world);
        const byId = new Map(snap.blocks.map((b) => [b.id, b]));

        for (const impact of world.pendingImpacts) {
          // Micro-vibrations (speed <= 4) are ignored; heavy impacts get juice.
          if (impact.speed <= 4) continue;
          shake.shake({ intensity: Math.min(12, impact.speed * 0.4), duration: 0.25, decay: 'exponential' });
          const block = byId.get(impact.id);
          if (!block) continue;
          const impactY = block.y + block.heightPx / 2;
          particles.burst(TOWER_DUST, block.x, impactY, 8);
          if (impact.speed > 10) particles.burst(RUBBLE_BURST, block.x, impactY, 8);
        }

        for (const fx of p.fxQueue.splice(0)) {
          if (fx.kind === 'collapse') {
            shake.shake({ intensity: 16, duration: 0.6, decay: 'exponential' });
            flashColour = 0xff3366;
            flashAlpha = 0.35;
            continue;
          }
          const block = byId.get(fx.id);
          const view = views.get(fx.id);
          if (!block) continue;
          if (fx.kind === 'gold') {
            if (view) setBlockGold(view);
            particles.burst(GOLD_STARS, block.x, block.y, 20);
            continue;
          }
          if (fx.quality === 'perfect') {
            if (view) view.flash = 1;
            particles.burst(COMBO_FLASH, block.x, block.y, 14);
            particles.burst(CONFETTI_BURST, block.x, block.y - block.heightPx, 18);
          }
          const colour = FLASH_COLOUR[fx.quality];
          if (colour !== undefined) {
            flashColour = colour;
            flashAlpha = fx.quality === 'perfect' ? 0.18 : 0.22;
          }
        }

        shake.update(dt);
        particles.update(dt);

        const w = created.renderer.width / created.renderer.resolution;
        const h = created.renderer.height / created.renderer.resolution;

        const frame = frameCamera({ viewportW: w, viewportH: h, dockPx: p.getDockPx(), towerTopM: snap.towerHeightM });
        const { scale } = frame;
        cameraY += (frame.cameraY - cameraY) * 0.08;

        scene.scale.set(scale);
        scene.x = w / 2 + shake.offset.x;
        scene.y = frame.groundScreenY + cameraY + shake.offset.y;

        const halfW = w / 2 / scale;
        if (groundKey !== `${halfW}|${scale}`) {
          groundKey = `${halfW}|${scale}`;
          paintGround(ground, halfW + 40, scale);
        }

        // Translations can land after init; rebuild the flag when its text changes.
        if (p.bestLabel !== bestText) {
          bestText = p.bestLabel;
          const next = createBestLabel(bestText);
          scene.addChildAt(next, scene.getChildIndex(bestLabel));
          bestLabel.destroy({ children: true });
          bestLabel = next;
        }
        // Visible metres, from the screen's bottom to top edge.
        const mAt = (screenY: number) => -((screenY - scene.y) / scale) / PX_PER_M;
        const edgeX = (p.rulerSide === 'left' ? -1 : 1) * (halfW - 10 / scale);
        paintRuler(ruler, rulerLabels, rulerLayer, scale, edgeX, p.rulerSide, rulerTicks(mAt(h), mAt(0)), PX_PER_M);

        const bestM = p.getBestM();
        paintBestLine(bestLine, bestLabel, halfW, scale, bestM && bestM > 0.5 ? -bestM * PX_PER_M : null);

        const hangingId = p.getHangingId();
        for (const block of snap.blocks) {
          let view = views.get(block.id);
          if (!view) {
            view = createBlockView(views.size, block.widthPx, block.heightPx, p.labels.get(block.id) ?? '', scale);
            blocks.addChild(view.container);
            views.set(block.id, view);
          }
          paintBlock(view, scale);
          tickBlock(view, dt);
          view.container.position.set(block.x, block.y);
          view.container.rotation = block.angleRad;
        }

        // Crane geometry: the block hangs CRANE_CLEARANCE_PX above the tower top,
        // the pivot a full arm above that.
        const hangY = -(snap.towerHeightM * PX_PER_M + CRANE_CLEARANCE_PX);
        const pivotY = hangY - CRANE_ARM_PX;
        const hanging = hangingId ? byId.get(hangingId) : undefined;
        const ghostPreview = hanging ? null : p.getGhost();

        ghost.container.visible = !!ghostPreview;
        if (ghostPreview) {
          paintGhost(ghost, scale, ghostPreview.word, ghostPreview.widthPx, BLOCK_HEIGHT_PX, ghostPreview.valid);
          // A gentle idle bob so the waiting slab reads as hanging, not pasted.
          ghost.container.position.set(0, hangY + Math.sin(ts / 420) * 2);
        }

        // Idle: an empty hook still hangs where the next slab will appear, so
        // the crane is always on screen and the player knows where words go.
        const idleY = hangY + Math.sin(ts / 420) * 2;
        const hookTarget = hanging ?? { x: 0, y: ghostPreview ? ghost.container.y : idleY, heightPx: BLOCK_HEIGHT_PX };
        paintCrane(crane, scale, halfW + 40, pivotY, { x: hookTarget.x, y: hookTarget.y - hookTarget.heightPx / 2 });
        if (hanging) {
          // The WHOLE arc, and where it touches down. Round 2 drew only the first
          // 40% so as not to "solve the landing" — but the block keeps drifting
          // for the entire fall, so every drop landed well past the guide's tip
          // and alignment felt impossible. A truthful guide is not an aim-bot:
          // the target still sweeps and the tap still has to be timed.
          const bottom = hanging.y + hanging.heightPx / 2;
          const towerTopY = -snap.towerHeightM * PX_PER_M;
          const dropPx = Math.max(1, towerTopY - bottom);
          const vx = p.getHangVx();
          const landX = predictLandingX(hanging.x, vx, dropPx);
          const gravity = world.engine.gravity.y * (world.engine.gravity.scale ?? 0.001);
          paintThrowArc(guide, scale, throwArc({ x: hanging.x, y: bottom + 10 / scale, vx, gravity, durationMs: fallTimeMs(dropPx) * 0.92, points: 12 }));
          const top = snap.blocks.reduce<(typeof snap.blocks)[number] | null>(
            (best, b) =>
              // Same rule as the judge (supportTop): only blocks that have landed.
              b.id === hanging.id || !world.landed.has(b.id) || (best && best.y - best.heightPx / 2 <= b.y - b.heightPx / 2) ? best : b,
            null,
          );
          const supportX = top?.x ?? 0;
          const supportHalfW = (top?.widthPx ?? 150) / 2;
          paintLandingMark(landingMark, scale, landX, towerTopY, hanging.widthPx, Math.abs(landX - supportX) < PERFECT_RATIO * supportHalfW);
          landingMark.visible = true;
        } else {
          guide.clear();
          landingMark.visible = false;
        }

        // Offscreen settled blocks still cost a draw call — hide them.
        for (const [id, view] of views) {
          const screenY = scene.y + view.container.y * scale;
          view.container.visible = screenY > -120 && screenY < h + 120;
          if (!byId.has(id)) {
            view.container.destroy({ children: true });
            views.delete(id);
          }
        }

        flashAlpha = Math.max(0, flashAlpha - dt * 1.6);
        flash.clear();
        if (flashAlpha > 0) flash.rect(0, 0, w, h).fill({ color: flashColour, alpha: flashAlpha });

        if (ts - lastStatsAt > 500 && p.onFrameStats) {
          const sorted = [...frameTimes].sort((a, b) => a - b);
          p.onFrameStats({
            p95Ms: Number(percentile(sorted, 95).toFixed(2)),
            fps: Math.round(1000 / (sorted.reduce((s, v) => s + v, 0) / sorted.length || 16.7)),
            bodies: snap.blocks.length,
          });
          frameTimes.length = 0;
          lastStatsAt = ts;
        }
      };

      raf = requestAnimationFrame(tick);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      app?.destroy(true, { children: true });
    };
  }, []);

  return <div ref={hostRef} className={props.className} />;
}
