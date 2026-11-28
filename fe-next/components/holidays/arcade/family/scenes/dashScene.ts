import type { Container, Graphics, Sprite } from 'pixi.js';
import { DASH, hold, newDashGame, stepDash, type DashObstacle } from '@/lib/holidays/arcade/dash';
import { comboMult } from '@/lib/holidays/arcade/kit/pace';
import { ART_W, type KitCtx, type Scene } from '../../kit/types';
import { neoColor } from '../../kit/neoColor';
import { ambience, backdrop, burstPreset, fadeAway, finale, glow, levelUp, multPop, popIn, reporter, sprite, type TurnOpts } from './common';

const SLEIGH = '/holidays/sleigh.webp';
const GIFTS = ['spr-gift-red', 'spr-gift-green', 'spr-gift-blue'];
export const DASH_ART = ['bg-rooftops', 'spr-owl', 'spr-smoke', 'spr-spark-star', 'spr-spark-impact', SLEIGH, ...GIFTS];

const ROOF_Y = 1090;
const SLEIGH_H = 132;
const PUFF = 120;

interface House {
  g: Graphics;
  x: number;
  w: number;
}

export function createDashScene(ctx: KitCtx, opts: TurnOpts): Scene {
  const { pixi } = ctx;
  const g = newDashGame(opts.seed, opts.seconds);
  const report = reporter(opts);
  backdrop(ctx, 'bg-rooftops');
  const snow = ambience(ctx, 'snow', 36);
  const c = {
    roof: neoColor('neo-navy-light'),
    wall: neoColor('neo-navy'),
    snow: neoColor('neo-holiday-snow'),
    window: neoColor('neo-holiday-gold'),
    brick: neoColor('neo-holiday-red'),
    ink: neoColor('neo-black', 0),
    gold: neoColor('neo-holiday-gold'),
  };
  const dust = burstPreset(['neo-holiday-gold', 'neo-cream', 'neo-cyan'], { particlesPerWave: 3, speed: { min: 40, max: 120 }, gravity: { x: -300, y: 120 }, scale: { start: 1.1, end: 0.1 }, lifetime: { min: 0.3, max: 0.6 } });
  const sparkle = burstPreset(['neo-holiday-gold', 'neo-cream', 'neo-lime'], { shape: 'star', particlesPerWave: 18, gravity: { x: 0, y: 260 } });
  const feathers = burstPreset(['neo-orange', 'neo-cream', 'neo-holiday-snow'], { particlesPerWave: 22, gravity: { x: 0, y: 500 }, speed: { min: 120, max: 420 } });
  const snowPuff = burstPreset(['neo-holiday-snow', 'neo-cream'], { particlesPerWave: 10, gravity: { x: 0, y: 600 }, speed: { min: 80, max: 260 } });

  const roofs = new pixi.Container();
  roofs.zIndex = 400;
  ctx.world.addChild(roofs);
  const houses: House[] = [];
  const addHouse = (x: number) => {
    const w = 170 + Math.random() * 110;
    const h = 90 + Math.random() * 80;
    const peak = 50 + Math.random() * 40;
    const hg = new pixi.Graphics();
    const top = ROOF_Y + 160 - h;
    hg.rect(0, top, w, 400).fill({ color: c.wall }).stroke({ width: 4, color: c.ink });
    hg.poly([-12, top, w / 2, top - peak, w + 12, top]).fill({ color: c.roof }).stroke({ width: 4, color: c.ink });
    hg.poly([-12, top, w / 2, top - peak, w + 12, top, w + 12, top + 10, w / 2, top - peak + 12, -12, top + 10]).fill({ color: c.snow });
    for (let i = 0; i < 2; i++) hg.roundRect(w * (0.22 + i * 0.38), top + 30, 34, 40, 4).fill({ color: c.window, alpha: Math.random() < 0.75 ? 0.95 : 0.25 }).stroke({ width: 3, color: c.ink });
    hg.x = x;
    roofs.addChild(hg);
    houses.push({ g: hg, x, w });
  };
  for (let x = -40; x < ART_W + 300; ) {
    addHouse(x);
    x += houses[houses.length - 1].w + 18;
  }

  const sleighRoot = new pixi.Container();
  sleighRoot.zIndex = 900;
  const halo = glow(ctx, 'neo-holiday-gold', 150, sleighRoot);
  halo.alpha = 0;
  const sleigh = sprite(ctx, SLEIGH, 0, 0, SLEIGH_H, sleighRoot);
  sleigh.anchor.set(0.3, 0.55);
  ctx.world.addChild(sleighRoot);

  const obstacleViews = new Map<number, Container>();
  const giftViews = new Map<number, Sprite>();
  let starView: Container | null = null;
  let trail = 0;
  let tumble = 0;

  const makeObstacle = (o: DashObstacle) => {
    const root = new pixi.Container();
    root.zIndex = o.kind === 'owl' ? 850 : 500;
    if (o.kind === 'plume') {
      const chimney = new pixi.Graphics().rect(-38, ROOF_Y - 40 - o.top, 76, 120).fill({ color: c.brick }).stroke({ width: 4, color: c.ink });
      chimney.rect(-46, ROOF_Y - 52 - o.top, 92, 20).fill({ color: c.snow }).stroke({ width: 4, color: c.ink });
      root.addChild(chimney);
      const height = ROOF_Y - 40 - o.top;
      const count = Math.max(2, Math.ceil(height / (PUFF * 0.6)));
      for (let i = 0; i < count; i++) {
        const puff = sprite(ctx, 'spr-smoke', 0, height - (i + 0.5) * (height / count), PUFF + (count - i) * 8, root);
        puff.alpha = 0.92;
      }
    } else {
      sprite(ctx, 'spr-owl', 0, 0, 112, root);
      ctx.sfx.play('giggle');
    }
    ctx.world.addChild(root);
    obstacleViews.set(o.id, root);
    return root;
  };

  const handle = () => {
    for (const e of g.events) {
      if (e.type === 'gift') {
        ctx.sfx.play('coin');
        ctx.burst(sparkle, e.x, e.y);
        ctx.float(e.x, e.y - 60, `+${e.points}`, 'gold');
        if (g.combo >= 2) ctx.sfx.combo(Math.min(8, g.combo));
      } else if (e.type === 'mult') multPop(ctx, opts, e.mult, DASH.sleighX + 80, g.y - 130);
      else if (e.type === 'near') {
        ctx.sfx.play('whoosh');
        ctx.float(DASH.sleighX + 40, g.y - 90, opts.say('dash.near', { n: e.points }), 'good');
      } else if (e.type === 'crash') {
        ctx.sfx.play('clash');
        ctx.sfx.play('gasp');
        ctx.shake(14, 0.4);
        ctx.hitStop(110);
        tumble = 0.7;
        ctx.burst(e.kind === 'owl' ? feathers : snowPuff, DASH.sleighX + 40, g.y);
        const boom = sprite(ctx, 'spr-spark-impact', DASH.sleighX + 40, g.y, 170);
        boom.zIndex = 1500;
        popIn(ctx, boom, boom.scale.x, 150);
        fadeAway(ctx, boom, 500);
        if (e.points) ctx.float(DASH.sleighX, g.y - 100, `${e.points}`, 'bad');
        opts.cheer(opts.say(e.kind === 'owl' ? 'dash.owlHit' : 'dash.smokeHit'));
      } else if (e.type === 'bump') {
        ctx.burst(snowPuff, DASH.sleighX, DASH.floor + 50, 6);
        ctx.sfx.play('tap');
      } else if (e.type === 'star') {
        ctx.sfx.play('giggle');
        ctx.float(560, 360, opts.say('dash.starComing'), 'gold');
      } else if (e.type === 'turbo') {
        ctx.sfx.play('win');
        ctx.shake(8, 0.3);
        ctx.banner(opts.say('dash.turbo'));
        opts.cheer(opts.say('dash.turboCheer'));
      } else if (e.type === 'level') levelUp(ctx, opts, 'dash', e.level);
    }
    g.events.length = 0;
  };

  const sync = (dt: number) => {
    const move = g.speed * dt;
    for (const h of houses) {
      h.x -= move;
      h.g.x = h.x;
    }
    while (houses.length && houses[0].x + houses[0].w < -60) houses.shift()!.g.destroy();
    const last = houses[houses.length - 1];
    if (last && last.x + last.w < ART_W + 300) addHouse(last.x + last.w + 18);

    const live = new Set(g.obstacles.map((o) => o.id));
    for (const [id, v] of obstacleViews) if (!live.has(id)) {
      v.destroy({ children: true });
      obstacleViews.delete(id);
    }
    for (const o of g.obstacles) {
      const v = obstacleViews.get(o.id) ?? makeObstacle(o);
      v.position.set(o.x, o.kind === 'owl' ? o.y : o.top);
      if (o.kind === 'owl' && !ctx.reduced) {
        v.scale.y = 0.85 + 0.15 * Math.abs(Math.sin(g.time * 12 + o.id));
        v.rotation = o.hit ? v.rotation + dt * 10 : Math.cos(o.phase) * 0.18;
      }
      if (o.kind === 'plume' && !ctx.reduced) v.children.slice(1).forEach((p, i) => (p.x = Math.sin(g.time * 3 + i) * 8));
    }

    const gifts = new Set(g.gifts.map((x) => x.id));
    for (const [id, s] of giftViews) if (!gifts.has(id)) {
      s.destroy();
      giftViews.delete(id);
    }
    for (const gift of g.gifts) {
      let s = giftViews.get(gift.id);
      if (!s) {
        s = sprite(ctx, GIFTS[gift.id % GIFTS.length], gift.x, gift.y, 70);
        s.zIndex = 800;
        giftViews.set(gift.id, s);
      }
      s.position.set(gift.x, gift.y + (ctx.reduced ? 0 : Math.sin(g.time * 5 + gift.id) * 6));
    }

    if (g.star && !starView) {
      starView = new pixi.Container();
      starView.zIndex = 820;
      glow(ctx, 'neo-holiday-gold', 110, starView);
      sprite(ctx, 'spr-spark-star', 0, 0, 120, starView);
      ctx.world.addChild(starView);
    }
    if (!g.star && starView) {
      starView.destroy({ children: true });
      starView = null;
    }
    if (g.star && starView) {
      starView.position.set(g.star.x, g.star.y);
      if (!ctx.reduced) starView.rotation += dt * 3;
    }

    tumble = Math.max(0, tumble - dt);
    sleighRoot.position.set(DASH.sleighX, g.y);
    sleighRoot.rotation = ctx.reduced ? 0 : tumble > 0 ? (1 - tumble / 0.7) * Math.PI * 2 : Math.max(-0.3, Math.min(0.35, g.vy / 1500));
    sleigh.alpha = g.hurt > 0 && tumble === 0 ? 0.5 + 0.5 * Math.round(Math.sin(g.time * 30) * 0.5 + 0.5) : 1;
    sleigh.tint = g.turbo > 0 ? c.gold : 0xffffff;
    halo.alpha = g.turbo > 0 && !ctx.reduced ? 0.8 : 0;
    trail -= dt;
    if (trail <= 0 && (g.holding || g.turbo > 0)) {
      trail = g.turbo > 0 ? 0.03 : 0.06;
      ctx.burst(dust, DASH.sleighX - 50, g.y + 20);
    }
  };

  sync(0);
  return {
    update(dt) {
      stepDash(g, dt);
      if (g.over) {
        g.vy = Math.min(500, g.vy + 900 * dt);
        g.y = Math.min(DASH.floor, g.y + g.vy * dt);
      }
      handle();
      sync(dt);
      snow(dt);
      report.hud({ score: g.score, left: Math.ceil(g.seconds - g.time), combo: g.combo, mult: comboMult(g.combo) });
      if (g.over) finale(ctx, opts, report, { score: g.score, won: g.collected >= 40 }, opts.say(g.collected >= 40 ? 'dash.finaleWin' : 'dash.finale'));
    },
    pointerDown() {
      hold(g, true);
    },
    pointerUp() {
      hold(g, false);
    },
    action() {
      hold(g, true);
    },
    release() {
      hold(g, false);
    },
  };
}
