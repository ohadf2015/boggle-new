'use client';

import { Application, Container, Graphics, type Text } from 'pixi.js';
import { useEffect, useRef } from 'react';
import {
  PX_PER_M,
  type TowerWorld,
  snapshotWorld,
  stepWorld,
} from '@/lib/wordTowerV2/engine';
import { CRANE_ARM_PX } from '@/lib/wordTowerV2/crane';
import { HUD_TOP_PX, frameCamera } from '@/lib/wordTowerV2/camera';
import { ParticlePool } from '@/lib/gameEngine/ParticleSystem';
import { ScreenShake } from '@/lib/gameEngine/ScreenShake';
import { RUBBLE_BURST, COMBO_FLASH } from '@/lib/gameEngine/presets/particles';
import {
  BG,
  type BlockView,
  createBlockView,
  paintBlock,
  paintCrane,
  paintDots,
  paintGround,
  paintRuler,
} from './towerArt';

/**
 * Pixi renderer + the rAF loop that drives the fixed-timestep world.
 *
 * ponytail: no interpolation. Physics runs at 120Hz and displays run at 60-120Hz,
 * so there is always at least one fresh substep per frame; interpolating between
 * substeps would add a frame of latency to buy smoothness we already have.
 */

const DOT_SPACING = 22;

export interface FrameStats {
  /** 95th percentile frame time over the last sample window, ms. */
  p95Ms: number;
  fps: number;
  bodies: number;
}

interface Props {
  world: TowerWorld;
  /** block id -> the word that built it. */
  labels: Map<string, string>;
  /** Measured height of the DOM control dock over the canvas bottom. */
  getDockPx: () => number;
  /** Id of the block currently on the crane, if any. */
  getHangingId: () => string | null;
  onFrameStats?: (stats: FrameStats) => void;
  /** Runs before each physics step — used to drive the crane. */
  onBeforeStep?: (nowMs: number) => void;
  className?: string;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export default function TowerCanvas({
  world,
  labels,
  getDockPx,
  getHangingId,
  onFrameStats,
  onBeforeStep,
  className,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Props the rAF loop reads every frame. Kept in refs so the loop is created
  // once and never torn down by a re-render mid-run.
  const worldRef = useRef(world);
  const labelsRef = useRef(labels);
  const statsRef = useRef(onFrameStats);
  const beforeStepRef = useRef(onBeforeStep);
  const dockRef = useRef(getDockPx);
  const hangingRef = useRef(getHangingId);
  worldRef.current = world;
  labelsRef.current = labels;
  statsRef.current = onFrameStats;
  beforeStepRef.current = onBeforeStep;
  dockRef.current = getDockPx;
  hangingRef.current = getHangingId;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let app: Application | null = null;

    const views = new Map<string, BlockView>();
    const rulerLabels = new Map<number, Text>();
    const frameTimes: number[] = [];
    let lastStatsAt = 0;
    let cameraY = 0;
    let dotsSize = '';
    let groundKey = '';

    void (async () => {
      const created = new Application();
      await created.init({
        background: BG,
        antialias: true,
        resizeTo: host,
        // Capping DPR is the single biggest mobile win here: a 3x device would
        // otherwise shade 9x the pixels for no visible gain on 34px blocks.
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });

      if (disposed) {
        created.destroy(true);
        return;
      }

      app = created;
      host.appendChild(created.canvas);

      const dots = new Graphics();
      const scene = new Container();
      created.stage.addChild(dots, scene);

      const ruler = new Graphics();
      const ground = new Graphics();
      const crane = new Graphics();
      const blocks = new Container();
      scene.addChild(ruler, crane, blocks, ground);

      const shake = new ScreenShake();
      const particles = new ParticlePool(scene);

      let lastTs = performance.now();

      const tick = (ts: number) => {
        raf = requestAnimationFrame(tick);

        const frameMs = ts - lastTs;
        lastTs = ts;
        frameTimes.push(frameMs);

        beforeStepRef.current?.(ts);
        stepWorld(worldRef.current, Math.min(frameMs, 100));
        const snap = snapshotWorld(worldRef.current);

        for (const impact of worldRef.current.pendingImpacts) {
          // A heavy impact (speed > 4) triggers juice. Micro-vibrations (<4) are ignored.
          if (impact.speed <= 4.0) continue;
          shake.shake({ intensity: Math.min(12, impact.speed * 0.4), duration: 0.25, decay: 'exponential' });
          const block = snap.blocks.find((b) => b.id === impact.id);
          if (!block) continue;
          const impactY = block.y + block.heightPx / 2;
          particles.burst(COMBO_FLASH, block.x, impactY, 10);
          if (impact.speed > 10.0) particles.burst(RUBBLE_BURST, block.x, impactY, 8);
        }

        shake.update(frameMs / 1000);
        particles.update(frameMs / 1000);

        const w = created.renderer.width / created.renderer.resolution;
        const h = created.renderer.height / created.renderer.resolution;

        const frame = frameCamera({ viewportW: w, viewportH: h, dockPx: dockRef.current(), towerTopM: snap.towerHeightM });
        const { scale } = frame;
        cameraY += (frame.cameraY - cameraY) * 0.08;

        scene.scale.set(scale);
        scene.x = w / 2 + shake.offset.x;
        scene.y = frame.groundScreenY + cameraY + shake.offset.y;

        // Background dots scroll at a third of the camera speed — depth for free.
        if (dotsSize !== `${w}x${h}`) {
          dotsSize = `${w}x${h}`;
          paintDots(dots, w, h, DOT_SPACING);
        }
        dots.y = (cameraY * 0.3) % DOT_SPACING;

        const halfW = w / 2 / scale;
        if (groundKey !== `${halfW}|${scale}`) {
          groundKey = `${halfW}|${scale}`;
          paintGround(ground, halfW + 40, scale);
        }
        // Visible metre range: from the dock edge up to the top of the screen.
        const bottomM = (scene.y - h) / scale / PX_PER_M;
        const topVisibleM = scene.y / scale / PX_PER_M;
        paintRuler(ruler, rulerLabels, scene, {
          leftX: -halfW + 10 / scale,
          halfW,
          scale,
          pxPerM: PX_PER_M,
          fromM: Math.max(0, bottomM),
          toM: topVisibleM,
          topM: snap.towerHeightM,
        });

        // Ruler labels must not print through the HUD in the top-left corner.
        for (const t of rulerLabels.values()) {
          if (t.visible && scene.y + t.y * scale < HUD_TOP_PX) t.visible = false;
        }

        const hangingId = hangingRef.current();
        for (const block of snap.blocks) {
          let view = views.get(block.id);
          if (!view) {
            const word = labelsRef.current.get(block.id) ?? '';
            view = createBlockView(views.size, block.widthPx, block.heightPx, word, scale);
            blocks.addChild(view.container);
            views.set(block.id, view);
          }
          paintBlock(view, scale);
          view.container.x = block.x;
          view.container.y = block.y;
          view.container.rotation = block.angleRad;
        }

        const hanging = hangingId ? snap.blocks.find((b) => b.id === hangingId) : undefined;
        paintCrane(
          crane,
          scale,
          hanging ? { x: hanging.x, y: hanging.y, h: hanging.heightPx } : null,
          (hanging?.y ?? 0) - CRANE_ARM_PX,
          -snap.towerHeightM * PX_PER_M,
        );

        // Settled bodies far below the camera still cost a draw call — hide what
        // cannot be seen. Screen position, not scene-local, or the check is
        // wrong at any scale other than 1.
        for (const [id, view] of views) {
          const screenY = scene.y + view.container.y * scale;
          view.container.visible = screenY > -120 && screenY < h + 120;
          if (!snap.blocks.some((b) => b.id === id)) {
            view.container.destroy({ children: true });
            views.delete(id);
          }
        }

        if (ts - lastStatsAt > 500 && statsRef.current) {
          const sorted = [...frameTimes].sort((a, b) => a - b);
          statsRef.current({
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

  return <div ref={hostRef} className={className} />;
}
