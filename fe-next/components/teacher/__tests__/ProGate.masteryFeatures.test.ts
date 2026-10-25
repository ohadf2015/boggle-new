import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PRO_FEATURES } from '../ProGate';
import { getTierConfig } from '@/lib/education/tierConfig';
import { PLAN_MATRIX_ROWS } from '@/lib/education/planMatrix';

const ROOT = join(__dirname, '../../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Teacher Pro: per-word mastery and missed-words practice', () => {
  it('names both features in the enforcement list', () => {
    expect(PRO_FEATURES).toContain('mastery');
    expect(PRO_FEATURES).toContain('missedPractice');
  });

  it('refuses both on the server, not just in the UI', () => {
    for (const route of [
      'app/api/education/classroom/[id]/word-mastery/route.ts',
      'app/api/education/classroom/[id]/missed-practice/route.ts',
    ]) {
      const src = read(route);
      // The entitlement is paid Pro OR a live access trial; the helper is where `has_pro` is read.
      expect(src, route).toMatch(/requireTeacherPro|checkTeacherSubscription[\s\S]*teacherHasProAccess/);
    }
    const gate = read('lib/education/pro/requireTeacherPro.ts');
    expect(gate).toContain('checkTeacherSubscription');
    expect(gate).toContain('teacherHasProAccess');
    expect(read('lib/education/accessTrialServer.ts')).toContain('has_pro');
  });

  it('sells both on the Pro tier config and the plan matrix', () => {
    const features = getTierConfig('pro').features.map((f) => f.toLowerCase());
    expect(features.some((f) => f.startsWith('mastery'))).toBe(true);
    expect(features.some((f) => f.startsWith('missed'))).toBe(true);
    const matrix = Object.fromEntries(PLAN_MATRIX_ROWS.map((r) => [r.key, r]));
    expect(matrix.mastery).toMatchObject({ free: false, pro: true });
    expect(matrix.missedPractice).toMatchObject({ free: false, pro: true });
  });

  it('advertises both in the upgrade page Pro column', () => {
    const src = read('app/[locale]/teacher/upgrade/PageClient.tsx');
    const pro = src.match(/const proFeatures = \[([\s\S]*?)\];/);
    expect(pro).not.toBeNull();
    expect(pro![0]).toContain('eduPro.upgrade.featureMastery');
    expect(pro![0]).toContain('eduPro.upgrade.featureMissedPractice');
  });
});
