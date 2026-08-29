'use client';

import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { useEffect, useRef } from 'react';
import {
  PX_PER_M,
  type TowerWorld,
  snapshotWorld,
  stepWorld,
} from '@/lib/wordTowerV2/engine';

/**
 * Pixi renderer + the rAF loop that drives the fixed-timestep world.
 *
 * ponytail: no interpolation. Physics runs at 120Hz and displays run at 60-120Hz,
 * so there is always at least one fresh substep per frame; interpolating between
 * substeps would add a frame of latency to buy smoothness we already have.
 */

const COLOURS = [0xc4f000, 0xff4d9d, 0x37e0ff, 0xb06cff, 0xffc93c];
const NAVY = 0x12162b;
const SHADOW = 0x000000;

/**
 * Physics pixels are not screen pixels. A 34px-tall block drawn 1:1 on a 1280px
 * viewport reads as a pebble — the tower occupied a fifth of the screen and the
 * rest was empty. Scale to the viewport so the tower is the subject.
 */
function worldScale(viewportWidth: number): number {
  return Math.max(0.75, Math.min(2, viewportWidth / 620));
}

/**
 * Height reserved at the bottom for the letter wheel and drop button. Without
 * it the controls render on top of the tower they are controlling.
 */
function dockHeight(viewportHeight: number): number {
  return Math.min(210, viewportHeight * 0.3);
}

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
  onFrameStats?: (stats: FrameStats) => void;
  /** Runs before each physics step — used to drive the crane. */
  onBeforeStep?: (nowMs: number) => void;
  className?: string;
}

interface BlockView {
  container: Container;
  body: Graphics;
  label: Text;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export default function TowerCanvas({
  world,
  labels,
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
  worldRef.current = world;
  labelsRef.current = labels;
  statsRef.current = onFrameStats;
  beforeStepRef.current = onBeforeStep;

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

    const labelStyle = new TextStyle({
      fontFamily: 'Fredoka, system-ui, sans-serif',
      fontSize: 18,
      fontWeight: '700',
      fill: NAVY,
    });

    void (async () => {
      const created = new Application();
      await created.init({
        background: NAVY,
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

      const scene = new Container();
      created.stage.addChild(scene);

      const ground = new Graphics();
      scene.addChild(ground);

      let lastTs = performance.now();

      const tick = (ts: number) => {
        raf = requestAnimationFrame(tick);

        const frameMs = ts - lastTs;
        lastTs = ts;
        frameTimes.push(frameMs);

        beforeStepRef.current?.(ts);
        stepWorld(worldRef.current, Math.min(frameMs, 100));
        const snap = snapshotWorld(worldRef.current);

        const w = created.renderer.width / created.renderer.resolution;
        const h = created.renderer.height / created.renderer.resolution;

        const scale = worldScale(w);
        const dock = dockHeight(h);
        // The ground line sits just above the control dock, so the play area is
        // everything from the top of the screen down to the wheel.
        const groundLineY = h - dock;
        const playHeight = groundLineY;

        // Hold the top of the tower around 45% down the play area: enough
        // headroom to see the swinging block, enough tower to feel the height.
        const towerTopPx = snap.towerHeightM * PX_PER_M * scale;
        const targetCameraY = Math.max(0, towerTopPx - playHeight * 0.55);
        cameraY += (targetCameraY - cameraY) * 0.08;

        scene.scale.set(scale);
        scene.x = w / 2;
        scene.y = groundLineY + cameraY;

        ground.clear();
        const groundW = (w * 2) / scale;
        ground.rect(-groundW / 2, 0, groundW, 240 / scale).fill(0x0a0d1c);
        ground.rect(-groundW / 2, 0, groundW, 6 / scale).fill(0x2a3050);

        for (const block of snap.blocks) {
          let view = views.get(block.id);

          if (!view) {
            const container = new Container();
            const body = new Graphics();
            const colour = COLOURS[views.size % COLOURS.length];

            // Neo-brutalist: hard offset shadow, solid fill, thick dark border.
            body
              .rect(-block.widthPx / 2 + 5, -block.heightPx / 2 + 5, block.widthPx, block.heightPx)
              .fill(SHADOW)
              .rect(-block.widthPx / 2, -block.heightPx / 2, block.widthPx, block.heightPx)
              .fill(colour)
              .stroke({ width: 3, color: NAVY, alignment: 1 });

            const label = new Text({
              text: (labelsRef.current.get(block.id) ?? '').toUpperCase(),
              style: labelStyle,
            });
            label.anchor.set(0.5);

            container.addChild(body, label);
            scene.addChild(container);
            view = { container, body, label };
            views.set(block.id, view);
          }

          view.container.x = block.x;
          view.container.y = block.y;
          view.container.rotation = block.angleRad;
        }

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
