import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

let proState: Record<string, unknown>;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
vi.mock('@/hooks/useStartTeacherProTrial', () => ({ useStartTeacherProTrial: () => ({ start: vi.fn(), pending: false }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-loading-1' } }) }));
const impression = vi.fn();
vi.mock('@/lib/education/reportProCtaClick', () => ({
  reportProOfferImpression: (a: unknown) => impression(a),
  reportProOfferClick: vi.fn(),
}));
vi.mock('@/lib/education/useUpsellImpression', () => ({ useUpsellImpression: () => {} }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackTrialCtaView: vi.fn() }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));

import { HomeProCard } from '../HomeProCard';

const t = (k: string) => k;
const DAY = 24 * 60 * 60 * 1000;
// What useTeacherPro returns before /api/subscription/status lands: every teacher looks never-trialed.
const LOADING = { hasPro: false, loading: true, known: false, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false };

function card() {
  return <HomeProCard kind="trial" onDismiss={vi.fn()} trackImpression={false} language="en" t={t} />;
}

beforeEach(() => {
  try {
    window.sessionStorage.clear();
  } catch {
    /* jsdom */
  }
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HomeProCard waits for the entitlement read (dashboard offer=trial mismatch)', () => {
  it('Given the read is in flight, Then it renders nothing and reports no impression', () => {
    proState = { ...LOADING };
    render(card());
    expect(screen.queryByTestId('home-pro-card')).toBeNull();
    expect(screen.queryByText(/14-day/)).toBeNull();
    expect(impression).not.toHaveBeenCalled();
  });

  it('Given a teacher inside the free access trial, Then the first card and its rendered twin say keep_after_trial, never trial', () => {
    proState = { ...LOADING };
    const { rerender } = render(card());
    proState = { ...LOADING, loading: false, known: true, accessTrialExpires: new Date(Date.now() + 6 * DAY).toISOString() };
    rerender(card());
    expect(screen.getByTestId('home-pro-card')).toHaveAttribute('data-offer', 'keep_after_trial');
    expect(screen.queryByText(/14-day/)).toBeNull();
    const offers = impression.mock.calls.map((c) => (c[0] as { offer: string }).offer);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers).not.toContain('trial');
  });
});
