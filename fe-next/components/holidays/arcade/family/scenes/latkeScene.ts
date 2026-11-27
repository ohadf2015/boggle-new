import type { Container, Graphics, Sprite } from 'pixi.js';
import { flipLatke, latkeStage, newLatkeGame, PERFECT_BAND, stepLatke, type LatkeStage } from '@/lib/holidays/arcade/latke';
import type { KitCtx, Scene } from '../../kit/types';
import { neoColor } from '../../kit/neoColor';
import { comboMult } from '@/lib/holidays/arcade/kit/pace';
import { ambience, backdrop, burstPreset, fadeAway, finale, glow, levelUp, multPop, popIn, reporter, sprite, squash, type TurnOpts } from './common';

export const LATKE_ART = ['bg-latke', 'spr-latke-raw', 'spr-latke-light', 'spr-latke-golden', 'spr-latke-burnt', 'spr-smoke', 'spr-spark-star', 'spr-sour-cream', 'spr-applesauce', 'spr-oil-drop'];

const SPOTS = [
  { x: 236, y: 998 }, { x: 382, y: 1060 }, { x: 528, y: 998 }, { x: 306, y: 918 }, { x: 458, y: 918 },
];
const SIZE = 172;
const SQUISH = 0.74;
const RING_R = 104;
const TEX: Record<LatkeStage, string> = {
  raw: 'spr-latke-raw', light: 'spr-latke-light', golden: 'spr-latke-golden', dark: 'spr-latke-golden', burnt: 'spr-latke-burnt',
};

interface View {
  root: Container;
  body: Container;
  latke: Sprite;
  ring: Graphics;
  halo: Graphics;
  id: number;
  stage: LatkeStage | null;
  star: Sprite | null;
}

export function createLatkeScene(ctx: KitCtx, opts: TurnOpts): Scene {
  const { pixi } = ctx;
  const g = newLatkeGame(opts.seed, opts.seconds);
  const report = reporter(opts);
  backdrop(ctx, 'bg-latke');
  const panGlow = glow(ctx, 'neo-holiday-gold', 330, ctx.world);
  panGlow.position.set(382, 1000);
  panGlow.scale.set(1, 0.45);
  const steam = ambience(ctx, 'embers', 18, { x: 170, y: 760, w: 430, h: 300 });
  const color = {
    track: neoColor('neo-navy', 0x1a1a2e),
    band: neoColor('neo-holiday-gold'),
    raw: neoColor('neo-holiday-snow'),
    light: neoColor('neo-holiday-gold'),
    golden: neoColor('neo-lime'),
    dark: neoColor('neo-orange'),
    burnt: neoColor('neo-pink'),
  };
  const oil = burstPreset(['neo-holiday-gold', 'neo-orange', 'neo-cream'], { particlesPerWave: 18, speed: { min: 140, max: 420 }, scale: { start: 1.8, end: 0.2 } });
  const stars = burstPreset(['neo-holiday-gold', 'neo-cream', 'neo-lime'], { shape: 'star', particlesPerWave: 22, gravity: { x: 0, y: 300 }, scale: { start: 2.6, end: 0.3 } });
  const views: View[] = [];

  const makeView = (slot: number): View => {
    const spot = SPOTS[slot];
    const root = new pixi.Container();
    root.position.set(spot.x, spot.y);
    root.zIndex = spot.y;
    const halo = glow(ctx, 'neo-holiday-gold', 105, root);
    halo.scale.set(1, SQUISH);
    halo.alpha = 0;
    const ring = new pixi.Graphics();
    ring.scale.set(1, SQUISH);
    const body = new pixi.Container();
    const latke = sprite(ctx, TEX.raw, 0, 0, SIZE, body);
    body.scale.set(1, SQUISH);
    root.addChild(ring, body);
    ctx.world.addChild(root);
    popIn(ctx, latke, latke.scale.x);
    return { root, body, latke, ring, halo, id: -1, stage: null, star: null };
  };

  const drawRing = (v: View, cook: number, stage: LatkeStage, t: number) => {
    const r = v.ring;
    r.clear();
    const start = -Math.PI / 2;
    const at = (c: number) => start + Math.min(1, c) * Math.PI * 2;
    r.circle(0, 0, RING_R).stroke({ width: 14, color: color.track, alpha: 0.55 });
    r.arc(0, 0, RING_R, at(PERFECT_BAND[0]), at(PERFECT_BAND[1])).stroke({ width: 14, color: color.band, alpha: 0.95 });
    const pulse = stage === 'dark' ? 0.55 + 0.45 * Math.abs(Math.sin(t * 14)) : 1;
    r.arc(0, 0, RING_R, start, at(cook)).stroke({ width: 8, color: color[stage], alpha: pulse });
  };

  const fx = {
    flip(v: View, points: number, perfect: boolean) {
      ctx.sfx.play(perfect ? 'perfect' : 'flip');
      ctx.burst(oil, v.root.x, v.root.y + 10);
      ctx.shake(perfect ? 7 : 4, 0.18);
      if (perfect) {
        ctx.hitStop(70);
        ctx.burst(stars, v.root.x, v.root.y - 40);
        const star = sprite(ctx, 'spr-spark-star', v.root.x, v.root.y - 30, 160);
        star.zIndex = 2000;
        popIn(ctx, star, star.scale.x, 200);
        fadeAway(ctx, star, 520, 30);
        ctx.float(v.root.x, v.root.y - 110, opts.say('latke.perfect'), 'good');
        if (g.combo >= 2) ctx.sfx.combo(Math.min(g.combo, 8));
        if (g.combo === 3 || g.combo === 6) opts.cheer(opts.say('latke.cheer'));
      }
      ctx.float(v.root.x, v.root.y - 60, `+${points}`, 'gold');
      if (ctx.reduced) return;
      const base = v.body.scale.x;
      ctx.tweens.add({
        from: 0, to: 1, duration: 0.34,
        onUpdate: (k) => {
          v.body.y = -Math.sin(k * Math.PI) * 120;
          v.body.scale.set(base, SQUISH * Math.cos(k * Math.PI * 2));
          v.body.rotation = Math.sin(k * Math.PI) * 0.25;
        },
        onComplete: () => {
          v.body.position.set(0, 0);
          v.body.rotation = 0;
          squash(ctx, v.body, 1, 0.16);
          v.body.scale.y = SQUISH;
        },
      });
    },
    serve(v: View) {
      ctx.sfx.play('coin');
      const plate = sprite(ctx, 'spr-sour-cream', v.root.x, v.root.y - 40, 90);
      plate.zIndex = 2000;
      popIn(ctx, plate, plate.scale.x, 220);
      fadeAway(ctx, plate, 700, 90);
      if (ctx.reduced) {
        v.root.visible = false;
        return;
      }
      const x0 = v.root.x;
      const y0 = v.root.y;
      ctx.tweens.add({
        from: 0, to: 1, duration: 0.5,
        onUpdate: (k) => {
          v.root.position.set(x0 + (760 - x0) * k, y0 - Math.sin(k * Math.PI) * 260 - 120 * k);
          v.root.rotation = k * 6;
          v.root.alpha = 1 - k * 0.6;
        },
      });
    },
    early(v: View) {
      ctx.sfx.play('bad');
      ctx.float(v.root.x, v.root.y - 70, opts.say('latke.early'), 'bad');
      if (ctx.reduced) return;
      ctx.tweens.add({ from: 0, to: 1, duration: 0.3, onUpdate: (k) => { v.body.rotation = Math.sin(k * Math.PI * 4) * 0.18 * (1 - k); } });
    },
    burn(v: View) {
      ctx.sfx.play('burn');
      ctx.sfx.play('gasp');
      ctx.shake(9, 0.3);
      opts.cheer(opts.say('latke.cough'));
      ctx.float(v.root.x, v.root.y - 70, opts.say('latke.burnt'), 'bad');
      for (let i = 0; i < 3; i++) {
        const puff = sprite(ctx, 'spr-smoke', v.root.x + (i - 1) * 40, v.root.y - 30, 110 + i * 30);
        puff.zIndex = 1500;
        puff.alpha = 0.9;
        fadeAway(ctx, puff, 1100 + i * 200, 180 + i * 60);
      }
    },
  };

  const sync = () => {
    g.latkes.forEach((l, slot) => {
      let v = views[slot];
      if (!v) {
        v = views[slot] = makeView(slot);
        v.id = l.id;
      }
      if (v.id !== l.id && l.state === 'cooking') {
        v.root.destroy({ children: true });
        v = views[slot] = makeView(slot);
        v.id = l.id;
      }
      if (l.star && !v.star && l.state === 'cooking') {
        v.star = sprite(ctx, 'spr-spark-star', 0, -96, 70, v.root);
        v.latke.tint = color.golden;
      }
      if (v.star && !ctx.reduced) v.star.rotation = g.time * 3;
      const stage = l.state === 'burnt' ? 'burnt' : latkeStage(Math.min(l.cook, 0.999));
      if (stage !== v.stage) {
        v.latke.texture = ctx.tex(TEX[stage]);
        v.latke.tint = stage === 'dark' ? color.dark : v.star ? color.golden : 0xffffff;
        v.stage = stage;
      }
      v.ring.visible = l.state === 'cooking';
      if (l.state === 'cooking') drawRing(v, l.cook, stage, g.time);
      const ready = stage === 'golden' || stage === 'dark';
      v.halo.alpha = ready && !ctx.reduced ? 0.55 + 0.35 * Math.sin(g.time * 9) : 0;
      if (l.state === 'cooking' && !ctx.reduced) v.latke.y = Math.sin(g.time * 18 + slot) * 1.5;
    });
  };

  const handle = () => {
    for (const e of g.events) {
      if (!('slot' in e)) continue;
      const v = views[e.slot];
      if (!v) continue;
      if (e.type === 'perfect' || e.type === 'flip') fx.flip(v, e.points, e.type === 'perfect');
      else if (e.type === 'serve') fx.serve(v);
      else if (e.type === 'early') fx.early(v);
      else if (e.type === 'burn') fx.burn(v);
      else if (e.type === 'star') {
        ctx.sfx.play('giggle');
        ctx.banner(opts.say('latke.star'));
      }
    }
    for (const e of g.events) {
      if (e.type === 'level') levelUp(ctx, opts, 'latke', e.level);
      else if (e.type === 'mult') multPop(ctx, opts, e.mult, 384, 760);
    }
    g.events.length = 0;
  };

  let bubble = 0;
  const bubbles = burstPreset(['neo-holiday-gold', 'neo-cream'], { particlesPerWave: 2, speed: { min: 30, max: 90 }, gravity: { x: 0, y: -60 }, scale: { start: 0.9, end: 0.1 }, lifetime: { min: 0.3, max: 0.6 } });
  sync();
  return {
    update(dt) {
      stepLatke(g, dt);
      handle();
      sync();
      steam(dt);
      panGlow.alpha = 0.8 + 0.2 * Math.sin(g.time * 3);
      bubble -= dt;
      if (bubble <= 0 && !ctx.reduced) {
        bubble = 0.12;
        const s = SPOTS[Math.floor(Math.random() * g.latkes.length)];
        ctx.burst(bubbles, s.x + (Math.random() - 0.5) * 120, s.y + 30);
      }
      report.hud({ score: g.score, left: Math.ceil(g.seconds - g.time), combo: g.combo, mult: comboMult(g.combo) });
      if (g.over) finale(ctx, opts, report, { score: g.score, won: g.served >= 10 }, opts.say(g.served >= 10 ? 'latke.finaleWin' : 'latke.finale', { n: g.served }));
    },
    pointerDown(p) {
      let best = -1;
      let dist = Infinity;
      g.latkes.forEach((_, slot) => {
        const s = SPOTS[slot];
        const d = Math.hypot(p.x - s.x, (p.y - s.y) / SQUISH);
        if (d < dist) [best, dist] = [slot, d];
      });
      if (best >= 0 && dist < 120) {
        flipLatke(g, best);
        handle();
      }
    },
    action() {
      const ready = g.latkes.map((l, slot) => ({ l, slot })).filter(({ l }) => l.state === 'cooking').sort((a, b) => b.l.cook - a.l.cook)[0];
      if (ready) {
        flipLatke(g, ready.slot);
        handle();
      }
    },
  };
}
