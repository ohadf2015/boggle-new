import type { Container, Sprite } from 'pixi.js';
import type { DashSnapshot } from '@/lib/holidays/arcade/party/dashParty';
import { DASH_FIELD } from '@/lib/holidays/arcade/party/field';
import type { KitCtx, Scene } from '../../kit/types';
import { neoColor } from '../../kit/neoColor';
import { ambience, burstPreset, glow, sprite } from '../../family/scenes/common';
import { follow, nameTag, stackTags, wideBackdrop, type PartyFeed } from './feed';

const SLEIGH = '/holidays/sleigh.webp';
const GIFTS = ['spr-gift-red', 'spr-gift-green', 'spr-gift-blue'];
export const PARTY_DASH_ART = ['bg-party-dash', 'spr-owl', 'spr-smoke', 'spr-spark-star', SLEIGH, ...GIFTS];
const ROOF_Y = DASH_FIELD.roofY;

export function createPartyDashScene(ctx: KitCtx, feed: PartyFeed<DashSnapshot>): Scene {
  const { pixi } = ctx;
  wideBackdrop(ctx, 'bg-party-dash');
  const snow = ambience(ctx, 'snow', 60, { x: 0, y: 0, w: 1920, h: 1080 });
  const ink = neoColor('neo-black', 0);
  const brick = neoColor('neo-holiday-red');
  const snowC = neoColor('neo-holiday-snow');
  const sparkle = burstPreset(['neo-holiday-gold', 'neo-cream'], { shape: 'star', particlesPerWave: 14 });
  const obstacles = new Map<number, Container>();
  const gifts = new Map<number, Sprite>();
  const sleighs = new Map<string, { root: Container; art: Sprite; tag: { y: number } }>();
  let star: Container | null = null;

  const sleighFor = (id: string) => {
    let v = sleighs.get(id);
    if (v) return v;
    const seat = feed.seat(id);
    const root = new pixi.Container();
    root.zIndex = 900;
    glow(ctx, seat?.color ?? 'neo-lime', 90, root).alpha = 0.8;
    const art = sprite(ctx, SLEIGH, 0, 0, 120, root);
    art.anchor.set(0.3, 0.55);
    const tag = nameTag(ctx, seat?.name ?? '', seat?.color ?? 'neo-lime', root, -60);
    ctx.world.addChild(root);
    v = { root, art, tag };
    sleighs.set(id, v);
    return v;
  };

  const juice = () => {
    for (const e of feed.drain()) {
      if (e.type === 'gift') {
        ctx.burst(sparkle, e.x as number, e.y as number);
        ctx.sfx.play('coin');
      } else if (e.type === 'crash') {
        ctx.shake(6, 0.2);
        ctx.sfx.play('clash');
      } else if (e.type === 'turbo') ctx.banner(feed.say('party.turbo', { name: feed.seat(e.player as string)?.name ?? '' }));
      else if (e.type === 'level') ctx.banner(feed.say(`dash.level${Math.min(4, e.level as number)}`));
    }
  };

  return {
    update(dt) {
      snow(dt);
      juice();
      const s = feed.state();
      if (!s) return;
      const live = new Set(s.obstacles.map((o) => o[0]));
      for (const [id, v] of obstacles) if (!live.has(id)) {
        v.destroy({ children: true });
        obstacles.delete(id);
      }
      for (const [id, kind, x, y] of s.obstacles) {
        let v = obstacles.get(id);
        if (!v) {
          v = new pixi.Container();
          if (kind === 1) sprite(ctx, 'spr-owl', 0, 0, 112, v);
          else {
            const h = ROOF_Y - 40 - y;
            const ch = new pixi.Graphics().rect(-40, h, 80, 300).fill({ color: brick }).stroke({ width: 5, color: ink });
            for (let row = 0; row < 12; row++) {
              const yy = h + 14 + row * 24;
              ch.moveTo(-40, yy).lineTo(40, yy).stroke({ width: 3, color: ink, alpha: 0.35 });
              const off = row % 2 ? 0 : 20;
              for (let col = -20 + off; col < 40; col += 40) ch.moveTo(col, yy - 24).lineTo(col, yy).stroke({ width: 3, color: ink, alpha: 0.35 });
            }
            ch.roundRect(-50, h - 16, 100, 24, 10).fill({ color: snowC }).stroke({ width: 5, color: ink });
            v.addChild(ch);
            const n = Math.max(2, Math.ceil(h / 72));
            for (let i = 0; i < n; i++) sprite(ctx, 'spr-smoke', 0, h - (i + 0.5) * (h / n), 130, v);
          }
          v.zIndex = kind === 1 ? 850 : 500;
          v.position.set(x, y);
          ctx.world.addChild(v);
          obstacles.set(id, v);
        }
        v.position.set(follow(v.x, x, dt), follow(v.y, y, dt));
      }
      const g = new Set(s.gifts.map((x) => x[0]));
      for (const [id, sp] of gifts) if (!g.has(id)) {
        sp.destroy();
        gifts.delete(id);
      }
      for (const [id, x, y] of s.gifts) {
        let sp = gifts.get(id);
        if (!sp) {
          sp = sprite(ctx, GIFTS[id % 3], x, y, 70);
          sp.zIndex = 800;
          gifts.set(id, sp);
        }
        sp.position.set(follow(sp.x, x, dt), y);
      }
      if (s.star && !star) {
        star = new pixi.Container();
        glow(ctx, 'neo-holiday-gold', 110, star);
        sprite(ctx, 'spr-spark-star', 0, 0, 120, star);
        star.zIndex = 820;
        ctx.world.addChild(star);
      }
      if (!s.star && star) {
        star.destroy({ children: true });
        star = null;
      }
      if (s.star && star) star.position.set(follow(star.x, s.star[0], dt), s.star[1]);
      for (const p of s.sleighs) {
        const v = sleighFor(p.id);
        v.root.position.set(p.x, follow(v.root.y, p.y, dt, 22));
        v.root.rotation = ctx.reduced ? 0 : p.hurt ? Math.sin(s.t * 20) * 0.5 : Math.max(-0.3, Math.min(0.35, p.vy / 1500));
        v.art.tint = p.turbo ? neoColor('neo-holiday-gold') : 0xffffff;
        v.root.alpha = p.hurt ? 0.6 : 1;
      }
      stackTags(s.sleighs.map((p) => ({ x: p.x + sleighs.get(p.id)!.root.y * 0.001, tag: sleighs.get(p.id)!.tag })), -60, 52, 280);
    },
  };
}
