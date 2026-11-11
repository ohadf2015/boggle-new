import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherTrialEndingCard } from '@/components/teacher/TeacherTrialEndingCard';
import { teacherTrialStatus } from '@/lib/education/trial';
import { resetProOfferSession } from '@/lib/education/pro/proOfferSession';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const pro = vi.hoisted(() => ({
  hasPro: false,
  loading: false,
  known: true,
  trialUsed: false,
  accessTrialExpires: null as string | null,
  accessTrialEnded: false,
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 't1' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
const funnel = vi.hoisted(() => ({ trackTeacherProUpgradeClick: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => funnel);

const realFetch = globalThis.fetch;
const realBeacon = Object.getOwnPropertyDescriptor(navigator, 'sendBeacon');
const beacon = vi.fn(() => true);

type Cb = (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void;
let observers: Array<{ cb: Cb }> = [];
const originalIO = globalThis.IntersectionObserver;

beforeEach(() => {
  Object.assign(pro, {
    hasPro: false,
    loading: false,
    known: true,
    trialUsed: false,
    accessTrialExpires: null,
    accessTrialEnded: false,
  });
  funnel.trackTeacherProUpgradeClick.mockClear();
  beacon.mockClear();
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true, writable: true });
  globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
  resetProOfferSession();
  observers = [];
  class FakeIO {
    constructor(cb: Cb) {
      observers.push({ cb });
    }
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  if (realBeacon) Object.defineProperty(navigator, 'sendBeacon', realBeacon);
  else delete (navigator as { sendBeacon?: unknown }).sendBeacon;
  globalThis.fetch = realFetch;
  globalThis.IntersectionObserver = originalIO;
});

const posts = () =>
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    .filter(([u]) => u === '/api/education/pro-offer-impression')
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));

describe('TeacherTrialEndingCard', () => {
  it('in a live access trial: days left, keep reports for $9/mo, checkout with placement=trial_ending_card', () => {
    const ends = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    pro.accessTrialExpires = ends;
    const trial = teacherTrialStatus(ends, Date.now());
    render(<TeacherTrialEndingCard trial={trial} />);
    const card = screen.getByTestId('teacher-trial-ending-card');
    expect(card).toHaveAttribute('data-placement', 'trial_ending_card');
    expect(card).toHaveAttribute('data-offer', 'keep_after_trial');
    expect(card).toHaveTextContent('Your trial ends in 10 days');
    expect(card).toHaveTextContent('Keep class reports for $9/mo.');
    expect(card).not.toHaveTextContent('14-day');
    const cta = screen.getByTestId('teacher-trial-ending-cta');
    expect(cta).toHaveTextContent('Keep Teacher Pro after your free trial');
    expect(cta.getAttribute('href')).toBe('/en/teacher/upgrade?source=trial_ending_card');
  });

  it('an ended access trial is straight $9/mo, no second trial', () => {
    pro.accessTrialEnded = true;
    pro.accessTrialExpires = new Date(Date.now() - 60_000).toISOString();
    render(<TeacherTrialEndingCard trial={teacherTrialStatus(pro.accessTrialExpires, Date.now())} />);
    const card = screen.getByTestId('teacher-trial-ending-card');
    expect(card).toHaveAttribute('data-offer', 'paid');
    expect(card).toHaveTextContent('Your free trial has ended, continue with Teacher Pro for $9/mo');
    expect(screen.getByTestId('teacher-trial-ending-cta')).toHaveTextContent('Continue with Teacher Pro');
    expect(card).not.toHaveTextContent('14-day');
  });

  it('stays hidden for Pro teachers and while the plan is loading', () => {
    pro.accessTrialExpires = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    pro.hasPro = true;
    const { rerender } = render(<TeacherTrialEndingCard />);
    expect(screen.queryByTestId('teacher-trial-ending-card')).toBeNull();
    pro.hasPro = false;
    pro.loading = true;
    rerender(<TeacherTrialEndingCard />);
    expect(screen.queryByTestId('teacher-trial-ending-card')).toBeNull();
  });

  it('an expired trial prop wins over a future expiresAt and stays on straight $9/mo wording', () => {
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    pro.accessTrialExpires = future;
    pro.accessTrialEnded = false;
    const trial = { ...teacherTrialStatus(past, Date.now()), isExpired: true, daysLeft: 0, expiresAt: future };
    render(<TeacherTrialEndingCard trial={trial} />);
    const card = screen.getByTestId('teacher-trial-ending-card');
    expect(card).toHaveTextContent(/continue with Teacher Pro for \$9\/mo/i);
    expect(card).not.toHaveTextContent(/after your free trial/i);
  });

  it('stays visible from the Home trial prop when useTeacherPro has not yet stamped access trial fields', () => {
    const ends = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    pro.accessTrialExpires = null;
    pro.accessTrialEnded = false;
    render(<TeacherTrialEndingCard trial={teacherTrialStatus(ends, Date.now())} />);
    expect(screen.getByTestId('teacher-trial-ending-card')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/teacher/upgrade?source=trial_ending_card');
  });

  it('reports rendered on mount and viewed once half is on screen, and click with placement=trial_ending_card', () => {
    const ends = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
    pro.accessTrialExpires = ends;
    render(<TeacherTrialEndingCard trial={teacherTrialStatus(ends, Date.now())} />);
    expect(posts().map((p) => p.stage)).toEqual(['rendered']);
    expect(posts()[0]).toMatchObject({
      placement: 'trial_ending_card',
      offer: 'keep_after_trial',
      stage: 'rendered',
      locale: 'en',
    });
    act(() => observers.forEach((o) => o.cb([{ isIntersecting: true, intersectionRatio: 1 }])));
    expect(posts().map((p) => p.stage)).toEqual(['rendered', 'viewed']);
    fireEvent.click(screen.getByTestId('teacher-trial-ending-cta'));
    expect(beacon).toHaveBeenCalledWith('/api/education/pro-offer-click', expect.any(Blob));
    expect(funnel.trackTeacherProUpgradeClick).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en', placement: 'trial_ending_card' }),
    );
  });
});
