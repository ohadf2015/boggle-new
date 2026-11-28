import type { Container, Sprite } from 'pixi.js';
import { CATCH_FIELD as CATCH } from '@/lib/holidays/arcade/party/field';
import type { CatchSnapshot } from '@/lib/holidays/arcade/party/catchParty';
import type { KitCtx, Scene } from '../../kit/types';
import { neoColor } from '../../kit/neoColor';
import { ambience, burstPreset, fadeAway, glow, sprite } from '../../family/scenes/common';
import { follow, nameTag, stackTags, wideBackdrop, type PartyFeed } from './feed';

const DOUGH = '/holidays/props-sufganiyah.webp';
const LATKE = '/holidays/props-latke.webp';
export const PARTY_CATCH_ART = ['bg-party-catch', 'spr-plate', 'spr-smoke', 'spr-splat', DOUGH, LATKE];
const SIZE = [96, 124, 84];

export function createPartyCatchScene(ctx: KitCtx, feed: PartyFeed<CatchSnapshot>): Scene {
  const { pixi } = ctx;
  wideBackdrop(ctx, 'bg-party-catch');
  const sugar = ambience(ctx, 'snow', 40, { x: 0, y: 0, w: 1920, h: 1080 });
  const gold = neoColor('neo-holiday-gold');
  const dark = neoColor('neo-navy');
  const jelly = neoColor('neo-holiday-red');
  const sugarBurst = burstPreset(['neo-cream', 'neo-holiday-snow', 'neo-holiday-gold'], { particlesPerWave: 16 });
  const frenzyGlow = glow(ctx, 'neo-holiday-gold', 520, ctx.world);
  frenzyGlow.position.set(960, 480);
  frenzyGlow.scale.set(2, 1);
  frenzyGlow.zIndex = -50;
  const items = new Map<number, Container>();
  const plates = new Map<string, Container>();
  const tags = new Map<string, { y: number }>();

  const plateFor = (id: string) => {
    let root = plates.get(id);
    if (root) return root;
    const seat = feed.seat(id);
    root = new pixi.Container();
    root.zIndex = 1100;
    const ring = new pixi.Graphics().ellipse(0, 6, 132, 34).fill({ color: neoColor(seat?.color ?? 'neo-lime'), alpha: 0.85 });
    root.addChild(ring);
    sprite(ctx, 'spr-plate', 0, 0, 98, root);
    tags.set(id, nameTag(ctx, seat?.name ?? '', seat?.color ?? 'neo-lime', root, -50));
    root.position.set(960, CATCH.plateY + 24);
    ctx.world.addChild(root);
    plates.set(id, root);
    return root;
  };

  const juice = () => {
    for (const e of feed.drain()) {
      if (e.type === 'catch') {
        ctx.burst(sugarBurst, e.x as number, CATCH.plateY - 20);
        ctx.float(e.x as number, CATCH.plateY - 140, `+${e.points}`, 'gold');
        ctx.sfx.play('pop');
      } else if (e.type === 'burnt') {
        ctx.shake(8, 0.25);
        ctx.sfx.play('burn');
        const puff = sprite(ctx, 'spr-smoke', e.x as number, CATCH.plateY - 40, 150);
        puff.zIndex = 1500;
        fadeAway(ctx, puff, 900, 160);
        const seat = feed.seat(e.player as string);
        if (seat) ctx.float(e.x as number, CATCH.plateY - 190, feed.say('party.cough', { name: seat.name }), 'bad');
      } else if (e.type === 'splat') {
        const mark = sprite(ctx, 'spr-splat', e.x as number, CATCH.floorY + 10, 120);
        mark.tint = jelly;
        mark.scale.y *= 0.45;
        mark.zIndex = 700;
        fadeAway(ctx, mark, 1000);
        ctx.sfx.play('splat');
      } else if (e.type === 'frenzy') {
        const seat = feed.seat(e.player as string);
        ctx.banner(feed.say('party.frenzy', { name: seat?.name ?? '' }));
        ctx.sfx.play('win');
      } else if (e.type === 'level') ctx.banner(feed.say(`catch.level${Math.min(4, e.level as number)}`));
    }
  };

  return {
    update(dt) {
      sugar(dt);
      juice();
      const s = feed.state();
      if (!s) return;
      frenzyGlow.alpha = s.frenzy && !ctx.reduced ? 0.7 : 0;
      const live = new Set(s.items.map((i) => i[0]));
      for (const [id, v] of items) if (!live.has(id)) {
        v.destroy({ children: true });
        items.delete(id);
      }
      for (const [id, kind, x, y] of s.items) {
        let v = items.get(id);
        if (!v) {
          v = new pixi.Container();
          v.zIndex = 1000;
          if (kind === 1) glow(ctx, 'neo-holiday-gold', 120, v);
          const sp: Sprite = sprite(ctx, kind === 2 ? LATKE : DOUGH, 0, 0, SIZE[kind], v);
          if (kind === 2) sp.tint = dark;
          if (kind === 1) sp.tint = gold;
          v.position.set(x, y);
          ctx.world.addChild(v);
          items.set(id, v);
        }
        v.position.set(follow(v.x, x, dt), follow(v.y, y, dt));
        if (!ctx.reduced) v.rotation += dt * 2;
      }
      for (const p of s.plates) {
        const v = plateFor(p.id);
        v.x = follow(v.x, p.x, dt, 22);
        v.rotation = p.stun && !ctx.reduced ? Math.sin(s.t * 50) * 0.2 : 0;
      }
      stackTags(s.plates.map((p) => ({ x: plates.get(p.id)!.x, tag: tags.get(p.id)! })), -50);
    },
  };
}
