import { trackGrowthEvent } from '@/utils/growthTracking';
import { LEVEL_TITLES } from '@/backend/modules/xpManager';

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
}

let pending: PendingLevelUp | null = null;
let announcedThrough = 0;
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
  };
  trackGrowthEvent('level_up', { level: newLevel, source, levels_gained: newLevel - oldLevel });
  emit();
  return pending;
}

export function getPendingLevelUp(): PendingLevelUp | null {
  return pending;
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

export function __resetLevelUpBusForTests() {
  pending = null;
  announcedThrough = 0;
  listeners.clear();
}
