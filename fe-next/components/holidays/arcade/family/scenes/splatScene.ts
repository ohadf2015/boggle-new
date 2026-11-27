import type { Container, Graphics, Sprite } from 'pixi.js';
import { classifyGesture, type PointerSample } from '@/lib/holidays/arcade/kit/gesture';
import { ballAt, HOLES, newSplatGame, popHeight, stepSplat, THROW_FROM, throwBall, type Pop, type PopKind } from '@/lib/holidays/arcade/splat';
import type { KitCtx, Scene } from '../../kit/types';
import { neoColor } from '../../kit/neoColor';
import { ambience, backdrop, burstPreset, fadeAway, popIn, reporter, sprite, type TurnOpts } from './common';

const MASCOT = '/holidays/m-christmas.webp';
export const SPLAT_ART = ['bg-snowball', 'spr-popup-elf', 'spr-popup-snowman', 'spr-popup-gremlin', 'spr-snowball', 'spr-splat', 'spr-spark-impact', MASCOT];

const ART: Record<PopKind, string> = { elf: 'spr-popup-elf', snowman: 'spr-popup-snowman', gremlin: 'spr-popup-gremlin', mascot: MASCOT };
const POP_H = 230;
const DROP = 250;
const AIM_S = 0.32;

interface HoleView {
  root: Container;
  slot: Container;
  pop: Sprite | null;
  popId: number;
  bank: Graphics;
}

export function createSplatScene(ctx: KitCtx, opts: TurnOpts): Scene {
  const { pixi } = ctx;
  const g = newSplatGame(opts.seed, opts.seconds);
  const report = reporter(opts);
  backdrop(ctx, 'bg-snowball');
  const snow = ambience(ctx, 'snow', 45);
  const snowColor = neoColor('neo-holiday-snow');
  const shade = neoColor('neo-holiday-blue');
  const puff = burstPreset(['neo-holiday-snow', 'neo-cream', 'neo-cyan'], { particlesPerWave: 22, gravity: { x: 0, y: 700 } });
  const stars = burstPreset(['neo-holiday-gold', 'neo-cream'], { shape: 'star', particlesPerWave: 14, gravity: { x: 0, y: 200 } });
  const holes: HoleView[] = HOLES.map((h) => {
    const root = new pixi.Container();
    root.position.set(h.x, h.y);
    root.scale.set(h.scale);
    root.zIndex = h.y;
    const slot = new pixi.Container();
    const mask = new pixi.Graphics().rect(-200, -420, 400, 430).fill({ color: snowColor });
    slot.mask = mask;
    const bank = new pixi.Graphics().ellipse(0, 4, 110, 18).fill({ color: shade, alpha: 0.22 });
    root.addChild(bank, mask, slot);
    ctx.world.addChild(root);
    return { root, slot, pop: null, popId: 0, bank };
  });
  const reticle = new pixi.Graphics();
  reticle.zIndex = 1800;
  ctx.world.addChild(reticle);
  const balls = new Map<number, Sprite>();
  let press: PointerSample | null = null;
  let aimAt: { x: number; y: number } | null = null;

  const syncPop = (hv: HoleView, p: Pop | undefined) => {
    if (!p) {
      if (hv.pop) {
        hv.pop.destroy();
        hv.pop = null;
      }
      return;
    }
    if (hv.popId !== p.id) {
      hv.pop?.destroy();
      hv.pop = sprite(ctx, ART[p.kind], 0, 0, POP_H, hv.slot);
      hv.pop.anchor.set(0.5, 1);
      hv.popId = p.id;
      if (p.kind === 'gremlin') ctx.sfx.play('giggle');
      else ctx.sfx.play('pop');
    }
    const s = hv.pop!;
    s.y = (1 - popHeight(p)) * DROP;
    if (p.phase === 'hit' && !ctx.reduced) {
      s.rotation = Math.sin(p.t * 40) * 0.25 * (1 - p.t / 0.6);
      s.y += p.t * 220;
    } else s.rotation = p.kind === 'gremlin' && !ctx.reduced ? Math.sin(g.time * 12) * 0.08 : 0;
  };

  const handle = () => {
    for (const e of g.events) {
      if (e.type === 'throw') ctx.sfx.play('throw');
      else if (e.type === 'hit' || e.type === 'oops') {
        ctx.sfx.play('splat');
        ctx.burst(puff, e.x, e.y);
        ctx.shake(e.type === 'oops' ? 10 : 6, 0.2);
        ctx.hitStop(55);
        const splat = sprite(ctx, 'spr-splat', e.x, e.y, 150);
        splat.zIndex = 1600;
        popIn(ctx, splat, splat.scale.x, 140);
        fadeAway(ctx, splat, 650, -20);
        if (e.type === 'hit') {
          ctx.burst(stars, e.x, e.y - 40);
          ctx.float(e.x, e.y - 90, `+${e.points}`, 'gold');
          if (e.kind === 'gremlin') ctx.float(e.x, e.y - 150, opts.say('splat.gotcha'), 'good');
          if (g.combo >= 2) ctx.sfx.combo(Math.min(8, g.combo));
          if (g.combo === 4 || g.combo === 8) opts.cheer(opts.say('splat.cheer'));
        } else {
          ctx.sfx.play('gasp');
          ctx.float(e.x, e.y - 90, `${e.points}`, 'bad');
          ctx.float(e.x, e.y - 150, opts.say('splat.oops'), 'bad');
          opts.cheer(opts.say('splat.mascotLine'));
        }
      } else if (e.type === 'miss') {
        ctx.burst(puff, e.x, e.y);
        const mark = sprite(ctx, 'spr-splat', e.x, e.y, 90);
        mark.zIndex = e.y;
        mark.alpha = 0.85;
        mark.scale.y *= 0.5;
        fadeAway(ctx, mark, 900);
      }
    }
    g.events.length = 0;
  };

  const syncBalls = () => {
    const live = new Set(g.balls.map((b) => b.id));
    for (const [id, s] of balls) if (!live.has(id)) {
      s.destroy();
      balls.delete(id);
    }
    for (const b of g.balls) {
      let s = balls.get(b.id);
      if (!s) {
        s = sprite(ctx, 'spr-snowball', THROW_FROM.x, THROW_FROM.y, 110);
        s.zIndex = 1700;
        balls.set(b.id, s);
      }
      const at = ballAt(b);
      s.position.set(at.x, at.y);
      s.scale.set((110 / (s.texture.height || 110)) * at.scale);
      s.rotation += 0.3;
    }
  };

  const target = (p: PointerSample): { x: number; y: number } => {
    if (!press) return p;
    const gest = classifyGesture(press, p);
    if (gest.kind !== 'flick') return p;
    return { x: Math.max(40, Math.min(728, press.x + gest.vx * AIM_S)), y: Math.max(560, Math.min(1260, press.y + gest.vy * AIM_S)) };
  };

  return {
    update(dt) {
      stepSplat(g, dt);
      handle();
      holes.forEach((hv, i) => syncPop(hv, g.pops.find((p) => p.hole === i)));
      syncBalls();
      snow(dt);
      reticle.clear();
      if (aimAt) reticle.circle(aimAt.x, aimAt.y, 34).stroke({ width: 5, color: snowColor, alpha: 0.9 }).circle(aimAt.x, aimAt.y, 6).fill({ color: snowColor });
      report.hud({ score: g.score, left: Math.ceil(g.seconds - g.time), combo: g.combo });
      if (g.over) report.end({ score: g.score, won: g.hits >= 12 });
    },
    pointerDown(p) {
      press = p;
      aimAt = p;
    },
    pointerMove(p) {
      if (press) aimAt = p;
    },
    pointerUp(p) {
      if (!press) return;
      const t = target(p);
      press = null;
      aimAt = null;
      throwBall(g, t.x, t.y);
    },
    action() {
      const up = g.pops.find((p) => p.phase === 'up' && p.kind !== 'mascot');
      const h = up ? HOLES[up.hole] : HOLES[1];
      throwBall(g, h.x, h.y - 100 * h.scale);
    },
  };
}
