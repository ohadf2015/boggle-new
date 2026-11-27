import type { Container, Sprite } from 'pixi.js';
import { CATCH, movePlate, newCatchGame, stepCatch, type CatchItem, type CatchKind } from '@/lib/holidays/arcade/catch';
import { comboMult } from '@/lib/holidays/arcade/kit/pace';
import type { KitCtx, Scene } from '../../kit/types';
import { neoColor } from '../../kit/neoColor';
import { ambience, backdrop, burstPreset, fadeAway, finale, glow, levelUp, multPop, popIn, reporter, sprite, squash, type TurnOpts } from './common';

const DOUGH = '/holidays/props-sufganiyah.webp';
const LATKE = '/holidays/props-latke.webp';
export const CATCH_ART = ['bg-catch', 'spr-plate', 'spr-smoke', 'spr-splat', 'spr-spark-star', DOUGH, LATKE, '/holidays/m-hanukkah.webp'];

const SIZE: Record<CatchKind, number> = { dough: 92, golden: 118, burnt: 78 };
const PLATE_H = 98;
const PILE_MAX = 5;
const STEER_PX = 140;

export function createCatchScene(ctx: KitCtx, opts: TurnOpts): Scene {
  const { pixi } = ctx;
  const g = newCatchGame(opts.seed, opts.seconds);
  const report = reporter(opts);
  backdrop(ctx, 'bg-catch');
  const sugar = ambience(ctx, 'snow', 26);
  const gold = neoColor('neo-holiday-gold');
  const burntTint = neoColor('neo-navy');
  const jelly = neoColor('neo-holiday-red');
  const sugarBurst = burstPreset(['neo-cream', 'neo-holiday-snow', 'neo-holiday-gold'], { particlesPerWave: 16, speed: { min: 120, max: 380 }, gravity: { x: 0, y: 700 } });
  const jellyBurst = burstPreset(['neo-holiday-red', 'neo-pink', 'neo-cream'], { particlesPerWave: 20, speed: { min: 160, max: 460 } });
  const stars = burstPreset(['neo-holiday-gold', 'neo-cream', 'neo-lime'], { shape: 'star', particlesPerWave: 30, gravity: { x: 0, y: 250 }, scale: { start: 2.8, end: 0.3 } });

  const frenzyGlow = glow(ctx, 'neo-holiday-gold', 520, ctx.world);
  frenzyGlow.position.set(384, 520);
  frenzyGlow.alpha = 0;
  frenzyGlow.zIndex = -50;

  const plateRoot = new pixi.Container();
  plateRoot.zIndex = 900;
  const pile = new pixi.Container();
  const plate = sprite(ctx, 'spr-plate', 0, 0, PLATE_H, plateRoot);
  const plateScale = plate.scale.x;
  plateRoot.addChild(pile);
  ctx.world.addChild(plateRoot);
  const shadow = new pixi.Graphics().ellipse(0, 0, 120, 16).fill({ color: burntTint, alpha: 0.25 });
  shadow.zIndex = 800;
  ctx.world.addChild(shadow);

  const views = new Map<number, Container>();
  let pileCount = 0;

  const makeItem = (it: CatchItem) => {
    const root = new pixi.Container();
    root.zIndex = 1000;
    if (it.kind === 'golden') {
      const halo = glow(ctx, 'neo-holiday-gold', 120, root);
      halo.alpha = 0.9;
    }
    const s = sprite(ctx, it.kind === 'burnt' ? LATKE : DOUGH, 0, 0, SIZE[it.kind], root);
    if (it.kind === 'burnt') s.tint = burntTint;
    if (it.kind === 'golden') s.tint = gold;
    ctx.world.addChild(root);
    views.set(it.id, root);
    return root;
  };

  const drawPile = () => {
    const want = Math.min(PILE_MAX, pileCount);
    while (pile.children.length < want) {
      const i = pile.children.length;
      const d = sprite(ctx, DOUGH, (i % 3 - 1) * 52, -34 - Math.floor(i / 3) * 34, 60, pile);
      popIn(ctx, d, d.scale.x, 180);
    }
    while (pile.children.length > want) pile.children[pile.children.length - 1].destroy();
  };

  const spill = () => {
    if (!pile.children.length) return;
    for (const child of [...pile.children]) {
      const s = child as Sprite;
      const gx = plateRoot.x + s.x;
      const gy = plateRoot.y + s.y;
      const flying = sprite(ctx, DOUGH, gx, gy, 60);
      flying.zIndex = 1200;
      const dir = Math.random() < 0.5 ? -1 : 1;
      if (ctx.reduced) flying.destroy();
      else
        ctx.tweens.add({
          from: 0, to: 1, duration: 0.7,
          onUpdate: (k) => {
            flying.position.set(gx + dir * 260 * k, gy - Math.sin(k * Math.PI) * 160 + 200 * k * k);
            flying.rotation = dir * k * 8;
            flying.alpha = 1 - k;
          },
          onComplete: () => flying.destroy(),
        });
    }
    pile.removeChildren().forEach((c) => c.destroy());
  };

  const handle = () => {
    for (const e of g.events) {
      if (e.type === 'catch') {
        ctx.sfx.play(e.kind === 'golden' ? 'win' : 'pop');
        ctx.burst(sugarBurst, e.x, CATCH.plateY - 20);
        squash(ctx, plate, plateScale, 0.22, 200);
        ctx.float(e.x, CATCH.plateY - 120, `+${e.points}`, e.frenzy ? 'good' : 'gold');
        pileCount += 1;
        if (g.combo >= 2) ctx.sfx.combo(Math.min(8, g.combo));
        if (e.kind === 'golden') {
          ctx.burst(stars, e.x, CATCH.plateY - 60);
          ctx.shake(10, 0.3);
          ctx.hitStop(90);
          ctx.banner(opts.say('catch.frenzy'));
          opts.cheer(opts.say('catch.frenzyCheer'));
        }
      } else if (e.type === 'mult') multPop(ctx, opts, e.mult, g.plate.x, CATCH.plateY - 190);
      else if (e.type === 'burnt') {
        ctx.sfx.play('burn');
        ctx.sfx.play('gasp');
        ctx.shake(12, 0.35);
        ctx.float(e.x, CATCH.plateY - 120, `${e.points}`, 'bad');
        ctx.float(e.x, CATCH.plateY - 180, opts.say('catch.burnt'), 'bad');
        opts.cheer(opts.say('catch.cough'));
        for (let i = 0; i < 3; i++) {
          const puff = sprite(ctx, 'spr-smoke', e.x + (i - 1) * 50, CATCH.plateY - 40, 120 + i * 30);
          puff.zIndex = 1500;
          fadeAway(ctx, puff, 900 + i * 200, 160 + i * 50);
        }
        spill();
        pileCount = 0;
      } else if (e.type === 'splat') {
        ctx.sfx.play('splat');
        ctx.burst(jellyBurst, e.x, CATCH.floorY - 10);
        const mark = sprite(ctx, 'spr-splat', e.x, CATCH.floorY + 10, 120);
        mark.tint = jelly;
        mark.scale.y *= 0.45;
        mark.zIndex = 700;
        fadeAway(ctx, mark, 1100);
        ctx.float(e.x, CATCH.floorY - 80, opts.say('catch.splat'), 'bad');
        if (pileCount >= 3) opts.cheer(opts.say('catch.oops'));
        spill();
        pileCount = 0;
      } else if (e.type === 'level') levelUp(ctx, opts, 'catch', e.level);
      else if (e.type === 'spawn' && e.kind === 'golden') {
        ctx.sfx.play('giggle');
        ctx.float(384, 260, opts.say('catch.goldenComing'), 'gold');
      }
    }
    g.events.length = 0;
  };

  const sync = (dt: number) => {
    const live = new Set(g.items.map((i) => i.id));
    for (const [id, v] of views) if (!live.has(id)) {
      v.destroy({ children: true });
      views.delete(id);
    }
    for (const it of g.items) {
      const v = views.get(it.id) ?? makeItem(it);
      v.position.set(it.x, it.y);
      if (!ctx.reduced) v.rotation += it.spin * dt;
    }
    const wobble = g.stun > 0 && !ctx.reduced ? Math.sin(g.time * 50) * 0.2 * (g.stun / 0.6) : 0;
    plateRoot.position.set(g.plate.x, CATCH.plateY + 24);
    plateRoot.rotation = wobble;
    shadow.position.set(g.plate.x, CATCH.plateY + 70);
    frenzyGlow.alpha = g.frenzy > 0 && !ctx.reduced ? 0.6 + 0.3 * Math.sin(g.time * 10) : 0;
    drawPile();
  };

  sync(0);
  return {
    update(dt) {
      stepCatch(g, dt);
      if (g.over) for (const it of g.items) it.y += it.vy * dt;
      handle();
      sync(dt);
      sugar(dt);
      report.hud({ score: g.score, left: Math.ceil(g.seconds - g.time), combo: g.combo, mult: comboMult(g.combo) });
      if (g.over) finale(ctx, opts, report, { score: g.score, won: g.caught >= 40 }, opts.say(g.caught >= 40 ? 'catch.finaleWin' : 'catch.finale'));
    },
    pointerDown(p) {
      movePlate(g, p.x);
    },
    pointerMove(p) {
      movePlate(g, p.x);
    },
    steer(dir) {
      movePlate(g, g.plate.target + dir * STEER_PX);
    },
  };
}
