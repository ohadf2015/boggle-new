/**
 * Teacher Pro funnel — client half.
 *
 * `edu_pro_upgrade_clicked` is the one step that only the browser can see (the
 * server never learns about a click that never reached it).
 * `edu_pro_checkout_success_seen` is the teacher landing back from Polar: a
 * DIFFERENT name from the server's authoritative `edu_pro_checkout_succeeded`
 * so the two never double-count one conversion.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    register: vi.fn(),
    __loaded: true,
  },
}));

import {
  trackEduProUpgradeClicked,
  trackEduProCheckoutSuccessSeen,
  PRO_SUCCESS_SEEN_STORAGE_KEY,
} from '../proFunnelTelemetry';

describe('trackEduProUpgradeClicked', () => {
  beforeEach(() => captureMock.mockReset());

  it('Given a pricing-page click, When tracked, Then it fires edu_pro_upgrade_clicked with the source', () => {
    trackEduProUpgradeClicked({ source: 'pricing_page' });
    expect(captureMock).toHaveBeenCalledWith('edu_pro_upgrade_clicked', { source: 'pricing_page' });
  });

  it('Given PostHog throws, When tracked, Then the click handler is never broken', () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('posthog down');
    });
    expect(() => trackEduProUpgradeClicked({ source: 'pricing_page' })).not.toThrow();
  });
});

describe('trackEduProCheckoutSuccessSeen', () => {
  beforeEach(() => {
    captureMock.mockReset();
    localStorage.clear();
  });

  it('Given a first return from checkout, When tracked, Then it fires once and returns true', () => {
    expect(trackEduProCheckoutSuccessSeen(1_000)).toBe(true);
    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('edu_pro_checkout_success_seen', {});
  });

  it('Given a reload that keeps ?checkout=success, When tracked again, Then it does not fire twice', () => {
    trackEduProCheckoutSuccessSeen(1_000);
    expect(trackEduProCheckoutSuccessSeen(2_000)).toBe(false);
    expect(captureMock).toHaveBeenCalledTimes(1);
  });

  it('Given the flag is older than a day, When tracked, Then a genuine re-subscription counts again', () => {
    trackEduProCheckoutSuccessSeen(1_000);
    expect(trackEduProCheckoutSuccessSeen(1_000 + 25 * 3_600_000)).toBe(true);
    expect(captureMock).toHaveBeenCalledTimes(2);
  });

  it('Given storage throws, When tracked, Then it still fires and never throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => trackEduProCheckoutSuccessSeen(1_000)).not.toThrow();
    expect(captureMock).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('exposes the storage key it writes', () => {
    trackEduProCheckoutSuccessSeen(5_000);
    expect(localStorage.getItem(PRO_SUCCESS_SEEN_STORAGE_KEY)).toBe('5000');
  });
});

describe('trackEduProMissedHomeworkAssigned', () => {
  beforeEach(() => captureMock.mockReset());

  it('Given a homework assignment, When tracked, Then it fires with snake_case counts', async () => {
    const { trackEduProMissedHomeworkAssigned } = await import('../proFunnelTelemetry');
    trackEduProMissedHomeworkAssigned({ classroomId: 'c1', studentCount: 2, wordCount: 3, lessonCount: 1 });
    expect(captureMock).toHaveBeenCalledWith('edu_pro_missed_homework_assigned', {
      classroom_id: 'c1',
      student_count: 2,
      word_count: 3,
      lesson_count: 1,
    });
  });
});
