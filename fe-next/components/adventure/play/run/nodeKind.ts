/**
 * Which map node the player is standing on, for the run HUD chip.
 *
 * The act map is the truth. Until the map flow is wired (or when a node id no
 * longer resolves) the level spec answers instead, so the chip never blanks out
 * on a board that is plainly a fight.
 */
import type { NodeKind, RunMap } from '@/lib/adventure/play/runMap';
import type { LevelKind } from '@/lib/adventure/play/levels';

export interface LevelShape {
  isBoss?: boolean;
  kind?: LevelKind;
}

export function currentNodeKind(
  map: RunMap | null | undefined,
  currentNode: string | null | undefined,
  lvl: LevelShape | null | undefined,
): NodeKind | null {
  const node = map && currentNode ? map.nodes.find((n) => n.id === currentNode) : null;
  if (node) return node.kind;
  if (!lvl) return null;
  if (lvl.isBoss || lvl.kind === 'boss') return 'boss';
  if (lvl.kind === 'elite') return 'elite';
  return 'fight';
}

/** Chip colours per node kind — electric, colour-coded, black text on every fill. */
export const NODE_CHIP: Record<NodeKind, string> = {
  fight: 'bg-neo-cyan',
  elite: 'bg-neo-pink',
  boss: 'bg-neo-yellow',
  treasure: 'bg-neo-yellow',
  shop: 'bg-neo-lime',
  rest: 'bg-neo-lime',
  event: 'bg-neo-cyan',
};
