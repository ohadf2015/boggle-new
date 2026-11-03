import { describe, expect, it } from 'vitest';
import {
  ENFORCED_PRO_FEATURES,
  PLAN_TABLE_ROWS,
  PRO_COPY_PARAMS,
  fillProCopy,
} from '../proFeatures';
import { PRO_FEATURES } from '@/components/teacher/ProGate';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '../freeTierLimits';
import { TEACHER_PRO_TRIAL_DAYS } from '../pro/trialDays';
import { SCHOOL_PRICING } from '../pro/schoolPricing';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';
import { catalogueModes } from '@/components/education/ClassroomModeCatalogueData';
import { locales } from '@/lib/i18n';

describe('proFeatures: the one Pro truth', () => {
  it('lists exactly the features ProGate refuses', () => {
    expect([...ENFORCED_PRO_FEATURES].sort()).toEqual([...PRO_FEATURES].sort());
  });

  it('marks every enforced feature as Pro-only in the table, and nothing else', () => {
    const proOnly = PLAN_TABLE_ROWS.filter((r) => r.free === false && r.pro === true);
    for (const row of proOnly) expect(row.gate, `${row.id} is Pro-only but names no ProGate feature`).toBeDefined();
    const gates = PLAN_TABLE_ROWS.flatMap((r) => (r.gate ? [r.gate] : []));
    for (const f of ENFORCED_PRO_FEATURES) expect(gates, `${f} missing from the table`).toContain(f);
  });

  it('names the three free limits from freeTierLimits', () => {
    const byId = Object.fromEntries(PLAN_TABLE_ROWS.map((r) => [r.id, r]));
    expect(byId.classes).toMatchObject({ free: FREE_TIER_LIMITS.classes, pro: null });
    expect(byId.assignments).toMatchObject({ free: FREE_TIER_LIMITS.assignmentsPerClass, pro: null });
    expect(byId.students.free).toBe(FREE_TIER_LIMITS.studentsPerClass);
  });

  it('never sells unlimited students: the live room cap binds on every plan', () => {
    const students = PLAN_TABLE_ROWS.find((r) => r.id === 'students')!;
    expect(students.pro).not.toBeNull();
    expect(students.pro).toBeLessThanOrEqual(MAX_PLAYERS_PER_ROOM);
  });

  it('gives every mode to Free, counted from the catalogue', () => {
    const modes = PLAN_TABLE_ROWS.find((r) => r.id === 'modes')!;
    expect(modes.free).toBe(catalogueModes().length);
    expect(modes.pro).toBe(catalogueModes().length);
    expect(PRO_COPY_PARAMS.modes).toBe(catalogueModes().length);
  });

  it('has no duels row (0 duels ever played)', () => {
    expect(PLAN_TABLE_ROWS.map((r) => r.id)).not.toContain('duels');
  });

  it('interpolates prices and caps from the constants', () => {
    expect(PRO_COPY_PARAMS).toMatchObject({
      price: `$${TEACHER_PRO_PRICE_USD}`,
      days: TEACHER_PRO_TRIAL_DAYS,
      classes: FREE_TIER_LIMITS.classes,
      students: FREE_TIER_LIMITS.studentsPerClass,
      assignments: FREE_TIER_LIMITS.assignmentsPerClass,
      languages: locales.length,
      schoolPrice: `$${SCHOOL_PRICING.perTeacherYearUsd}`,
      schoolMin: SCHOOL_PRICING.minTeachers,
    });
    expect(fillProCopy('{price}/mo, {days} days, {classes}x{students}, {modes} modes, {unknown}')).toBe(
      `$${TEACHER_PRO_PRICE_USD}/mo, ${TEACHER_PRO_TRIAL_DAYS} days, ${FREE_TIER_LIMITS.classes}x${FREE_TIER_LIMITS.studentsPerClass}, ${catalogueModes().length} modes, {unknown}`,
    );
  });
});

describe('compare-page strip table', () => {
  it('reads every cell from the plan table, in all six locales', async () => {
    const { teacherProCompareTable } = await import('@/components/education/TeacherProCompareCheckoutStrip');
    for (const locale of locales) {
      const { rows, copy } = teacherProCompareTable(locale);
      for (const row of rows) {
        const source = PLAN_TABLE_ROWS.find((r) => r.id === row.id)!;
        expect([row.free, row.pro]).toEqual([source.free, source.pro]);
        expect(row.label.length, `${locale} ${row.id} has no label`).toBeGreaterThan(0);
      }
      expect(copy.pill.length).toBeGreaterThan(0);
      expect(rows.find((r) => r.id === 'students')!.pro).toBe(FREE_TIER_LIMITS.studentsPerClass);
    }
  });
});
