import { trackGrowthEvent } from '@/utils/growthTracking';
import { LEVEL_TITLES } from '@/backend/modules/xpManager';
import { getNewUnlocksBetween } from '@/lib/avatar/unlocks';

export interface LevelUpInput {
  oldLevel?: number | null;
  newLevel?: number | null;
  newTitles?: readonly string[] | null;
}

export interface PendingLevelUp {
  oldLevel: number;
  newLevel: number;
  source: string;
  /** Highest title unlocked by this jump, if any. */
  title: string | null;
  /** 'undecided' until a watcher settles it: a mounted reveal host takes part unlocks, else the celebration. */
  display: 'undecided' | 'celebrate';
}

let pending: PendingLevelUp | null = null;
let announcedThrough = 0;
let revealHosts = 0;
let celebratedLevel = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function titleCrossed(oldLevel: number, newLevel: number): string | null {
  let title: string | null = null;
  for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) title = LEVEL_TITLES[lvl] ?? title;
  return title;
}

export function announceLevelUp(input: LevelUpInput | null | undefined, source: string): PendingLevelUp | null {
  const newLevel = Number(input?.newLevel);
  if (!Number.isFinite(newLevel) || newLevel < 2) return null;
  const rawOld = Number(input?.oldLevel);
  const oldLevel = Number.isFinite(rawOld) ? rawOld : newLevel - 1;
  if (newLevel <= oldLevel || newLevel <= announcedThrough) return null;
  announcedThrough = newLevel;
  const given = input?.newTitles?.filter(Boolean) ?? [];
  pending = {
    oldLevel,
    newLevel,
    source,
    title: given.length ? given[given.length - 1] : titleCrossed(oldLevel, newLevel),
    display: 'undecided',
  };
  trackGrowthEvent('level_up', { level: newLevel, source, levels_gained: newLevel - oldLevel });
  emit();
  return pending;
}

export function getPendingLevelUp(): PendingLevelUp | null {
  return pending;
}

/**
 * Decides how the pending level-up is shown. Watchers call it from an effect: reveal hosts
 * register in a layout effect, so every host in the same commit is counted by then.
 */
export function settleLevelUp(): 'reveal' | 'celebrate' | null {
  if (!pending) return null;
  if (pending.display === 'celebrate') return 'celebrate';
  if (revealHosts > 0 && getNewUnlocksBetween(pending.oldLevel, pending.newLevel).length > 0) {
    pending = null;
    emit();
    return 'reveal';
  }
  celebratedLevel = Math.max(celebratedLevel, pending.newLevel);
  pending = { ...pending, display: 'celebrate' };
  emit();
  return 'celebrate';
}

/** Highest level shown by the celebration; a reveal at or below it was never shown and is stale. */
export function celebratedThrough(): number {
  return celebratedLevel;
}

export function consumeLevelUp(): void {
  if (!pending) return;
  pending = null;
  emit();
}

export function subscribeLevelUp(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A surface that renders unlock reveals (SessionRevealHost, MP results queue) holds this while mounted. */
export function registerRevealHost(): () => void {
  revealHosts += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    revealHosts -= 1;
    emit();
  };
}

export function hasRevealHost(): boolean {
  return revealHosts > 0;
}

export function __resetLevelUpBusForTests() {
  pending = null;
  announcedThrough = 0;
  revealHosts = 0;
  celebratedLevel = 0;
  listeners.clear();
}
