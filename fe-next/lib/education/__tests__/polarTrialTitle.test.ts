import { describe, it, expect } from 'vitest';
import { polarTrialDaysTitle } from '@/lib/education/polarTrial';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

describe('polarTrialDaysTitle', () => {
  it('given the days left, when a trial banner titles itself, then every banner says it the same way', () => {
    expect(polarTrialDaysTitle(t, null)).toBe('teacher.plan.trialActive');
    expect(polarTrialDaysTitle(t, 0)).toBe('teacher.subscription.trialLifecycleTitleToday');
    expect(polarTrialDaysTitle(t, -2)).toBe('teacher.subscription.trialLifecycleTitleToday');
    expect(polarTrialDaysTitle(t, 1)).toBe('teacher.subscription.trialLifecycleTitleOne');
    expect(polarTrialDaysTitle(t, 9)).toBe('teacher.subscription.trialLifecycleTitle:{"count":"9"}');
  });
});
