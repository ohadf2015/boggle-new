/**
 * The class card builds `teacher.pulse.state.*` / `teacher.pulse.action.*` keys
 * from the pulse at runtime, so no static key scan sees them. A missing one
 * renders as a raw key to every teacher.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ClassNextAction, ClassPulseState } from '@/lib/education/classPulse';
import { en } from '../../../../translations/en.js';
import { he } from '../../../../translations/he.js';
import { sv } from '../../../../translations/sv.js';
import { ja } from '../../../../translations/ja.js';
import { es } from '../../../../translations/es.js';
import { ru } from '../../../../translations/ru.js';

type Dict = Record<string, unknown>;
const LOCALES: Record<string, Dict> = { en, he, sv, ja, es, ru };

const STATES = ['noRoster', 'neverPlayed', 'needsReview', 'ready', 'unknown'] as const satisfies readonly ClassPulseState[];
const ACTIONS = ['invite', 'play', 'review', 'playAgain', 'retry'] as const satisfies readonly ClassNextAction[];
const statesComplete: [Exclude<ClassPulseState, (typeof STATES)[number]>] extends [never] ? true : false = true;
const actionsComplete: [Exclude<ClassNextAction, (typeof ACTIONS)[number]>] extends [never] ? true : false = true;

const src = readFileSync(join(process.cwd(), 'components/teacher/hq/ClassroomCardActivity.tsx'), 'utf8');
const staticKeys = [...new Set([...src.matchAll(/["'](teacher\.pulse\.[A-Za-z0-9_.]+)["']/g)].map((m) => m[1]))];
const keys = [
  ...staticKeys,
  ...STATES.map((s) => `teacher.pulse.state.${s}`),
  ...ACTIONS.map((a) => `teacher.pulse.action.${a}`),
];

function resolve(dict: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Dict)[part] : undefined), dict);
}

describe('ClassroomCardActivity i18n contract', () => {
  it('covers every pulse state and action, and the static keys it renders', () => {
    expect(statesComplete && actionsComplete).toBe(true);
    expect(staticKeys).toContain('teacher.pulse.state.loading');
  });

  it.each(Object.keys(LOCALES))('every teacher.pulse key resolves to a string in %s', (locale) => {
    const missing = keys.filter((k) => typeof resolve(LOCALES[locale], k) !== 'string');
    expect(missing).toEqual([]);
  });
});
