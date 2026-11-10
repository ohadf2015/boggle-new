import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/education/reportProCtaClick', () => ({ reportProOfferImpression: vi.fn(), reportProOfferClick: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false }),
}));

import { reportProOfferClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { ProInsightLink } from '../ProInsightLink';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(el: Element) {
      this.cb([{ isIntersecting: true, intersectionRatio: 1, target: el } as IntersectionObserverEntry], this as never);
    }
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('ProInsightLink', () => {
  it('given it is on screen, when rendered, then one viewed impression is sent under its own surface', () => {
    render(<ProInsightLink placement="results_hardest_words" language="en" label="See the full report" proLabel="Pro" />);
    expect(reportProOfferImpression).toHaveBeenCalledTimes(1);
    expect(vi.mocked(reportProOfferImpression).mock.calls[0][0]).toMatchObject({ placement: 'results_hardest_words', stage: 'viewed', offer: 'trial' });
  });

  it('given a tap, when clicked, then the click is sent with the same surface and the link carries it as source', () => {
    render(<ProInsightLink placement="analytics_week_insight" language="he" label="See the full report" proLabel="Pro" />);
    const link = screen.getByRole('link', { name: /See the full report/ });
    expect(link.getAttribute('href')).toBe('/he/teacher/upgrade?source=analytics_week_insight');
    fireEvent.click(link);
    expect(vi.mocked(reportProOfferClick).mock.calls[0][0]).toMatchObject({ placement: 'analytics_week_insight', locale: 'he' });
  });

  it('given it is inactive (inside a closed panel), when rendered, then no impression is sent', () => {
    render(<ProInsightLink placement="home_class_insight" language="en" label="x" proLabel="Pro" active={false} />);
    expect(reportProOfferImpression).not.toHaveBeenCalled();
  });
});
