import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassroomProOfferBanner, CLASSROOM_PAGE_PLACEMENT } from '../ClassroomProOfferBanner';
import { claimProOfferSlot, resetProOfferSession } from '@/lib/education/pro/proOfferSession';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';

const pro = vi.hoisted(() => ({
  hasPro: false,
  loading: false,
  known: true,
  trialUsed: false,
  status: 'active' as 'active' | 'past_due' | 'canceled' | 'paused' | 'trialing',
  accessTrialExpires: null as string | null,
  accessTrialEnded: false,
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));

const language = vi.hoisted(() => ({ current: 'en' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: language.current }),
}));

const postTeacherProCheckout = vi.hoisted(() => vi.fn());
const goToPolarCheckout = vi.hoisted(() => vi.fn());
vi.mock('@/lib/education/postTeacherProCheckout', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
  goToPolarCheckout: (...a: unknown[]) => goToPolarCheckout(...a),
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const posts = (path: string) =>
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    .filter(([u]) => u === path)
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));

const TRIAL_LABEL = resultsTrialCopy('en').trialCta;
const TITLE = 'See which words this class missed';

beforeEach(() => {
  resetProOfferSession();
  sessionStorage.removeItem('lexi:classroomProOffer:dismissed');
  language.current = 'en';
  Object.assign(pro, {
    hasPro: false,
    loading: false,
    known: true,
    trialUsed: false,
    status: 'active',
    accessTrialExpires: null,
    accessTrialEnded: false,
  });
  postTeacherProCheckout.mockReset();
  goToPolarCheckout.mockReset();
  postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/c/class' });
  globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, writable: true, value: vi.fn(() => true) });
});

describe('ClassroomProOfferBanner', () => {
  it('shows a free teacher which words this class missed, and records the offer', () => {
    render(<ClassroomProOfferBanner live={false} />);
    expect(screen.getByTestId('classroom-pro-offer')).toHaveTextContent(TITLE);
    expect(screen.getByTestId('classroom-pro-offer-cta')).toHaveTextContent(TRIAL_LABEL);
    expect(posts('/api/education/pro-offer-impression')).toEqual([
      expect.objectContaining({
        placement: CLASSROOM_PAGE_PLACEMENT,
        stage: 'rendered',
        locale: 'en',
        cta: 'teacher_pro_trial',
        offer: 'trial',
      }),
    ]);
  });

  it('stays off the page for a Pro teacher and while the entitlement is unknown', () => {
    pro.hasPro = true;
    const { rerender } = render(<ClassroomProOfferBanner live={false} />);
    expect(screen.queryByTestId('classroom-pro-offer')).not.toBeInTheDocument();

    pro.hasPro = false;
    pro.loading = true;
    rerender(<ClassroomProOfferBanner live={false} />);
    expect(screen.queryByTestId('classroom-pro-offer')).not.toBeInTheDocument();

    pro.loading = false;
    pro.known = false;
    rerender(<ClassroomProOfferBanner live={false} />);
    expect(screen.queryByTestId('classroom-pro-offer')).not.toBeInTheDocument();
    expect(posts('/api/education/pro-offer-impression')).toEqual([]);
  });

  it('does not start a second checkout for a past-due teacher', () => {
    pro.status = 'past_due';
    render(<ClassroomProOfferBanner live={false} />);
    expect(screen.queryByTestId('classroom-pro-offer')).not.toBeInTheDocument();
  });

  it('does not ask a teacher who already has a live access trial', () => {
    pro.accessTrialExpires = new Date(Date.now() + 86_400_000).toISOString();
    render(<ClassroomProOfferBanner live={false} />);
    expect(screen.queryByTestId('classroom-pro-offer')).not.toBeInTheDocument();
  });

  it('does not ask, and does not record an offer, while a class is live', () => {
    render(<ClassroomProOfferBanner live={true} />);
    expect(screen.queryByTestId('classroom-pro-offer')).not.toBeInTheDocument();
    expect(posts('/api/education/pro-offer-impression')).toEqual([]);
  });

  it('still shows the offer when live status is unknown, so a broken check never hides it', () => {
    render(<ClassroomProOfferBanner live={null} />);
    expect(screen.getByTestId('classroom-pro-offer-cta')).toBeInTheDocument();
  });

  it('starts a tagged Polar trial from the CTA and does not replace the class page', async () => {
    render(<ClassroomProOfferBanner live={false} />);
    fireEvent.click(screen.getByTestId('classroom-pro-offer-cta'));
    await vi.waitFor(() => expect(postTeacherProCheckout).toHaveBeenCalledTimes(1));
    expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, {
      trial: true,
      locale: 'en',
      placement: CLASSROOM_PAGE_PLACEMENT,
      source: CLASSROOM_PAGE_PLACEMENT,
    });
    expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.sh/c/class');
    expect(navigator.sendBeacon).toHaveBeenCalled();
    const beacon = (navigator.sendBeacon as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(beacon[0]).toBe('/api/education/pro-offer-click');
    expect(JSON.parse(await (beacon[1] as Blob).text())).toMatchObject({
      placement: CLASSROOM_PAGE_PLACEMENT,
      offer: 'trial',
    });
  });

  it('asks for $9, not a second trial, once the trial is used', async () => {
    pro.trialUsed = true;
    render(<ClassroomProOfferBanner live={false} />);
    expect(screen.getByTestId('classroom-pro-offer-cta')).toHaveTextContent(resultsTrialCopy('en').upgradeCta);
    fireEvent.click(screen.getByTestId('classroom-pro-offer-cta'));
    await vi.waitFor(() => expect(postTeacherProCheckout).toHaveBeenCalledTimes(1));
    expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, expect.objectContaining({
      trial: false,
      source: CLASSROOM_PAGE_PLACEMENT,
    }));
  });

  it('hides after Not now, including a later visit in the same session', () => {
    const { unmount } = render(<ClassroomProOfferBanner live={false} />);
    fireEvent.click(screen.getByTestId('classroom-pro-offer-dismiss'));
    expect(screen.queryByTestId('classroom-pro-offer')).not.toBeInTheDocument();
    unmount();
    render(<ClassroomProOfferBanner live={false} />);
    expect(screen.queryByTestId('classroom-pro-offer')).not.toBeInTheDocument();
  });

  it('does not spend the session full-card slot while live status is still unknown', () => {
    render(<ClassroomProOfferBanner live={null} />);
    expect(screen.getByTestId('classroom-pro-offer-card')).toBeInTheDocument();
    expect(claimProOfferSlot('teacher-1', 'later-mount')).toBe('full');
  });

  it('reads right to left for a Hebrew teacher', () => {
    language.current = 'he';
    render(<ClassroomProOfferBanner live={false} />);
    expect(screen.getByTestId('classroom-pro-offer')).toHaveAttribute('dir', 'rtl');
  });

  it('collapses to the one-line offer once this session already showed a full card', () => {
    claimProOfferSlot('teacher-1', 'dashboard-mount');
    render(<ClassroomProOfferBanner live={false} />);
    expect(screen.queryByTestId('classroom-pro-offer-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('teacher-pro-offer-compact')).toHaveAttribute('data-placement', CLASSROOM_PAGE_PLACEMENT);
  });
});
