/**
 * gemCollectBus — module-level pub/sub for "a gem was just collected" moments.
 *
 * The word handler and the cascade emit as gem tiles burst; the board FX layer
 * flies each gem to the HUD counter and the counter ticks up as each one lands.
 * Decorative only, like mascotBus: nothing in game logic listens.
 */
import type { BlastGemKind } from '@/shared/types/blast';

export interface GemCollectEvent {
  row: number;
  col: number;
  gem: BlastGemKind;
}

type Listener = (events: GemCollectEvent[]) => void;
type LandListener = (gem: BlastGemKind) => void;

const listeners = new Set<Listener>();
const landListeners = new Set<LandListener>();

export function emitGemsCollected(events: GemCollectEvent[]): void {
  if (events.length === 0) return;
  for (const listener of listeners) listener(events);
}

export function subscribeGemsCollected(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Fired by the FX layer when a flying gem reaches the counter. */
export function emitGemLanded(gem: BlastGemKind): void {
  for (const listener of landListeners) listener(gem);
}

export function subscribeGemLanded(listener: LandListener): () => void {
  landListeners.add(listener);
  return () => {
    landListeners.delete(listener);
  };
}

/** Gems among cleared tiles, read from the board as it was before the clear. */
export function gemEventsFrom(
  cleared: ReadonlyArray<{ row: number; col: number; type?: string }>,
  before: ReadonlyArray<ReadonlyArray<{ type: string; gem?: BlastGemKind; isCleared: boolean }>>,
): GemCollectEvent[] {
  const events: GemCollectEvent[] = [];
  for (const c of cleared) {
    const tile = before[c.row]?.[c.col];
    if (!tile || tile.isCleared || tile.type !== 'diamond') continue;
    events.push({ row: c.row, col: c.col, gem: tile.gem ?? 'sapphire' });
  }
  return events;
}

/** Test-only reset. Do not call from production code. */
export function _resetGemCollectBus(): void {
  listeners.clear();
  landListeners.clear();
}
