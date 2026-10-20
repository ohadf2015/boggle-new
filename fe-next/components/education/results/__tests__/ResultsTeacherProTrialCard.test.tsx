import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsTeacherProTrialCard } from '@/components/education/results/ResultsTeacherProTrialCard';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const pro = vi.hoisted(() => ({ hasPro: false, loading: false, known: true, trialUsed: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
const growth = vi.hoisted(() => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/utils/growthTracking', () => growth);
const funnel = vi.hoisted(() => ({ trackTeacherProUpgradeClick: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => funnel);

describe('ResultsTeacherProTrialCard', () => {
  beforeEach(() => {
    Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false });
    growth.trackGrowthEvent.mockClear();
    funnel.trackTeacherProUpgradeClick.mockClear();
  });

  it('offers the 14-day trial and a school quote link to a free teacher', () => {
    render(<ResultsTeacherProTrialCard language="en" />);
    const cta = screen.getByTestId('results-teacher-pro-trial-cta');
    expect(cta).toHaveTextContent('Start your 14-day Teacher Pro trial');
    expect(cta.getAttribute('href')).toMatch(/^\/en\/teacher\/upgrade/);
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toHaveTextContent('$9/mo');
    const quote = screen.getByTestId('results-school-quote-link');
    expect(quote).toHaveTextContent('Get a school quote');
    expect(quote.getAttribute('href')).toMatch(/^\/en\/education\/for-schools/);
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toHaveTextContent('$49 per teacher / year for 5+ teachers');
  });

  it('fires the upgrade click with placement classroom_results on tap (impressions: see the viewport-gated suite)', () => {
    render(<ResultsTeacherProTrialCard language="he" />);
    fireEvent.click(screen.getByTestId('results-teacher-pro-trial-cta'));
    expect(funnel.trackTeacherProUpgradeClick).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'he', placement: 'classroom_results' }),
    );
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toHaveAttribute('dir', 'rtl');
  });

  it('stays hidden for Pro teachers and while the entitlement loads', () => {
    pro.hasPro = true;
    const { rerender } = render(<ResultsTeacherProTrialCard language="en" />);
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
    pro.hasPro = false;
    pro.loading = true;
    rerender(<ResultsTeacherProTrialCard language="en" />);
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
    expect(growth.trackGrowthEvent).not.toHaveBeenCalled();
  });

  it('falls back to the upgrade label once the trial is used', () => {
    pro.trialUsed = true;
    render(<ResultsTeacherProTrialCard language="en" />);
    expect(screen.getByTestId('results-teacher-pro-trial-cta')).toHaveTextContent('Upgrade to Teacher Pro');
  });

  it('has complete copy for every supported locale', () => {
    for (const l of ['en', 'he', 'sv', 'ja', 'es', 'ru']) {
      const c = resultsTrialCopy(l);
      for (const v of Object.values(c)) {
        expect(v).not.toMatch(/\{\w+\}/);
        expect(v.length).toBeGreaterThan(0);
      }
      expect(c.trialCta).toContain('14');
    }
  });
});

describe('ResultsTeacherProTrialCard impressions are viewport-gated', () => {
  type Cb = (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void;
  let observers: Array<{ cb: Cb; targets: Element[] }> = [];
  const original = globalThis.IntersectionObserver;

  beforeEach(() => {
    Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false });
    growth.trackGrowthEvent.mockClear();
    observers = [];
    class FakeIO {
      private o: { cb: Cb; targets: Element[] };
      constructor(cb: Cb) {
        this.o = { cb, targets: [] };
        observers.push(this.o);
      }
      observe(el: Element) {
        this.o.targets.push(el);
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
  });
  afterEach(() => {
    globalThis.IntersectionObserver = original;
  });

  const impressions = () =>
    growth.trackGrowthEvent.mock.calls.filter(([e]) => e === 'education_upsell_impression').map(([, d]) => (d as { cta: string }).cta);

  it('does not count an impression while the card is hidden or off screen (display:none on a short projector, below the fold on a phone)', () => {
    render(<ResultsTeacherProTrialCard language="en" />);
    const card = screen.getByTestId('results-teacher-pro-trial-card');
    expect(observers.length).toBe(2);
    expect(observers.every((o) => o.targets.includes(card))).toBe(true);
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: false, intersectionRatio: 0 }])));
    expect(impressions()).toEqual([]);
  });

  it('counts trial + school impressions once, when half the card is on screen', () => {
    render(<ResultsTeacherProTrialCard language="he" />);
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 0.6 }])));
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 1 }])));
    expect(impressions().sort()).toEqual(['district_upsell', 'teacher_pro_trial']);
    expect(growth.trackGrowthEvent).toHaveBeenCalledWith(
      'education_upsell_impression',
      expect.objectContaining({ cta: 'teacher_pro_trial', placement: 'classroom_results', locale: 'he' }),
    );
    expect(growth.trackGrowthEvent).toHaveBeenCalledWith(
      'education_upsell_impression',
      expect.objectContaining({ cta: 'district_upsell', placement: 'classroom_results', locale: 'he' }),
    );
  });

  it('attaches the observer only after the entitlement read settles', () => {
    pro.loading = true;
    const { rerender } = render(<ResultsTeacherProTrialCard language="en" />);
    expect(observers.length).toBe(0);
    pro.loading = false;
    rerender(<ResultsTeacherProTrialCard language="en" />);
    expect(observers.length).toBe(2);
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 1 }])));
    expect(impressions().length).toBe(2);
  });
});
