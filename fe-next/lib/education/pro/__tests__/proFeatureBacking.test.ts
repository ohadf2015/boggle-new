import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PLAN_MATRIX_ROWS } from '@/lib/education/planMatrix';
import { PRO_FEATURES } from '@/components/teacher/ProGate';
import { PRO_FEATURE_BACKING, PRO_FEATURES_WITHOUT_SERVER_GATE, PRO_FEATURES_GATED_ON_SOCKET } from '../proFeatureBacking';

const ROOT = join(__dirname, '../../../..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const matrixProRows = PLAN_MATRIX_ROWS.filter((r) => r.free !== r.pro).map((r) => r.key);
const sold = [...new Set([...matrixProRows, ...PRO_FEATURES])];

describe('every Pro feature we sell is refused to a free teacher on the server', () => {
  it('covers every matrix Pro row and every ProGate lock, with no silent gaps', () => {
    const accounted = [...Object.keys(PRO_FEATURE_BACKING), ...Object.keys(PRO_FEATURES_WITHOUT_SERVER_GATE), ...Object.keys(PRO_FEATURES_GATED_ON_SOCKET)];
    expect(accounted).toEqual(expect.arrayContaining(sold));
  });

  it('backs the reports page actions a free teacher could otherwise reach: export, grade passback, parent links', () => {
    expect(Object.keys(PRO_FEATURE_BACKING)).toEqual(
      expect.arrayContaining(['reports', 'gradePassback', 'parentReport', 'parentLinks']),
    );
  });

  it('backs the analytics page with the class dashboard route its dashboard reads, and keeps the per-student drill-down', () => {
    expect(PRO_FEATURE_BACKING.analytics.route).toBe('app/api/education/classroom/[id]/analytics/route.ts');
    expect(read(PRO_FEATURE_BACKING.analytics.ui)).toContain('useProClassAnalytics');
    expect(PRO_FEATURE_BACKING.studentInsights.route).toBe('app/api/education/classroom/[id]/members/[studentId]/insights/route.ts');
  });

  it('leaves no lock enforced in the UI alone', () => {
    expect(Object.keys(PRO_FEATURES_WITHOUT_SERVER_GATE)).toEqual([]);
  });

  it.each(Object.entries(PRO_FEATURES_GATED_ON_SOCKET))('%s: its socket handler checks Pro and a test refuses a free teacher', (_key, b) => {
    expect(read(b.handler)).toContain(b.guard);
    expect(read(b.test)).toContain('refuses a free teacher');
  });

  it.each(Object.entries(PRO_FEATURE_BACKING))('%s: its route exists and calls the plan guard', (_key, backing) => {
    expect(existsSync(join(ROOT, backing.route)), backing.route).toBe(true);
    expect(read(backing.route)).toContain(backing.guard);
  });

  it.each(Object.entries(PRO_FEATURE_BACKING))('%s: a route test proves a free teacher is refused', (_key, backing) => {
    const { file, name, status } = backing.refusal;
    expect(existsSync(join(ROOT, file)), file).toBe(true);
    const source = read(file);
    expect(source).toContain(name);
    expect(source).toContain(`toBe(${status})`);
  });

  it.each(Object.entries(PRO_FEATURE_BACKING))('%s: its UI exists and is at most 2 taps from HQ', (_key, backing) => {
    expect(existsSync(join(ROOT, backing.ui)), backing.ui).toBe(true);
    expect(backing.tapsFromHq).toBeLessThanOrEqual(2);
  });
});
