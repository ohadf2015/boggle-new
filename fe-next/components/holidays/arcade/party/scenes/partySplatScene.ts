import type { Container, Sprite } from 'pixi.js';
import type { PopKind } from '@/lib/holidays/arcade/splat';
import { PARTY_HOLES as HOLES } from '@/lib/holidays/arcade/party/field';
import type { SplatSnapshot } from '@/lib/holidays/arcade/party/splatParty';
import type { KitCtx, Scene } from '../../kit/types';
import { neoColor } from '../../kit/neoColor';
import { ambience, burstPreset, fadeAway, popIn, sprite } from '../../family/scenes/common';
import { follow, wideBackdrop, type PartyFeed } from './feed';

const MASCOT = '/holidays/m-christmas.webp';
export const PARTY_SPLAT_ART = ['bg-party-splat', 'spr-popup-elf', 'spr-popup-snowman', 'spr-popup-gremlin', 'spr-snowball', 'spr-splat', MASCOT];
const ART: Record<PopKind, string> = { elf: 'spr-popup-elf', snowman: 'spr-popup-snowman', gremlin: 'spr-popup-gremlin', mascot: MASCOT };

export function createPartySplatScene(ctx: KitCtx, feed: PartyFeed<SplatSnapshot>): Scene {
  const { pixi } = ctx;
  wideBackdrop(ctx, 'bg-party-splat');
  const snow = ambience(ctx, 'snow', 60, { x: 0, y: 0, w: 1920, h: 1080 });
  const puff = burstPreset(['neo-holiday-snow', 'neo-cream', 'neo-cyan'], { particlesPerWave: 22 });
  const slots = HOLES.map((h) => {
    const root = new pixi.Container();
    root.position.set(h.x, h.y);
    root.scale.set(h.scale);
    root.zIndex = h.y;
    const mask = new pixi.Graphics().rect(-200, -420, 400, 430).fill({ color: 0xffffff });
    const slot = new pixi.Container();
    slot.mask = mask;
    root.addChild(mask, slot);
    ctx.world.addChild(root);
    return { slot, pop: null as Sprite | null, popId: 0 };
  });
  const balls = new Map<number, Sprite>();

  const juice = () => {
    for (const e of feed.drain()) {
      if (e.type === 'hit' || e.type === 'oops') {
        const x = e.x as number;
        const y = e.y as number;
        ctx.burst(puff, x, y);
        ctx.shake(e.type === 'oops' ? 10 : 5, 0.2);
        ctx.sfx.play('splat');
        const mark = sprite(ctx, 'spr-splat', x, y, 150);
        mark.zIndex = 1600;
        popIn(ctx, mark, mark.scale.x, 140);
        fadeAway(ctx, mark, 600, -20);
        const seat = feed.seat(e.player as string);
        const name = seat?.name ?? '';
        ctx.float(x, y - 100, e.type === 'hit' ? `${name} \u2066+${e.points}\u2069` : feed.say('party.oops', { name }), e.type === 'hit' ? 'gold' : 'bad');
      } else if (e.type === 'party') ctx.banner(feed.say('splat.party'));
      else if (e.type === 'level') ctx.banner(feed.say(`splat.level${Math.min(4, e.level as number)}`));
    }
  };

  return {
    update(dt) {
      snow(dt);
      juice();
      const s = feed.state();
      if (!s) return;
      slots.forEach((v, i) => {
        const p = s.pops.find((x) => x[1] === i);
        if (!p) {
          v.pop?.destroy();
          v.pop = null;
          return;
        }
        const [id, , kind, height, hit] = p;
        if (v.popId !== id) {
          v.pop?.destroy();
          v.pop = sprite(ctx, ART[kind], 0, 0, 230, v.slot as Container);
          v.pop.anchor.set(0.5, 1);
          v.popId = id;
        }
        v.pop!.y = follow(v.pop!.y, (1 - height) * 250 + (hit ? 60 : 0), dt, 24);
        v.pop!.rotation = hit && !ctx.reduced ? Math.sin(s.t * 40) * 0.25 : 0;
      });
      const live = new Set(s.balls.map((b) => b[0]));
      for (const [id, b] of balls) if (!live.has(id)) {
        b.destroy();
        balls.delete(id);
      }
      for (const [id, owner, x, y, scale] of s.balls) {
        let b = balls.get(id);
        if (!b) {
          b = sprite(ctx, 'spr-snowball', x, y, 110);
          const ring = new pixi.Graphics().circle(0, 0, (b.texture.height || 110) * 0.5).stroke({ width: 14, color: neoColor(feed.seat(owner)?.color ?? 'neo-holiday-snow') });
          b.addChild(ring);
          b.zIndex = 1700;
          balls.set(id, b);
        }
        b.position.set(follow(b.x, x, dt, 25), follow(b.y, y, dt, 25));
        b.scale.set((110 / (b.texture.height || 110)) * scale);
      }
    },
  };
}
