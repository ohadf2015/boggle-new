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

  describe('class insight', () => {
    const tp = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

    it('Given games this week in the class, Then the title is the specific line with that count', () => {
      render(<DashboardProOfferCard language="en" t={tp} insight={{ classroomId: 'c1', className: '5B', weekGames: 3 }} />);
      const title = screen.getByRole('heading');
      expect(title).toHaveTextContent('teacher.weekInsight.homeTitleGames');
      expect(title).toHaveTextContent('"count":3');
    });

    it.each([0, undefined])('Given no games this week (%s), Then the title stays the generic offer title', (weekGames) => {
      render(<DashboardProOfferCard language="en" t={tp} insight={{ classroomId: 'c1', className: '5B', weekGames }} />);
      expect(screen.getByRole('heading').textContent).not.toContain('homeTitleGames');
    });

    it('Given a class that has played, Then a secondary link opens its insight page, below the checkout button', () => {
      render(<DashboardProOfferCard language="he" t={tp} insight={{ classroomId: 'c1', className: '5B', weekGames: 2 }} />);
      const link = screen.getByTestId('dashboard-class-insight-link');
      expect(link).toHaveAttribute('href', '/he/teacher/classroom/c1/analytics');
      expect(link).toHaveTextContent('teacher.weekInsight.homeCta');
      expect(screen.getByTestId('dashboard-pro-offer-cta').compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('Given no played class, Then there is no insight link', () => {
      render(<DashboardProOfferCard language="en" t={tp} />);
      expect(screen.queryByTestId('dashboard-class-insight-link')).not.toBeInTheDocument();
    });

    it('Given a played class, Then the checkout button still starts the trial and the link does not', () => {
      render(<DashboardProOfferCard language="en" t={tp} insight={{ classroomId: 'c1', className: '5B', weekGames: 2 }} />);
      fireEvent.click(screen.getByTestId('dashboard-class-insight-link'));
      expect(start).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('dashboard-pro-offer-cta'));
      expect(start).toHaveBeenCalledTimes(1);
    });

    it('Given the link is tapped, Then the home_class_insight click is reported', () => {
      render(<DashboardProOfferCard language="en" t={tp} insight={{ classroomId: 'c1', className: '5B', weekGames: 2 }} />);
      fireEvent.click(screen.getByTestId('dashboard-class-insight-link'));
      expect(navigator.sendBeacon).toHaveBeenCalledWith('/api/education/pro-offer-click', expect.anything());
    });
  });
});
