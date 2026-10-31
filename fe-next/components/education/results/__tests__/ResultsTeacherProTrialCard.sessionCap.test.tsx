import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResultsTeacherProTrialCard } from '@/components/education/results/ResultsTeacherProTrialCard';
import { proCopyVariant } from '@/lib/education/pro/proCopyExperiment';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const pro = vi.hoisted(() => ({ hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null as string | null, accessTrialEnded: false }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackTeacherProUpgradeClick: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-7' } }) }));

const realFetch = globalThis.fetch;
const beacon = vi.fn((_u: string, _d?: BodyInit | null) => false);
const posts = (path: string) =>
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    .filter(([u]) => u === path)
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));

beforeEach(() => {
  Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false });
  window.localStorage.clear();
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true, writable: true });
  globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('Teacher Pro offer: once per browser session per teacher', () => {
  it('re-renders keep the full card and send rendered once', () => {
    const { rerender } = render(<ResultsTeacherProTrialCard language="en" />);
    for (let i = 0; i < 5; i++) rerender(<ResultsTeacherProTrialCard language="en" />);
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toBeInTheDocument();
    expect(posts('/api/education/pro-offer-impression').filter((p) => p.stage === 'rendered')).toHaveLength(1);
  });

  it('the next round (a remount) collapses to the one-line link, and rendered is not re-sent for the card', () => {
    const first = render(<ResultsTeacherProTrialCard language="en" />);
    first.unmount();
    render(<ResultsTeacherProTrialCard language="en" />);
    expect(screen.queryByTestId('results-teacher-pro-trial-card')).toBeNull();
    const link = screen.getByTestId('teacher-pro-offer-compact');
    expect(link).toHaveTextContent('Start your 14-day Teacher Pro trial');
    expect(link).toHaveAttribute('href', '/en/teacher/upgrade?source=classroom_results');
    const rendered = posts('/api/education/pro-offer-impression').filter((p) => p.stage === 'rendered');
    expect(rendered).toEqual([
      { placement: 'classroom_results', locale: 'en', cta: 'teacher_pro_trial', offer: 'trial', stage: 'rendered' },
      { placement: 'classroom_results', locale: 'en', cta: 'teacher_pro_trial', offer: 'trial', format: 'link', stage: 'rendered' },
    ]);
  });

  it('the cap is shared across placements: class-ready first, then results is a link', () => {
    const a = render(<ResultsTeacherProTrialCard language="sv" placement="class_created" />);
    expect(screen.getByTestId('results-teacher-pro-trial-card')).toHaveAttribute('data-placement', 'class_created');
    a.unmount();
    render(<ResultsTeacherProTrialCard language="sv" />);
    expect(screen.getByTestId('teacher-pro-offer-compact')).toHaveAttribute('data-placement', 'classroom_results');
  });

  it('a third and fourth mount send no further rendered events for the link', () => {
    for (let i = 0; i < 4; i++) render(<ResultsTeacherProTrialCard language="en" />).unmount();
    const rendered = posts('/api/education/pro-offer-impression').filter((p) => p.stage === 'rendered');
    expect(rendered.map((p) => p.format ?? 'card')).toEqual(['card', 'link']);
  });

  it('the link keeps the single-trial wording and the A/B bucket, and its tap is a clicked event with format=link', () => {
    pro.accessTrialEnded = true;
    render(<ResultsTeacherProTrialCard language="en" />).unmount();
    render(<ResultsTeacherProTrialCard language="en" />);
    const link = screen.getByTestId('teacher-pro-offer-compact');
    expect(link).toHaveTextContent('Continue with Teacher Pro');
    expect(link).not.toHaveTextContent(/14-day|trial/i);
    expect(link).toHaveAttribute('data-variant', proCopyVariant('teacher-7'));
    fireEvent.click(link);
    expect(posts('/api/education/pro-offer-click')).toEqual([
      { placement: 'classroom_results', locale: 'en', cta: 'teacher_pro', offer: 'paid', format: 'link' },
    ]);
  });
});
