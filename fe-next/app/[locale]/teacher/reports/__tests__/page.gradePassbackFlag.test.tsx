import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../PageClient', () => ({ default: () => null }));
vi.mock('@/lib/seo/generatePageMetadata', () => ({ generatePageMetadata: vi.fn() }));

import TeacherReportsPage from '../page';

describe('reports page: one runtime flag drives the grade passback UI and its routes', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('passes the server flag (GC_GRADE_PASSBACK_ENABLED) to the client when on', () => {
    vi.stubEnv('GC_GRADE_PASSBACK_ENABLED', 'true');
    expect(TeacherReportsPage().props.gradePassbackEnabled).toBe(true);
  });

  it('passes false when the server flag is off, whatever a build-time variable says', () => {
    vi.stubEnv('GC_GRADE_PASSBACK_ENABLED', '');
    vi.stubEnv('NEXT_PUBLIC_GC_GRADE_PASSBACK', 'true');
    expect(TeacherReportsPage().props.gradePassbackEnabled).toBe(false);
  });
});
