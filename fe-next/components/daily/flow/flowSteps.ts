/**
 * Presentation metadata + played-status derivation for Daily Flow steps.
 *
 * Kept separate from the React controller so the "which mode is next, how far
 * along are we" logic is pure and unit-testable without a DOM.
 */

import type { Language } from '@/types';
import { DAILY_MODES, type DailyModeId, type DailyModeDef } from '@/lib/dailyModes';
import {
  hasPlayedWordHuntToday,
  hasPlayedWordWheelToday,
} from '@/utils/dailyChallenge/storage';
import type { PlayedMap } from '@/utils/dailyChallenge/flow';

/** Ordered public modes that make up a default flow (admin/in-work modes opt in separately). */
export const DEFAULT_FLOW_STEPS: DailyModeId[] = ['word-hunt', 'word-wheel'];

/** Accent → tailwind token bundle for a step's break card. */
export interface FlowStepChrome {
  accentText: string;
  accentBg: string;
  ring: string;
}

const CHROME: Record<DailyModeDef['accent'], FlowStepChrome> = {
  orange: { accentText: 'text-neo-orange', accentBg: 'bg-neo-orange', ring: 'ring-neo-orange' },
  yellow: { accentText: 'text-neo-yellow', accentBg: 'bg-neo-yellow', ring: 'ring-neo-yellow' },
  cyan: { accentText: 'text-neo-cyan', accentBg: 'bg-neo-cyan', ring: 'ring-neo-cyan' },
};

/** Optional per-mode mascot preview (falls back to the icon when absent). */
const MASCOT: Partial<Record<DailyModeId, string>> = {
  'word-hunt': '/daily/word-hunt-mascot.jpg',
  'word-wheel': '/daily/word-wheel-mascot.jpg',
};

export interface FlowStepMeta {
  id: DailyModeId;
  titleKey: string;
  descKey: string;
  chrome: FlowStepChrome;
  mascot: string | null;
}

const MODE_BY_ID: Record<string, DailyModeDef> = Object.fromEntries(
  DAILY_MODES.map((m) => [m.id, m]),
);

/** Display metadata for a step id, or null if the id isn't a known mode. */
export function flowStepMeta(id: DailyModeId): FlowStepMeta | null {
  const mode = MODE_BY_ID[id];
  if (!mode) return null;
  return {
    id: mode.id,
    titleKey: mode.titleKey,
    descKey: mode.descKey,
    chrome: CHROME[mode.accent],
    mascot: MASCOT[mode.id] ?? null,
  };
}

/**
 * Current played status for the flow's steps, read from the same per-mode
 * result storage the hub uses. This is the source of truth the flow coordinates
 * over — a completed challenge (any device/tab) is what advances the flow.
 */
export function readPlayedMap(steps: DailyModeId[], language: Language): PlayedMap {
  const map: PlayedMap = {};
  for (const step of steps) {
    if (step === 'word-hunt') map[step] = hasPlayedWordHuntToday(language);
    else if (step === 'word-wheel') map[step] = hasPlayedWordWheelToday(language);
    // Other modes (e.g. word-tower) have no local played-check yet; default
    // false so the flow never skips them silently.
    else map[step] = false;
  }
  return map;
}

/** Locale-prefixed href for a step, with the flow marker query appended. */
export function flowStepHref(id: DailyModeId, locale: string): string {
  const mode = MODE_BY_ID[id];
  if (!mode) return `/${locale}/daily`;
  const base = `/${locale}${mode.path}`;
  return base.includes('?') ? `${base}&flow=1` : `${base}?flow=1`;
}
