import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FREE_TIER_LIMITS, PRO_LIMITS } from '../freeTierLimits';
import { PLAN_MATRIX_ROWS } from '../planMatrix';
import { PLAN_TABLE_ROWS } from '../proFeatures';
import { getTierConfig } from '../tierConfig';
import { PRE_CHECKOUT_INCLUDED_KEYS } from '@/components/teacher/pro/PreCheckoutExplainer';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';

const ROOT = join(__dirname, '..', '..', '..');
const DERIVING_FILES = [
  'lib/education/planMatrix.ts',
  'lib/education/proFeatures.ts',
  'lib/education/tierConfig.ts',
  'components/teacher/pro/PreCheckoutExplainer.tsx',
  'components/teacher/pro/UpgradePlanCards.tsx',
  'app/[locale]/teacher/upgrade/PageClient.tsx',
];
const LIMIT_VALUES = [FREE_TIER_LIMITS.classes, FREE_TIER_LIMITS.studentsPerClass, FREE_TIER_LIMITS.assignmentsPerClass, MAX_PLAYERS_PER_ROOM];

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .split('\n')
    .filter((line) => !/className|strokeWidth|\bcn\(/.test(line))
    .join('\n');

describe('plan limits have one source', () => {
  it.each(DERIVING_FILES)('%s repeats no limit as a literal', (file) => {
    const code = stripComments(readFileSync(join(ROOT, file), 'utf8'));
    for (const n of new Set(LIMIT_VALUES)) {
      expect(code, `${file} hardcodes ${n}`).not.toMatch(new RegExp(`(?<![\\w.$#-])${n}(?![\\w.%])`));
    }
  });

  it('tierConfig, matrix and plan table agree with freeTierLimits', () => {
    const free = getTierConfig('free');
    expect(free.classes_limit).toBe(FREE_TIER_LIMITS.classes);
    expect(free.students_limit_per_class).toBe(FREE_TIER_LIMITS.studentsPerClass);
    expect(getTierConfig('pro').classes_limit).toBe(PRO_LIMITS.classes);
    const m = Object.fromEntries(PLAN_MATRIX_ROWS.map((r) => [r.key, r]));
    expect(m.classes.pro).toBe(PRO_LIMITS.classes);
    expect(m.assignmentsPerClass.pro).toBe(PRO_LIMITS.assignmentsPerClass);
    expect(m.studentsPerClass.pro).toBe(PRO_LIMITS.studentsPerLiveGame);
    const t = Object.fromEntries(PLAN_TABLE_ROWS.map((r) => [r.id, r]));
    expect(t.students.pro).toBe(PRO_LIMITS.studentsPerLiveGame);
    expect(t.classes.pro).toBe(PRO_LIMITS.classes);
  });

  it('Pro student figure is the live room cap, never unlimited', () => {
    expect(PRO_LIMITS.studentsPerLiveGame).toBe(MAX_PLAYERS_PER_ROOM);
  });
});

describe('Pro pitch lists only what Pro adds', () => {
  const PROHIBITED = /unlimitedStudents|studentLimitPro|rosterPro|noAds|adFree/i;

  it('checkout explainer has no ads or unlimited-students claim', () => {
    expect(PRE_CHECKOUT_INCLUDED_KEYS.filter((k) => PROHIBITED.test(k))).toEqual([]);
  });

  it('tierConfig Pro bullets claim neither ads removal nor unlimited students', () => {
    const bad = getTierConfig('pro').features.filter((f) => /unlimited students|\bads?\b|advertis/i.test(f));
    expect(bad).toEqual([]);
  });

  it('any matrix row that is free for everyone is not a Pro-only pitch row', () => {
    for (const row of [...PLAN_MATRIX_ROWS, ...PLAN_TABLE_ROWS]) {
      const key = 'key' in row ? row.key : row.id;
      if (/noAds/i.test(key)) expect(row.free, `${key} free`).toBe(true);
    }
  });
});
