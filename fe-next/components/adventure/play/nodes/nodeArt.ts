/**
 * Scene art for the map's non-play nodes. Each kind gets its own painted
 * backdrop when one exists; anything without dedicated art falls back to the
 * world's own backdrop, so a screen is never a flat colour.
 */
import type { NodeKind } from '@/lib/adventure/play/runMap';

const SCENE_DIR = '/images/adventure/nodes';
/** Kinds that ship a painted scene of their own (see public/images/adventure/nodes). */
const PAINTED: Partial<Record<NodeKind, string>> = {
  shop: `${SCENE_DIR}/shopkeeper.webp`,
  rest: `${SCENE_DIR}/campfire.webp`,
  treasure: `${SCENE_DIR}/treasure-room.webp`,
  event: `${SCENE_DIR}/crossroads.webp`,
};

export const worldScene = (world: number) => `/images/adventure/play/world-${Math.min(Math.max(1, world), 10)}.webp`;
/** Per-event illustration; the screen falls back to the `?` scene when one is missing. */
export const eventArt = (id: string) => `${SCENE_DIR}/events/${id}.webp`;
export const nodeScene = (kind: NodeKind, world: number) => PAINTED[kind] ?? worldScene(world);

/** Badge colour per node kind — the map's own legend palette. */
export const NODE_ACCENT: Record<NodeKind, string> = {
  fight: 'bg-neo-cream',
  elite: 'bg-neo-pink',
  boss: 'bg-neo-pink',
  treasure: 'bg-neo-yellow',
  shop: 'bg-neo-cyan',
  rest: 'bg-neo-lime',
  event: 'bg-neo-purple',
};
