import type { Sprite } from 'pixi.js';
import { dropGift, GIFT_SIZE, hangingAt, newPresentsGame, PIVOT, stepPresents, type Gift, type GiftKind } from '@/lib/holidays/arcade/presents';
import { ART_W, type KitCtx, type Scene } from '../../kit/types';
import { neoColor } from '../../kit/neoColor';
import { comboMult } from '@/lib/holidays/arcade/kit/pace';
import { ambience, burstPreset, fadeAway, finale, levelUp, multPop, popIn, reporter, sprite, squash, type TurnOpts } from './common';

export const PRESENTS_ART = ['bg-stack', 'spr-gift-red', 'spr-gift-green', 'spr-gift-blue', 'spr-spark-star', 'spr-spark-impact'];

const SKY_CUT = 700;

function giftSprite(ctx: KitCtx, kind: GiftKind): Sprite {
  const s = new ctx.pixi.Sprite(ctx.tex(`spr-gift-${kind === 'gold' ? 'red' : kind}`));
  if (kind === 'gold') s.tint = neoColor('neo-holiday-gold');
  const { w, h } = GIFT_SIZE[kind];
  const k = (w * 1.1) / (s.texture.width || w);
  s.scale.set(k);
  const spriteH = (s.texture.height || h) * k;
  s.anchor.set(0.5, 1 - h / 2 / spriteH);
  return s;
}

export function createPresentsScene(ctx: KitCtx, opts: TurnOpts): Scene {
  const { pixi } = ctx;
  const g = newPresentsGame(opts.seed, opts.seconds);
  const report = reporter(opts);
  const bgTex = ctx.tex('bg-stack');
  const part = (y: number, h: number) => new pixi.Texture({ source: bgTex.source, frame: new pixi.Rectangle(0, y, ART_W, h) });
  const sky = new pixi.Sprite(part(0, SKY_CUT));
  const filler = new pixi.Sprite(part(SKY_CUT - 4, 4));
  const scroll = new pixi.Container();
  scroll.sortableChildren = true;
  const ground = new pixi.Sprite(part(SKY_CUT, 1344 - SKY_CUT));
  ground.y = SKY_CUT;
  ground.zIndex = -10;
  filler.y = SKY_CUT;
  sky.zIndex = -30;
  filler.zIndex = -20;
  scroll.addChild(ground);
  ctx.world.addChild(sky, filler, scroll);
  const snow = ambience(ctx, 'snow', 40);
  const rope = new pixi.Graphics();
  rope.zIndex = 50;
  scroll.addChild(rope);
  const ropeColor = neoColor('neo-holiday-gold');
  const dust = burstPreset(['neo-holiday-snow', 'neo-cream'], { particlesPerWave: 14, gravity: { x: 0, y: 500 }, speed: { min: 80, max: 260 } });
  const stars = burstPreset(['neo-holiday-gold', 'neo-cream', 'neo-lime'], { shape: 'star', particlesPerWave: 24, gravity: { x: 0, y: 300 }, scale: { start: 2.6, end: 0.3 } });
  const confetti = burstPreset(['neo-holiday-red', 'neo-holiday-gold', 'neo-lime', 'neo-cyan', 'neo-pink'], { shape: 'rect', particlesPerWave: 40, lifetime: { min: 0.8, max: 1.6 }, speed: { min: 200, max: 700 } });
  const sprites = new Map<number, Sprite>();
  let hanging: Sprite | null = null;
  let clock = 0;
  let wobbleCd = 0;

  const hang = (kind: GiftKind) => {
    hanging = giftSprite(ctx, kind);
    hanging.zIndex = 60;
    scroll.addChild(hanging);
    popIn(ctx, hanging, hanging.scale.x, 220);
  };
  if (g.hanging) hang(g.hanging);

  const spriteFor = (gift: Gift) => {
    let s = sprites.get(gift.id);
    if (!s) {
      s = hanging ?? giftSprite(ctx, gift.kind);
      if (!hanging) scroll.addChild(s);
      hanging = null;
      s.zIndex = 10;
      sprites.set(gift.id, s);
    }
    return s;
  };

  const handle = () => {
    for (const e of g.events) {
      if (e.type === 'drop') ctx.sfx.play('whoosh');
      else if (e.type === 'land') {
        ctx.sfx.play('drop');
        ctx.burst(dust, e.x, e.y + 90);
        ctx.shake(4, 0.15);
        const top = g.gifts[g.gifts.length - 1];
        const s = top && sprites.get(top.id);
        if (s) squash(ctx, s, s.scale.x, 0.2);
        ctx.float(e.x, e.y - 30, `+${e.points}`, 'gold');
      } else if (e.type === 'perfect') {
        ctx.sfx.play('perfect');
        ctx.sfx.combo(Math.min(8, e.combo));
        ctx.burst(stars, e.x, e.y);
        ctx.hitStop(60);
        ctx.float(e.x, e.y - 90, opts.say('presents.perfect'), 'good');
        if (e.combo >= 3) opts.cheer(opts.say('presents.cheer'));
      } else if (e.type === 'topple') {
        ctx.sfx.play('crash');
        ctx.sfx.play('gasp');
        ctx.shake(18, 0.6);
        ctx.hitStop(140);
        ctx.slowMo(700);
        ctx.burst(confetti, 384, g.topY + 200);
        ctx.banner(opts.say('presents.topple'));
        opts.cheer(opts.say('presents.facepalm'));
        const boom = sprite(ctx, 'spr-spark-impact', 384, 600, 240);
        boom.zIndex = 1500;
        popIn(ctx, boom, boom.scale.x, 180);
        fadeAway(ctx, boom, 700);
        for (const [, s] of sprites) {
          const x0 = s.x;
          const y0 = s.y;
          const dir = x0 < 384 ? -1 : 1;
          const spin = (Math.random() - 0.5) * 12;
          if (ctx.reduced) s.destroy();
          else
            ctx.tweens.add({
              from: 0, to: 1, duration: 0.9,
              onUpdate: (k) => {
                s.position.set(x0 + dir * (200 + Math.abs(spin) * 30) * k, y0 - Math.sin(k * Math.PI) * 220 + 500 * k * k);
                s.rotation = spin * k;
              },
              onComplete: () => s.destroy(),
            });
        }
        sprites.clear();
      } else if (e.type === 'golden') {
        ctx.sfx.play('win');
        ctx.burst(stars, e.x, e.y);
        ctx.burst(confetti, e.x, e.y);
        ctx.float(e.x, e.y - 120, `+${e.points}`, 'good');
        ctx.banner(opts.say('presents.golden'));
      } else if (e.type === 'mult') multPop(ctx, opts, e.mult, 384, 420);
      else if (e.type === 'level') levelUp(ctx, opts, 'presents', e.level);
      else if (e.type === 'hang') hang(e.kind);
    }
    g.events.length = 0;
  };

  const sync = () => {
    scroll.y = -g.cam;
    filler.height = Math.max(4, -g.cam + 4);
    for (const [id, s] of sprites) {
      if (g.gifts.some((x) => x.id === id)) continue;
      s.destroy();
      sprites.delete(id);
    }
    for (const gift of g.gifts) {
      const s = spriteFor(gift);
      s.position.set(gift.body.position.x, gift.body.position.y);
      s.rotation = gift.body.angle;
    }
    rope.clear();
    if (hanging && g.hanging) {
      const at = hangingAt(g);
      const { h } = GIFT_SIZE[g.hanging];
      hanging.position.set(at.x, at.y + h / 2);
      hanging.rotation = at.angle * 0.3;
      rope.moveTo(PIVOT.x + g.wind, PIVOT.y + g.cam).lineTo(at.x, at.y - 10).stroke({ width: 5, color: ropeColor });
    }
  };

  sync();
  return {
    update(dt) {
      clock += dt;
      stepPresents(g, dt);
      handle();
      sync();
      snow(dt);
      wobbleCd -= dt;
      const top = g.gifts[g.gifts.length - 1];
      if (top && !g.falling && Math.abs(top.body.angularVelocity) > 0.02 && wobbleCd <= 0) {
        ctx.sfx.play('wobble');
        wobbleCd = 1.2;
      }
      report.hud({ score: g.score, left: Math.ceil(g.seconds - g.time), combo: g.combo, mult: comboMult(g.combo) });
      if (g.over) finale(ctx, opts, report, { score: g.score, won: g.bestHeight >= 8 }, opts.say(g.bestHeight >= 8 ? 'presents.finaleWin' : 'presents.finale', { n: g.bestHeight }));
    },
    pointerDown() {
      dropGift(g);
    },
    action() {
      dropGift(g);
    },
  };
}
