import type { Container, Graphics, Sprite } from 'pixi.js';
import { classifyGesture, type PointerSample } from '@/lib/holidays/arcade/kit/gesture';
import { ARENA, launch, letterGelt, newSpinGame, SPIN_ROUNDS, stepSpin, type DreidelSide, type Top } from '@/lib/holidays/arcade/spin';
import type { KitCtx, Scene } from '../../kit/types';
import { neoColor } from '../../kit/neoColor';
import { ambience, backdrop, burstPreset, fadeAway, glow, popIn, reporter, sprite, type TurnOpts } from './common';

export const SPIN_ART = ['bg-dreidel', 'spr-dreidel-blue', 'spr-dreidel-red', 'spr-dreidel-green', 'spr-dreidel-purple', 'spr-gelt-coins', 'spr-spark-impact', 'spr-trophy'];

const LETTER: Record<DreidelSide, string> = { nun: 'נ', gimel: 'ג', hei: 'ה', shin: 'ש', pe: 'פ' };
const CANDLES = [[190, 500], [575, 500], [150, 760], [615, 760], [290, 905], [480, 905]];
const SPRITE_H = 118;

interface View {
  top: Top;
  root: Container;
  shadow: Graphics;
  blur: Graphics;
  art: Sprite;
  base: number;
  fallen: boolean;
}

export function createSpinScene(ctx: KitCtx, opts: TurnOpts): Scene {
  const { pixi } = ctx;
  const g = newSpinGame(opts.seed, opts.region);
  const report = reporter(opts);
  backdrop(ctx, 'bg-dreidel');
  const arenaGlow = glow(ctx, 'neo-holiday-gold', 300, ctx.world);
  arenaGlow.position.set(ARENA.x, ARENA.y);
  arenaGlow.alpha = 0.6;
  const flames = CANDLES.map(([x, y]) => {
    const f = glow(ctx, 'neo-holiday-gold', 46, ctx.world);
    f.position.set(x, y);
    return f;
  });
  const embers = ambience(ctx, 'embers', 22);
  const aim = new pixi.Graphics();
  aim.zIndex = 900;
  ctx.world.addChild(aim);
  const sparks = burstPreset(['neo-holiday-gold', 'neo-cream', 'neo-cyan'], { shape: 'star', particlesPerWave: 16, gravity: { x: 0, y: 0 } });
  const coins = burstPreset(['neo-holiday-gold', 'neo-orange'], { shape: 'circle', particlesPerWave: 26, gravity: { x: 0, y: 1100 }, speed: { min: 260, max: 620 } });
  const white = neoColor('neo-cream');
  const navy = neoColor('neo-navy', 0x1a1a2e);
  let views: View[] = [];
  let press: PointerSample | null = null;
  let drag: PointerSample | null = null;
  let clock = 0;

  const build = () => {
    views.forEach((v) => v.root.destroy({ children: true }));
    views = g.tops.map((top) => {
      const root = new pixi.Container();
      const shadow = new pixi.Graphics().ellipse(0, 6, 44, 14).fill({ color: navy, alpha: 0.45 });
      const blur = new pixi.Graphics();
      const art = sprite(ctx, `spr-dreidel-${top.color}`, 0, 0, SPRITE_H, root);
      art.anchor.set(0.5, 0.9);
      root.addChildAt(shadow, 0);
      root.addChildAt(blur, 1);
      ctx.world.addChild(root);
      popIn(ctx, art, art.scale.x);
      return { top, root, shadow, blur, art, base: art.scale.y, fallen: false };
    });
    if (g.round > 0) ctx.float(ARENA.x, ARENA.y - 40, opts.say('spin.round', { n: g.round + 1, total: SPIN_ROUNDS }), 'gold');
  };

  const land = (v: View, letter: DreidelSide, you: boolean) => {
    v.fallen = true;
    const dir = Math.random() < 0.5 ? -1 : 1;
    ctx.sfx.play('drop');
    const gelt = letterGelt(letter);
    ctx.float(v.root.x, v.root.y - 120, LETTER[letter], gelt > 0 ? 'gold' : 'bad');
    if (you) {
      ctx.float(v.root.x, v.root.y - 70, opts.say(`spin.side.${letter}`, { gelt }), gelt > 0 ? 'good' : 'gold');
      if (gelt > 0) {
        ctx.sfx.play('coin');
        ctx.burst(coins, v.root.x, v.root.y - 40);
        const c = sprite(ctx, 'spr-gelt-coins', v.root.x, v.root.y - 60, 90);
        c.zIndex = 1200;
        popIn(ctx, c, c.scale.x);
        fadeAway(ctx, c, 900, 110);
      }
    }
    if (ctx.reduced) {
      v.art.rotation = dir * 1.35;
      return;
    }
    const r0 = v.art.rotation;
    ctx.tweens.add({ from: 0, to: 1, duration: 0.45, easing: (t) => 1 - (1 - t) ** 3, onUpdate: (k) => { v.art.rotation = r0 + (dir * 1.35 - r0) * k; } });
  };

  const handle = () => {
    for (const e of g.events) {
      if (e.type === 'launch') ctx.sfx.play('whoosh');
      else if (e.type === 'clash') {
        ctx.sfx.play('clash');
        ctx.burst(sparks, e.x, e.y - 30);
        const hit = sprite(ctx, 'spr-spark-impact', e.x, e.y - 30, 70 + Math.min(80, e.power * 10));
        hit.zIndex = 1300;
        fadeAway(ctx, hit, 260);
        ctx.shake(Math.min(14, 3 + e.power), 0.22);
        if (e.power > 6) ctx.hitStop(60);
      } else if (e.type === 'land') {
        const v = views.find((x) => x.top.id === e.id);
        if (v) land(v, e.letter, e.you);
      } else if (e.type === 'winner') {
        const v = views.find((x) => x.top.id === e.id);
        if (e.you) {
          ctx.sfx.play('win');
          opts.cheer(opts.say('spin.youWin'));
        } else {
          ctx.sfx.play('gasp');
          opts.cheer(opts.say('spin.knocked'));
        }
        if (v) {
          const cup = sprite(ctx, 'spr-trophy', v.root.x, v.root.y - 150, 80);
          cup.zIndex = 1400;
          popIn(ctx, cup, cup.scale.x, 320);
          fadeAway(ctx, cup, 1600, 40);
        }
      } else if (e.type === 'roundScore') ctx.float(ARENA.x, ARENA.y + 40, `+${e.points}`, 'gold');
    }
    g.events.length = 0;
  };

  const drawAim = () => {
    aim.clear();
    const you = views.find((v) => v.top.you);
    if (g.phase !== 'aim' || !you) return;
    const p = 0.5 + 0.5 * Math.sin(clock * 5);
    aim.circle(you.root.x, you.root.y, 58 + p * 8).stroke({ width: 5, color: white, alpha: 0.5 + 0.4 * p });
    const dx = drag && press ? drag.x - press.x : 0;
    const dy = drag && press ? drag.y - press.y : -140;
    const len = Math.min(220, Math.hypot(dx, dy)) || 1;
    const ux = dx / (Math.hypot(dx, dy) || 1);
    const uy = dy / (Math.hypot(dx, dy) || 1);
    for (let i = 1; i <= 5; i++) {
      const k = (i / 5) * len;
      aim.circle(you.root.x + ux * (k + 40), you.root.y + uy * (k + 40), 7 - i * 0.6).fill({ color: white, alpha: 0.9 - i * 0.12 });
    }
  };

  const sync = () => {
    if (views.length === 0 || views[0].top.body !== g.tops[0].body) build();
    for (const v of views) {
      const t = v.top;
      v.root.position.set(t.body.position.x, t.body.position.y);
      v.root.zIndex = t.body.position.y;
      v.blur.clear();
      if (v.fallen) continue;
      const spinning = t.spin > 0;
      const wob = spinning ? 0.05 + 0.45 * Math.max(0, 1 - t.spin / 26) : 0;
      if (!ctx.reduced) {
        v.art.rotation = Math.sin(t.angle * 0.9) * wob;
        v.art.scale.x = v.base * (spinning ? 0.78 + 0.22 * Math.abs(Math.cos(t.angle * 2)) : 1);
      }
      if (spinning && t.spin > 10) v.blur.ellipse(0, -40, 50, 16).stroke({ width: 3, color: white, alpha: Math.min(0.6, t.spin / 50) });
    }
  };

  build();
  return {
    update(dt) {
      clock += dt;
      stepSpin(g, dt);
      handle();
      sync();
      drawAim();
      embers(dt);
      flames.forEach((f, i) => { f.alpha = 0.7 + 0.3 * Math.sin(clock * 9 + i * 2.1); });
      report.hud({ score: g.score, left: 0, combo: g.wins, round: Math.min(SPIN_ROUNDS, g.round + 1) });
      if (g.phase === 'over') report.end({ score: g.score, won: g.wins >= 2 });
    },
    pointerDown(p) {
      if (g.phase !== 'aim') return;
      press = p;
      drag = p;
    },
    pointerMove(p) {
      if (press) drag = p;
    },
    pointerUp(p) {
      if (!press || g.phase !== 'aim') return;
      const gesture = classifyGesture(press, p);
      press = null;
      drag = null;
      if (gesture.kind === 'tap') launch(g, 0, -620);
      else launch(g, gesture.kind === 'flick' ? gesture.vx : gesture.dx * 4, gesture.kind === 'flick' ? gesture.vy : gesture.dy * 4);
    },
    action() {
      launch(g, 0, -620);
    },
  };
}
