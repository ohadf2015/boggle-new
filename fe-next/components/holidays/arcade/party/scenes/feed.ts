import type { Container } from 'pixi.js';
import type { KitCtx } from '../../kit/types';
import { neoColor } from '../../kit/neoColor';

export interface PartySeat {
  id: string;
  name: string;
  color: string;
}

export interface PartyFeed<S> {
  state: () => S | null;
  drain: () => Record<string, unknown>[];
  seat: (id: string) => PartySeat | undefined;
  say: (key: string, vars?: Record<string, string | number>) => string;
}

export const follow = (cur: number, target: number, dt: number, rate = 18) => cur + (target - cur) * Math.min(1, dt * rate);

export function nameTag(ctx: KitCtx, text: string, color: string, parent: Container, y: number) {
  const tag = new ctx.pixi.Text({
    text: text.length > 10 ? `${text.slice(0, 9)}…` : text,
    style: { fontFamily: 'Fredoka, Rubik, sans-serif', fontWeight: '900', fontSize: 50, fill: neoColor(color), stroke: { color: neoColor('neo-black', 0), width: 8 } },
  });
  tag.anchor.set(0.5, 1);
  tag.y = y;
  parent.addChild(tag);
  return tag;
}

export function wideBackdrop(ctx: KitCtx, name: string) {
  const bg = new ctx.pixi.Sprite(ctx.tex(name));
  bg.width = 1920;
  bg.height = 1080;
  bg.zIndex = -100;
  ctx.world.addChild(bg);
  return bg;
}

export function stackTags(entries: { x: number; tag: { y: number } }[], base: number, step = 46, near = 320) {
  const sorted = [...entries].sort((a, b) => a.x - b.x);
  let lift = 0;
  sorted.forEach((e, i) => {
    lift = i > 0 && e.x - sorted[i - 1].x < near ? (lift + 1) % 3 : 0;
    e.tag.y = base - lift * step;
  });
}
