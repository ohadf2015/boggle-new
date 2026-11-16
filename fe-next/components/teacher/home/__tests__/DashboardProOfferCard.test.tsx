import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardProOfferCard } from '../DashboardProOfferCard';
import { resetProOfferSession } from '@/lib/education/pro/proOfferSession';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
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
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));
const start = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useStartTeacherProTrial', () => ({
  useStartTeacherProTrial: () => ({ pending: false, start }),
}));

const t = (key: string) => key;
const posts = () =>
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    .filter(([u]) => u === '/api/education/pro-offer-impression')
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));

beforeEach(() => {
  resetProOfferSession();
  start.mockClear();
  Object.assign(pro, { hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false });
  globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, writable: true, value: vi.fn(() => true) });
});
afterEach(() => {
  resetProOfferSession();
});

describe('DashboardProOfferCard', () => {
  it('mounts the Teacher Pro offer and reports edu_pro_offer_rendered with placement dashboard', () => {
    render(<DashboardProOfferCard language="en" t={t} />);
    expect(screen.getByTestId('dashboard-pro-offer')).toBeInTheDocument();
    expect(posts()).toEqual([
      expect.objectContaining({ placement: 'dashboard', stage: 'rendered', locale: 'en' }),
    ]);
    expect(posts()[0].stage).toBe('rendered');
  });

  it('starts Polar checkout from the card CTA instead of leaving the teacher on an analytics link', () => {
    render(<DashboardProOfferCard language="en" t={t} />);
    fireEvent.click(screen.getByTestId('dashboard-pro-offer-cta'));
    expect(start).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link', { name: /analytics/i })).not.toBeInTheDocument();
  });
});
