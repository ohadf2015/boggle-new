'use client';

/**
 * The battle arena, rendered with Pixi 8: the hero on one side, the foe on the
 * other, a floor under both of them, and every blow played out between them —
 * idle bob, wind-up lean with a charging hand, lunge, recoil with hit-stop and
 * knockback, particle debris, and a death that leaves a corpse on the stage.
 *
 * React never re-renders this. Combat state arrives as an append-only command
 * queue the rAF loop drains (the `TowerFx` pattern from wordTowerV2), so a
 * 200ms combat tick can never tear down the scene.
 *
 * Pauses itself when the tab or the stage is hidden, and does nothing at all
 * under prefers-reduced-motion (the caller renders a static stage instead).
 */
import { Application, Assets, Container, Graphics, type Texture } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { ParticlePool } from '@/lib/gameEngine/ParticleSystem';
import { ScreenShake } from '@/lib/gameEngine/ScreenShake';
import { arenaLayout, type ArenaLayout } from './arenaLayout';
import { castImpactMs, hitStopMs, knockPx, missileFontSize } from './arenaBeats';
import type { ArenaCommand } from './arenaCommands';
import { CYAN, LIME, PINK, YELLOW, createFloat, createRig, createRing, createWordMissile, fitRig, paintFloor, stepFloat, stepMissile, stepRing, type Float, type Missile, type Rig, type Ring } from './arenaScene';
import { FOE_DEBRIS, HERO_SPARK, LETTER_SPARK, LOOT_POP } from './arenaParticles';

export interface ArenaSprites {
  hero: string;
  foeIdle: string;
  foeHurt: string;
}

export interface ArenaFacts {
  enraged: boolean;
  defeated: boolean;
  /** The wind-up in flight: ms left, or null. */
  windupLeftMs: number | null;
  windupColor: number;
  stunned: boolean;
}

interface Props {
  sprites: ArenaSprites;
  rtl: boolean;
  /** Drained by the loop; the caller only ever pushes. */
  queue: ArenaCommand[];
  getFacts: () => ArenaFacts;
  /** Translated "Blocked!" — the canvas never holds a string of its own. */
  blockLabel: string;
  onLayout?: (l: ArenaLayout) => void;
  /** Death: the corpse's viewport position, so the DOM can fly loot out of it. */
  onDeath?: (at: { x: number; y: number }) => void;
  className?: string;
}

/** ms from a lunge starting to the blow connecting on the hero. */
const LUNGE_CONNECT_MS = 190;
/** Commands already drained are dead weight; keep only a short tail. */
const QUEUE_MAX = 48;

export default function ArenaCanvas({ sprites, rtl, queue, getFacts, blockLabel, onLayout, onDeath, className }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({ sprites, rtl, queue, getFacts, blockLabel, onLayout, onDeath });
  propsRef.current = { sprites, rtl, queue, getFacts, blockLabel, onLayout, onDeath };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let app: Application | null = null;
    let visible = true;
    // Every delayed beat, so unmounting mid-fight can never fire into a dead scene.
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms);
      timers.add(id);
    };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 });
    io.observe(host);
    const onVis = () => { visible = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVis);

    void (async () => {
      const created = new Application();
      await created.init({
        backgroundAlpha: 0,
        antialias: true,
        // One loop: `tick` below renders, and only while the stage is on screen.
        // Pixi's own ticker drew 60fps on top of it, visible or not.
        autoStart: false,
        resizeTo: host,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (disposed) { created.destroy(true); return; }

      const { sprites: art } = propsRef.current;
      let heroTex: Texture;
      let foeIdleTex: Texture;
      let foeHurtTex: Texture;
      try {
        [heroTex, foeIdleTex, foeHurtTex] = await Promise.all([
          Assets.load<Texture>(art.hero),
          Assets.load<Texture>(art.foeIdle),
          Assets.load<Texture>(art.foeHurt),
        ]);
      } catch (err) {
        // Never silent: without this the arena would simply not exist and the
        // screen would look "fine but empty" (recurring-pitfalls class 4).
        console.warn('[arena] sprite load failed, falling back to the static stage', art, err);
        created.destroy(true);
        return;
      }
      if (disposed) { created.destroy(true); return; }
      app = created;
      host.appendChild(created.canvas);

      const scene = new Container();
      const floor = new Graphics();
      const bodies = new Container();
      const fxLayer = new Container();
      const orb = new Graphics();
      const vignette = new Graphics();
      created.stage.addChild(scene);
      scene.addChild(floor, bodies, orb, fxLayer, vignette);

      const hero = createRig(heroTex, rtl);
      const foe = createRig(foeIdleTex, !rtl);
      bodies.addChild(hero.root, foe.root);

      const particles = new ParticlePool(fxLayer);
      const shake = new ScreenShake();
      const floats: Float[] = [];
      const rings: Ring[] = [];
      const missiles: Missile[] = [];
      let layout = arenaLayout(1, 1, rtl);
      let layoutKey = '';
      let hitStopLeft = 0;
      let windupTotalMs = 1;
      let flashAlpha = 0;
      let flashColor = 0xffffff;
      // Start from the tail of the queue, not -1. The canvas is keyed on the foe
      // and remounts for a new fight, but `queueRef` lives in ArenaStage and does
      // not — so anything already queued belongs to the fight this canvas just
      // replaced. Replaying it would drop a boss dead before it was ever hit.
      const queued = propsRef.current.queue;
      let seen = queued.length ? queued[queued.length - 1].id : -1;
      let lastTs = performance.now();

      // v8: `screen` is CSS px. `renderer.width / resolution` shrank the scene to 1/dpr on phones.
      const view = () => ({
        w: created.renderer.screen.width,
        h: created.renderer.screen.height,
      });

      const toViewport = (x: number, y: number) => {
        const r = host.getBoundingClientRect();
        return { x: r.left + x, y: r.top + y };
      };

      const addFloat = (f: Float) => { floats.push(f); fxLayer.addChild(f.view); };
      const addRing = (r: Ring) => { rings.push(r); fxLayer.addChild(r.view); };
      const addMissile = (m: Missile) => { missiles.push(m); fxLayer.addChild(m.view); };

      /** The blow: hit-stop, knockback, white-out, debris, shake. */
      const land = (rig: Rig, power: number, color: number, away: 1 | -1) => {
        hitStopLeft = hitStopMs(power);
        rig.knockV = knockPx(power, layout.w) * away * 0.09;
        rig.flashAmt = 1;
        rig.pose = 'hurt';
        rig.poseLeftMs = 420;
        flashAlpha = Math.max(flashAlpha, 0.12 + power * 0.2);
        flashColor = color;
        shake.shake({ intensity: 5 + power * 16, duration: 0.3, decay: 'exponential' });
      };

      const drain = () => {
        const q = propsRef.current.queue;
        // Append-only from React's side; bounded here so a long fight can't grow it.
        if (q.length > QUEUE_MAX) q.splice(0, q.length - QUEUE_MAX);
        for (const cmd of q) {
          if (cmd.id <= seen) continue;
          seen = cmd.id;
          const hitPt = { x: foe.root.x, y: layout.foe.y + layout.foe.h * 0.45 };
          if (cmd.kind === 'cast') {
            // The DOM board throws the traced letters at `[data-adv-hit-target]`,
            // which sits on the foe's chest. We take the punch on the same frame
            // they arrive, so one word reads as exactly one hit.
            const flightMs = castImpactMs(cmd.word, false);
            if (foe.pose !== 'dead') {
              // …and the word itself crosses the stage to get there. The DOM's own
              // bolts are 90ms — five frames — so without this the letters only
              // ever glowed in place and the blow had no visible cause.
              const chars = Array.from(cmd.word);
              // Layout centres, NOT `rig.root.x`: the rigs are positioned later
              // in this same tick, so reading them here gives last frame's knock
              // offset — or, on the first frame of a fight, whatever `fitRig`
              // left behind. The word would launch out of thin air.
              const launch = {
                x: layout.hero.x + layout.hero.w * (0.5 + 0.34 * layout.facing),
                y: layout.hero.y + layout.hero.h * 0.3,
              };
              const target = { x: layout.foe.x + layout.foe.w * 0.5, y: layout.foe.y + layout.foe.h * 0.45 };
              addMissile(createWordMissile(
                cmd.word.toUpperCase(),
                missileFontSize(chars.length, layout.w, layout.h),
                launch, target,
                layout.h * (0.2 + cmd.power * 0.12),
                flightMs,
              ));
              particles.burst(LETTER_SPARK, launch.x, launch.y, 8);
            }
            later(() => {
              if (foe.pose === 'dead') return;
              const at = { x: foe.root.x, y: layout.foe.y + layout.foe.h * 0.45 };
              particles.burst(LETTER_SPARK, at.x, at.y, 12 + Math.round(cmd.power * 16));
              addRing(createRing(at.x, at.y, layout.h * 0.06, layout.h * (0.22 + cmd.power * 0.2), LIME));
              land(foe, cmd.power, LIME, layout.facing);
            }, flightMs);
          } else if (cmd.kind === 'windup') {
            foe.pose = 'windup';
            foe.poseLeftMs = cmd.ms;
            windupTotalMs = Math.max(1, cmd.ms);
          } else if (cmd.kind === 'strike') {
            foe.pose = 'lunge';
            foe.poseLeftMs = 380;
            // The inbound shot: it leaves the foe's hand and crosses the stage,
            // so the hit has a cause you can watch, not just a consequence.
            const shot = createRing(layout.foeHand.x, layout.foeHand.y, layout.h * 0.04, layout.h * 0.062, cmd.color, LUNGE_CONNECT_MS);
            addRing(shot);
            shot.travel = { x: hero.root.x, y: layout.hero.y + layout.hero.h * 0.4 };
            later(() => {
              const at = { x: hero.root.x, y: layout.hero.y + layout.hero.h * 0.4 };
              // NOT above the hero's head. `ArenaStage` parks an opaque DOM
              // intent panel over that corner of the canvas, so a callout drawn
              // there fires on every strike and is seen on none of them. The
              // layout publishes the band it must stay under, rise included.
              const callout = layout.heroCallout.y;
              if (cmd.blocked) {
                particles.burst(HERO_SPARK, at.x, at.y, 14);
                addFloat(createFloat(propsRef.current.blockLabel, layout.heroCallout.x, callout, Math.max(17, layout.h * 0.12), CYAN, 900, false, layout.calloutRise));
              } else {
                land(hero, 0.55, cmd.color, layout.facing === 1 ? -1 : 1);
                particles.burst(HERO_SPARK, at.x, at.y, 20);
                addRing(createRing(at.x, at.y, layout.h * 0.05, layout.h * 0.26, cmd.color));
                if (cmd.heartsLost > 0) {
                  addFloat(createFloat(`-${cmd.heartsLost}`, layout.heroCallout.x, callout, Math.max(22, layout.h * 0.17), PINK, 1100, true, layout.calloutRise));
                }
              }
            }, LUNGE_CONNECT_MS);
          } else if (cmd.kind === 'interrupt') {
            // The DOM stamps "Interrupted!" across the stage; here it is the foe
            // flinching and the charge in its hand blowing apart.
            foe.pose = 'hurt';
            foe.poseLeftMs = 380;
            foe.flashAmt = 1;
            particles.burst(LETTER_SPARK, layout.foeHand.x, layout.foeHand.y, 18);
            addRing(createRing(layout.foeHand.x, layout.foeHand.y, layout.h * 0.04, layout.h * 0.24, LIME));
          } else if (cmd.kind === 'phase') {
            flashAlpha = 0.45;
            flashColor = PINK;
            shake.shake({ intensity: 16, duration: 0.5, decay: 'exponential' });
            particles.burst(FOE_DEBRIS, hitPt.x, hitPt.y, 26);
          } else if (cmd.kind === 'heal') {
            particles.burst(LOOT_POP, hero.root.x, layout.hero.y + layout.hero.h * 0.4, 16);
          } else if (cmd.kind === 'death') {
            foe.pose = 'dead';
            foe.poseLeftMs = 1e9;
            particles.burst(FOE_DEBRIS, hitPt.x, hitPt.y, 34);
            particles.burst(LOOT_POP, hitPt.x, hitPt.y, 22);
            shake.shake({ intensity: 22, duration: 0.6, decay: 'exponential' });
            flashAlpha = 0.5;
            flashColor = YELLOW;
            propsRef.current.onDeath?.(toViewport(hitPt.x, hitPt.y));
          }
        }
      };

      const poseTransform = (rig: Rig, lean: number, dt: number) => {
        rig.t += dt;
        const bob = Math.sin(rig.t * 2.1) * (layout.h * 0.012);
        let y = bob;
        let rot = 0;
        let sx = 1;
        if (rig.pose === 'windup') {
          rot = -0.1 * lean;
          y = -layout.h * 0.02;
          sx = 1.05;
        } else if (rig.pose === 'lunge') {
          const p = 1 - Math.max(0, rig.poseLeftMs) / 380;
          const surge = Math.sin(Math.min(1, p * 1.6) * Math.PI);
          rig.knock = -surge * layout.w * 0.12 * lean;
          rot = surge * 0.22 * lean;
          y = -surge * layout.h * 0.06;
        } else if (rig.pose === 'hurt') {
          const p = 1 - Math.max(0, rig.poseLeftMs) / 420;
          rot = Math.sin(p * Math.PI * 3) * 0.16 * lean;
          sx = 1 - 0.07 * (1 - p);
        } else if (rig.pose === 'dead') {
          rot = 0.5 * lean;
          y = layout.h * 0.06;
          sx = 0.92;
        }
        for (const s of [rig.body, rig.drop, rig.flash]) {
          s.rotation = rot;
          s.y = (s === rig.drop ? rig.dropOff.y : 0) + y;
          s.x = s === rig.drop ? rig.dropOff.x : 0;
        }
        const base = Math.abs(rig.body.scale.x);
        for (const s of [rig.body, rig.drop, rig.flash]) {
          s.scale.set(s.scale.x < 0 ? -base : base, base * sx);
        }
        rig.flash.alpha = rig.flashAmt;
        rig.root.alpha = rig.pose === 'dead' ? 0.75 : 1;
      };

      const tick = (ts: number) => {
        raf = requestAnimationFrame(tick);
        const rawMs = Math.min(ts - lastTs, 90);
        lastTs = ts;

        const { w, h } = view();
        const key = `${Math.round(w)}x${Math.round(h)}|${rtl}`;
        if (key !== layoutKey) {
          layoutKey = key;
          layout = arenaLayout(Math.max(1, w), Math.max(1, h), rtl);
          paintFloor(floor, layout);
          fitRig(hero, layout.hero, layout.groundY);
          fitRig(foe, layout.foe, layout.groundY);
          vignette.clear();
          vignette.rect(0, 0, layout.w, layout.h).fill({ color: 0xffffff, alpha: 1 });
          vignette.alpha = 0;
          propsRef.current.onLayout?.(layout);
        }

        drain();

        // Hit-stop: the whole stage holds still for a beat on a heavy blow.
        let frameMs = rawMs;
        if (hitStopLeft > 0) {
          hitStopLeft -= rawMs;
          frameMs = 0;
        }
        const dt = frameMs / 1000;
        const facts = propsRef.current.getFacts();

        // Wind-up charge orb in the foe's hand.
        orb.clear();
        if (facts.windupLeftMs != null && foe.pose !== 'dead') {
          const p = Math.max(0, Math.min(1, 1 - facts.windupLeftMs / windupTotalMs));
          const r = layout.h * (0.045 + p * 0.075);
          orb.circle(layout.foeHand.x, layout.foeHand.y, r * 1.8).fill({ color: facts.windupColor, alpha: 0.22 });
          orb.circle(layout.foeHand.x, layout.foeHand.y, r).fill({ color: facts.windupColor, alpha: 0.95 }).stroke({ width: 3, color: 0x000000 });
          orb.circle(layout.foeHand.x - r * 0.25, layout.foeHand.y - r * 0.25, r * 0.4).fill({ color: 0xffffff, alpha: 0.9 });
          if (foe.pose === 'idle') { foe.pose = 'windup'; foe.poseLeftMs = 300; }
        }

        for (const rig of [hero, foe]) {
          if (rig.poseLeftMs > 0) {
            rig.poseLeftMs -= frameMs;
            if (rig.poseLeftMs <= 0 && rig.pose !== 'dead') { rig.pose = 'idle'; rig.knock = 0; }
          }
          rig.flashAmt = Math.max(0, rig.flashAmt - dt * 3.4);
          rig.knock += rig.knockV * frameMs;
          rig.knockV *= 0.86;
          if (rig.pose !== 'lunge') rig.knock *= 0.88;
        }
        foe.body.texture = foe.pose === 'hurt' || foe.pose === 'dead' ? foeHurtTex : foeIdleTex;
        foe.flash.texture = foe.body.texture;
        foe.drop.texture = foe.body.texture;
        foe.body.tint = facts.enraged && foe.pose !== 'dead' ? 0xffd9e3 : 0xffffff;

        poseTransform(hero, layout.facing, dt);
        poseTransform(foe, -layout.facing as 1 | -1, dt);
        hero.root.x = layout.hero.x + layout.hero.w / 2 + hero.knock;
        foe.root.x = layout.foe.x + layout.foe.w / 2 + foe.knock;
        hero.root.y = layout.groundY;
        foe.root.y = layout.groundY;

        // Shockwaves and travelling bolts. Driven by `rawMs`, not `frameMs`, so
        // an inbound shot keeps crossing while a hit-stop freezes the fighters.
        for (let i = rings.length - 1; i >= 0; i--) {
          if (!stepRing(rings[i], rawMs)) {
            rings[i].view.destroy();
            rings.splice(i, 1);
          }
        }

        // The word crossing the stage. `rawMs` again: a word thrown into the
        // tail of a hit-stop must keep flying, or it hangs in mid-air.
        for (let i = missiles.length - 1; i >= 0; i--) {
          const m = missiles[i];
          const alive = stepMissile(m, rawMs);
          if (alive) {
            if (Math.random() < 0.55) particles.burst(LETTER_SPARK, m.view.x, m.view.y, 1);
          } else {
            m.view.destroy({ children: true });
            missiles.splice(i, 1);
          }
        }

        for (let i = floats.length - 1; i >= 0; i--) {
          if (!stepFloat(floats[i], frameMs)) {
            floats[i].view.destroy();
            floats.splice(i, 1);
          }
        }

        shake.update(dt);
        particles.update(dt);
        scene.position.set(shake.offset.x, shake.offset.y);

        flashAlpha = Math.max(0, flashAlpha - dt * 2.6);
        vignette.alpha = flashAlpha;
        vignette.tint = flashColor;
        // The scene keeps stepping (cheap); only the GPU draw waits for the stage to be seen.
        if (visible) created.render();
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      for (const id of timers) clearTimeout(id);
      timers.clear();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      app?.destroy(true, { children: true });
    };
  }, [rtl]);

  return <div ref={hostRef} className={className} aria-hidden />;
}
