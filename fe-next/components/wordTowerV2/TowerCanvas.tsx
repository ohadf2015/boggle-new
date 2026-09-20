'use client';

import { Application, Container, Graphics, type Text } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { PX_PER_M, type TowerWorld, snapshotWorld, stepWorld } from '@/lib/wordTowerV2/engine';
import { CRANE_ARM_PX, CRANE_CLEARANCE_PX, fallTimeMs, predictLandingX, throwArc } from '@/lib/wordTowerV2/crane';
import { type LandingQuality, PERFECT_RATIO } from '@/lib/wordTowerV2/landing';
import { buildSkyline, rulerTicks, skyProps } from '@/lib/wordTowerV2/scenery';
import { BLOCK_HEIGHT_PX } from '@/lib/wordTowerV2/scoring';
import { frameCamera, screenSize, towerSkirts, type DockSide } from '@/lib/wordTowerV2/camera';
import { publishHeightM } from '@/lib/wordTowerV2/altitude';
import { floorsAt, skyAt } from '@/lib/wordTowerV2/biomes';
import { ParticlePool } from '@/lib/gameEngine/ParticleSystem';
import { ScreenShake } from '@/lib/gameEngine/ScreenShake';
import { COMBO_FLASH, CONFETTI_BURST, GOLD_STARS, RUBBLE_BURST, TOWER_DUST } from '@/lib/gameEngine/presets/particles';
import { createBestLabel, paintBestLine, paintGround, paintLandingMark, paintRuler, paintThrowArc, paintTowerShaft } from './towerArt';
import { type BlockView, addTenant, createBlockView, createGhost, paintBlock, paintGhost, setBlockGold, setBlockRebar, tickBlock } from './apartmentArt';
import { createCity, paintCity, placeCity } from './skylineArt';
import { paintCraneFrame, paintCraneHook } from './craneArt';
import { SkyLayer } from './skyArt';
import { TenantCrowd } from './tenantArt';

/**
 * Pixi renderer + the rAF loop that drives the fixed-timestep world.
 *
 * Pixi owns the WHOLE picture — sky, city, street, crane, floors, FX — on one
 * camera. The sky used to be a DOM stack behind a transparent canvas; it
 * re-rendered on every height publish and flickered at each biome change.
 *
 * ponytail: no interpolation. Physics runs at 120Hz and displays run at 60-120Hz,
 * so there is always at least one fresh substep per frame.
 */

export type TowerFx =
  | { kind: 'land'; id: string; quality: LandingQuality }
  | { kind: 'gold'; id: string }
  | { kind: 'tenants'; id: string; count: number }
  /** Rebar crate: these floors were welded in place. */
  | { kind: 'rebar'; ids: string[] }
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
  /**
   * Where the controls are. On desktop/TV the wheel is a side panel and THIS
   * canvas is the play column, so the camera can spend the height on floors.
   */
  dockSide?: DockSide;
  onFrameStats?: (stats: FrameStats) => void;
  onBeforeStep?: (nowMs: number) => void;
  /** First contact of a falling block (Matter speed), for the landing thunk. */
  onImpact?: (speed: number) => void;
  /** One tenant just popped into a floor (fires once per tenant). */
  onTenantArrive?: () => void;
  /**
   * Where a floor just landed, in canvas-local CSS px — the DOM reward layer
   * draws the payout on that exact pixel. Read from LAST frame's camera (this
   * runs before the camera is re-solved); one frame of drift is invisible.
   */
  onLandPoint?: (p: { x: number; y: number; quality: LandingQuality }) => void;
  /** Settled height, quantized (m) — the far city sinks away with it. */
  getSceneM?: () => number;
  reducedMotion?: boolean;
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
    let resizeObserver: ResizeObserver | null = null;

    const views = new Map<string, BlockView>();
    const frameTimes: number[] = [];
    let lastStatsAt = 0;
    let cameraY = 0;
    // The camera frames a FILTERED height: settled Matter stacks jitter in the
    // 3rd decimal forever, so the raw value kept the ease from ever landing and
    // the whole scene (and the sky) micro-drifted.
    let camTopM = 0;
    let groundKey = '';
    let rulerKey = '';
    let craneKey = '';
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
      // `resizeTo` only listens to window resize. In the Android WebView the host
      // can settle AFTER init with no window event, leaving a canvas stuck at
      // ~60% width — the tower then played in the left half of the screen.
      resizeObserver = new ResizeObserver(() => created.resize());
      resizeObserver.observe(host);

      const scene = new Container();
      const flash = new Graphics();
      const sky = new SkyLayer(skyProps(11));
      const farCity = createCity();
      const nearCity = createCity();
      created.stage.addChild(sky.container, farCity.container, nearCity.container, scene, flash);

      const ruler = new Graphics();
      const rulerLayer = new Container();
      const rulerLabels = new Map<number, Text>();
      const bestLine = new Graphics();
      let bestText = propsRef.current.bestLabel;
      let bestLabel = createBestLabel(bestText);
      const guide = new Graphics();
      const landingMark = new Graphics();
      const crane = new Graphics();
      const hook = new Graphics();
      const shaft = new Graphics();
      const blocks = new Container();
      const ghost = createGhost();
      const ground = new Graphics();
      const crowd = new TenantCrowd();
      scene.addChild(ruler, rulerLayer, bestLine, bestLabel, crane, guide, hook, shaft, blocks, crowd.layer, landingMark, ghost.container, ground);

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

        let hardest = 0;
        for (const impact of world.pendingImpacts) {
          // Micro-vibrations (speed <= 4) are ignored; heavy impacts get juice.
          if (impact.speed <= 4) continue;
          hardest = Math.max(hardest, impact.speed);
          const hit = views.get(impact.id);
          if (hit) hit.squash = Math.min(1, impact.speed / 12);
          shake.shake({ intensity: Math.min(12, impact.speed * 0.4), duration: 0.25, decay: 'exponential' });
          const block = byId.get(impact.id);
          if (!block) continue;
          const impactY = block.y + block.heightPx / 2;
          particles.burst(TOWER_DUST, block.x, impactY, 8);
          if (impact.speed > 10) particles.burst(RUBBLE_BURST, block.x, impactY, 8);
        }

        if (hardest > 0) p.onImpact?.(hardest);

        for (const fx of p.fxQueue.splice(0)) {
          if (fx.kind === 'rebar') {
            for (const id of fx.ids) {
              const v = views.get(id);
              if (v) setBlockRebar(v);
              const b = byId.get(id);
              if (b) particles.burst(TOWER_DUST, b.x, b.y, 6);
            }
            flashColour = 0x37e0ff;
            flashAlpha = 0.2;
            continue;
          }
          if (fx.kind === 'collapse') {
            shake.shake({ intensity: 16, duration: 0.6, decay: 'exponential' });
            flashColour = 0xff3366;
            flashAlpha = 0.35;
            continue;
          }
          const block = byId.get(fx.id);
          const view = views.get(fx.id);
          if (fx.kind === 'tenants') {
            // Half the screen in world units, from last frame's zoom (it barely moves).
            const halfScreen = screenSize(created.renderer).w / 2 / scene.scale.x;
            crowd.moveIn(fx.id, fx.count, block?.x ?? 0, halfScreen);
            continue;
          }
          if (!block) continue;
          if (fx.kind === 'gold') {
            if (view) setBlockGold(view);
            particles.burst(GOLD_STARS, block.x, block.y, 20);
            continue;
          }
          p.onLandPoint?.({
            x: scene.x + block.x * scene.scale.x,
            y: scene.y + (block.y - block.heightPx / 2) * scene.scale.x,
            quality: fx.quality,
          });
          if (fx.quality === 'perfect') {
            if (view) view.flash = 1;
            particles.burst(COMBO_FLASH, block.x, block.y, 14);
            particles.burst(CONFETTI_BURST, block.x, block.y - block.heightPx, 18);
            // Camera kick + a dust ring along the seam: a perfect floor should
            // LAND, not merely appear. Tower Bloxx sells the snap this way.
            shake.shake({ intensity: 9, duration: 0.22, decay: 'exponential' });
            particles.burst(TOWER_DUST, block.x - block.widthPx / 2, block.y + block.heightPx / 2, 6);
            particles.burst(TOWER_DUST, block.x + block.widthPx / 2, block.y + block.heightPx / 2, 6);
          }
          // Below the collapse kick (16) on purpose: a miss is a stumble, not the end.
          if (fx.quality === 'miss') shake.shake({ intensity: 10, duration: 0.35, decay: 'exponential' });
          const colour = FLASH_COLOUR[fx.quality];
          if (colour !== undefined) {
            flashColour = colour;
            flashAlpha = fx.quality === 'perfect' ? 0.18 : 0.22;
          }
        }

        shake.update(dt);
        particles.update(dt);
        crowd.update(
          frameMs,
          scene.scale.x,
          (id) => {
            const b = byId.get(id);
            return b ? { x: b.x, y: b.y, halfW: b.widthPx / 2 } : null;
          },
          (id) => {
            const v = views.get(id);
            if (v) addTenant(v);
            p.onTenantArrive?.();
          },
        );

        const { w, h } = screenSize(created.renderer);

        camTopM = publishHeightM(camTopM, snap.towerHeightM);
        const frame = frameCamera({ viewportW: w, viewportH: h, dockPx: p.getDockPx(), towerTopM: camTopM, dockSide: p.dockSide });
        const { scale } = frame;
        // Frame-rate independent ease (a fixed 0.08/frame ran 2x faster at 120Hz).
        cameraY += (frame.cameraY - cameraY) * (1 - Math.exp(-dt * 5));

        scene.scale.set(scale);
        scene.x = w / 2 + shake.offset.x;
        scene.y = frame.groundScreenY + cameraY + shake.offset.y;

        const halfW = w / 2 / scale;

        // The near city stands exactly on the ground line; the far one trails
        // at half speed, so climbing reads as depth, not as the city sliding.
        // Visible metres, from the screen's bottom to top edge.
        const mAt = (screenY: number) => -((screenY - scene.y) / scale) / PX_PER_M;
        // The sky follows what is ON SCREEN (the eased camera), so a biome change
        // is a continuous blend as the view climbs — never a snap.
        // Quantized to 1/20 floor: a blend then repaints the 14 bands ~40 times, not every frame.
        const skyNow = skyAt(Math.round(floorsAt(mAt(h * 0.5)) * 20) / 20);
        sky.update({
          w,
          h,
          ts,
          dt,
          sky: skyNow,
          groundY: scene.y,
          scale,
          floorPx: BLOCK_HEIGHT_PX,
          reducedMotion: !!p.reducedMotion,
        });

        const cityW = Math.ceil(w) + 120;
        paintCity(farCity, `f${cityW}`, () => buildSkyline(41, cityW, 70, 160), { fill: 0x2a2f5a, edge: 0x2a2f5a, windowAlpha: 0.22 });
        paintCity(nearCity, `n${cityW}`, () => buildSkyline(7, cityW, 36, 100), { fill: 0x141830, edge: 0x0b0e1c, windowAlpha: 0.85 });
        // Beyond parallax the far city sinks as you climb, so by ~8m the skies
        // own the screen instead of a skyline hanging in space.
        const sink = Math.min(p.getSceneM?.() ?? 0, 8) * 22;
        placeCity(farCity, -60, frame.groundScreenY + cameraY * 0.55 + sink + shake.offset.y * 0.5, h, ts);
        placeCity(nearCity, -60 + shake.offset.x, scene.y, h, ts);
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
        // Floor ruler: a tick per storey, a number every 5. Repainted only when
        // the visible floor range, zoom or side changes.
        const edgeX = (p.rulerSide === 'left' ? -1 : 1) * (halfW - 10 / scale);
        const fromFloor = Math.floor(floorsAt(mAt(h)));
        const toFloor = Math.ceil(floorsAt(mAt(0)));
        const nextRulerKey = `${fromFloor}|${toFloor}|${scale.toFixed(3)}|${edgeX.toFixed(1)}`;
        if (nextRulerKey !== rulerKey) {
          rulerKey = nextRulerKey;
          paintRuler(ruler, rulerLabels, rulerLayer, scale, edgeX, p.rulerSide, rulerTicks(fromFloor, toFloor), BLOCK_HEIGHT_PX);
        }

        const bestM = p.getBestM();
        paintBestLine(bestLine, bestLabel, halfW, scale, bestM && bestM > 0.5 ? -bestM * PX_PER_M : null);

        const hangingId = p.getHangingId();
        // Under every floor: fills the wedge of sky an overhang leaves, and
        // runs the lowest floors past the bottom edge so a panned camera never
        // shows the tower ending in mid-air above the dock.
        paintTowerShaft(
          shaft,
          towerSkirts(
            // Only what is on screen (plus a floor of margin): a 40-floor run
            // would otherwise redraw 40 shafts a frame for floors nobody sees.
            snap.blocks.filter(
              (b) =>
                b.id !== hangingId &&
                world.landed.has(b.id) &&
                scene.y + (b.y - b.heightPx) * scale < h + 240 &&
                scene.y + (b.y + b.heightPx) * scale > -120,
            ),
            (h - scene.y) / scale,
          ),
          scale,
        );
        for (const block of snap.blocks) {
          let view = views.get(block.id);
          if (!view) {
            // Floor number from the id (`r0-b7` -> 7): colour cycle + lobby on floor 0.
            const floorNo = Number(/(\d+)$/.exec(block.id)?.[1] ?? views.size);
            view = createBlockView(floorNo, block.widthPx, block.heightPx, p.labels.get(block.id) ?? '', scale);
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
        const craneFrame = {
          scale,
          halfW,
          topY: -scene.y / scale,
          bottomY: (h - scene.y) / scale,
          // Mast on the HUD's side: the ruler owns the other edge.
          side: (p.rulerSide === 'left' ? 'right' : 'left') as 'left' | 'right',
          pivot: { x: 0, y: pivotY },
          hook: { x: hookTarget.x, y: hookTarget.y - hookTarget.heightPx / 2 },
        };
        craneKey = paintCraneFrame(crane, craneFrame, craneKey);
        paintCraneHook(hook, craneFrame);
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
          const supportHalfW = (top?.widthPx ?? 200) / 2;
          paintLandingMark(landingMark, scale, landX, towerTopY, hanging.widthPx, Math.abs(landX - supportX) < PERFECT_RATIO * supportHalfW, {
            x: supportX,
            halfW: PERFECT_RATIO * supportHalfW,
            pulse: 0.5 + 0.5 * Math.sin(ts / 160),
          });
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
      resizeObserver?.disconnect();
      app?.destroy(true, { children: true });
    };
  }, []);

  return <div ref={hostRef} className={props.className} />;
}
