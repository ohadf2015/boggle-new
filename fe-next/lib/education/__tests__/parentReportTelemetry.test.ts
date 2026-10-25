import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (arg: (typeof captured)[number]) => captured.push(arg) }),
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { captureParentReportView } from '../parentReportTelemetry';

const admin = (teacherId: string, flagged: string[]) => ({
  from: (table: string) =>
    table === 'classrooms'
      ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { teacher_id: teacherId }, error: null }) }) }) }
      : { select: () => ({ in: (_c: string, ids: string[]) => ({ eq: async () => ({ data: ids.filter((i) => flagged.includes(i)).map((id) => ({ id })), error: null }) }) }) },
});

const base = { token: 'tok', classroomId: 'c1', locale: 'he' };

describe('captureParentReportView', () => {
  beforeEach(() => { captured.length = 0; });

  it('Given a parent opens the link, Then one view fires tagged with the teacher flag', async () => {
    await captureParentReportView(admin('t1', []) as never, { ...base, viewerId: null });
    expect(captured).toHaveLength(1);
    expect(captured[0].properties).toMatchObject({ classroom_id: 'c1', locale: 'he', is_test_account: false });
  });

  it('Given the class teacher previews their own link, Then no view is counted', async () => {
    await captureParentReportView(admin('t1', []) as never, { ...base, viewerId: 't1' });
    expect(captured).toHaveLength(0);
  });

  it('Given a QA teacher class, Then the view is tagged as test traffic', async () => {
    await captureParentReportView(admin('qa', ['qa']) as never, { ...base, viewerId: null });
    expect(captured[0].properties.is_test_account).toBe(true);
  });
});
