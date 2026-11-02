import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: mockFetch }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));
vi.mock('@/lib/education/reportProCtaClick', () => ({
  reportProCtaClick: vi.fn(),
  reportProOfferClick: vi.fn(),
  reportProOfferImpression: vi.fn(),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { EndedCodeTriesNotice, type LateJoinProState } from '../EndedCodeTriesNotice';

const DAY = 24 * 60 * 60 * 1000;
const free = (over: Partial<LateJoinProState> = {}): LateJoinProState => ({
  hasPro: false,
  loading: false,
  known: true,
  trialUsed: false,
  accessTrialExpires: null,
  accessTrialEnded: false,
  ...over,
});
const tries = (count: number) => mockFetch.mockResolvedValue({ ok: true, json: async () => ({ count }) });

describe('<EndedCodeTriesNotice> — students who tried to join after the game ended', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given no late students, Then nothing shows', async () => {
    tries(0);
    const { container } = render(<EndedCodeTriesNotice classroomId="c1" pro={free()} />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('Given 3 late students and a teacher who never trialed, Then the note counts them and the Pro line offers the 14-day trial', async () => {
    tries(3);
    render(<EndedCodeTriesNotice classroomId="c1" pro={free()} />);
    expect(await screen.findByTestId('hq-ended-code-tries-text')).toHaveTextContent('academy.hq.endedCodeTries:{"count":3}');
    expect(screen.getByText('academy.hq.lateJoinProLine')).toBeInTheDocument();
    expect(screen.getByTestId('hq-late-join-pro')).toHaveAttribute('data-offer', 'trial');
    const link = screen.getByTestId('teacher-pro-offer-compact');
    expect(link).toHaveAttribute('href', '/en/teacher/upgrade?source=late_join_notice');
    expect(link.textContent).toMatch(/14/);
  });

  it('Given a teacher inside the free access trial, Then the Pro line says keep Teacher Pro after the trial (no second trial)', async () => {
    tries(2);
    render(<EndedCodeTriesNotice classroomId="c1" pro={free({ accessTrialExpires: new Date(Date.now() + 5 * DAY).toISOString() })} />);
    expect(await screen.findByTestId('hq-late-join-pro')).toHaveAttribute('data-offer', 'keep_after_trial');
    expect(screen.getByTestId('teacher-pro-offer-compact').textContent).toMatch(/Keep Teacher Pro after my trial/);
  });

  it('Given a teacher whose access trial ended, Then the Pro line is the straight $9/mo ask with no trial', async () => {
    tries(2);
    render(<EndedCodeTriesNotice classroomId="c1" pro={free({ accessTrialEnded: true, accessTrialExpires: new Date(Date.now() - DAY).toISOString() })} />);
    expect(await screen.findByTestId('hq-late-join-pro')).toHaveAttribute('data-offer', 'paid');
    const label = screen.getByTestId('teacher-pro-offer-compact').textContent ?? '';
    expect(label).not.toMatch(/trial/i);
    expect(screen.getByTestId('hq-late-join-pro-note').textContent).toMatch(/\$9\/mo/);
  });

  it('Given a Teacher Pro teacher or an unread status, Then only the count shows, no Pro line', async () => {
    tries(4);
    const { rerender } = render(<EndedCodeTriesNotice classroomId="c1" pro={free({ hasPro: true })} />);
    await screen.findByTestId('hq-ended-code-tries');
    expect(screen.queryByTestId('hq-late-join-pro')).toBeNull();
    rerender(<EndedCodeTriesNotice classroomId="c1" pro={free({ known: false })} />);
    expect(screen.queryByTestId('hq-late-join-pro')).toBeNull();
  });
});
