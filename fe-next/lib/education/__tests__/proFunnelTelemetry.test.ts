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

const growthMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => growthMock(...args),
}));

import {
  trackEduProUpgradeClicked,
  trackEduProCheckoutSuccessSeen,
  trackTrialCtaView,
  trackTrialCtaTap,
  PRO_SUCCESS_SEEN_STORAGE_KEY,
} from '../proFunnelTelemetry';

describe('trackEduProUpgradeClicked', () => {
  beforeEach(() => captureMock.mockReset());

  it('Given a pricing-page click, When tracked, Then it fires edu_pro_upgrade_clicked with the source', () => {
    trackEduProUpgradeClicked({ source: 'pricing_page' });
    expect(captureMock).toHaveBeenCalledWith('edu_pro_upgrade_clicked', { source: 'pricing_page' });
  });

  it('Given a dashboard trial CTA, When tracked, Then the source distinguishes lifecycle from expired', () => {
    trackEduProUpgradeClicked({ source: 'dashboard_trial_lifecycle' });
    trackEduProUpgradeClicked({ source: 'dashboard_trial_ended' });
    expect(captureMock).toHaveBeenCalledWith('edu_pro_upgrade_clicked', {
      source: 'dashboard_trial_lifecycle',
    });
    expect(captureMock).toHaveBeenCalledWith('edu_pro_upgrade_clicked', {
      source: 'dashboard_trial_ended',
    });
  });

  it('Given a paid upgrade click, When tracked, Then checkout_open is also fired for the conversion funnel', () => {
    trackEduProUpgradeClicked({ source: 'dashboard_trial_lifecycle' });
    expect(captureMock).toHaveBeenCalledWith('checkout_open', {
      source: 'dashboard_trial_lifecycle',
      product: 'teacher_pro',
    });
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

describe('trial CTA funnel events', () => {
  beforeEach(() => captureMock.mockReset());

  it('Given the HQ trial banner mounts, When viewed, Then it fires trial_cta_view', () => {
    trackTrialCtaView({ source: 'dashboard_trial_offer' });
    expect(captureMock).toHaveBeenCalledWith('trial_cta_view', {
      source: 'dashboard_trial_offer',
      product: 'teacher_pro',
    });
  });

  it('Given a trial CTA tap, When tracked, Then it fires trial_cta_tap with the surface', () => {
    trackTrialCtaTap({ source: 'upgrade_page' });
    expect(captureMock).toHaveBeenCalledWith('trial_cta_tap', {
      source: 'upgrade_page',
      product: 'teacher_pro',
    });
  });

  it('Given PostHog throws, When a trial CTA is tracked, Then it never throws', () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('posthog down');
    });
    expect(() => trackTrialCtaView({ source: 'dashboard_trial_offer' })).not.toThrow();
    captureMock.mockImplementationOnce(() => {
      throw new Error('posthog down');
    });
    expect(() => trackTrialCtaTap({ source: 'dashboard_trial_offer' })).not.toThrow();
  });
});

describe('Growth Radar mirror (trackGrowthEvent)', () => {
  beforeEach(() => {
    captureMock.mockReset();
    growthMock.mockReset();
    localStorage.clear();
  });

  it('Given each client funnel step, When tracked, Then trackGrowthEvent gets the same name and source props', () => {
    trackTrialCtaView({ source: 'dashboard_trial_offer' });
    trackTrialCtaTap({ source: 'upgrade_page' });
    trackEduProUpgradeClicked({ source: 'pricing_page' });
    trackEduProCheckoutSuccessSeen(1_000);

    expect(growthMock.mock.calls).toEqual([
      ['trial_cta_view', { source: 'dashboard_trial_offer', product: 'teacher_pro' }],
      ['trial_cta_tap', { source: 'upgrade_page', product: 'teacher_pro' }],
      ['edu_pro_upgrade_clicked', { source: 'pricing_page' }],
      ['edu_pro_checkout_success_seen', {}],
    ]);
    // PostHog bare names unchanged
    expect(captureMock.mock.calls.map((c) => c[0])).toEqual([
      'trial_cta_view',
      'trial_cta_tap',
      'edu_pro_upgrade_clicked',
      'checkout_open',
      'edu_pro_checkout_success_seen',
    ]);
  });

  it('Given a deduped success return, When tracked again, Then the mirror is deduped too', () => {
    trackEduProCheckoutSuccessSeen(1_000);
    trackEduProCheckoutSuccessSeen(2_000);
    expect(growthMock).toHaveBeenCalledTimes(1);
  });

  it('Given trackGrowthEvent throws, When a step is tracked, Then the click is never blocked and PostHog still fires', () => {
    growthMock.mockImplementation(() => {
      throw new Error('growth down');
    });
    expect(() => trackEduProUpgradeClicked({ source: 'dashboard_trial_ended' })).not.toThrow();
    expect(() => trackTrialCtaTap({ source: 'activation_checklist' })).not.toThrow();
    expect(captureMock).toHaveBeenCalledWith('edu_pro_upgrade_clicked', { source: 'dashboard_trial_ended' });
  });

  it('Given PostHog throws, When a step is tracked, Then Growth Radar still gets it', () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('posthog down');
    });
    trackTrialCtaView({ source: 'upgrade_page' });
    expect(growthMock).toHaveBeenCalledWith('trial_cta_view', { source: 'upgrade_page', product: 'teacher_pro' });
  });
});
