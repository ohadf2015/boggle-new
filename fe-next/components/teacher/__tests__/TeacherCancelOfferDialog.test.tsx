import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { TeacherCancelOfferDialog } from '../TeacherCancelOfferDialog';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture } }));
vi.mock('@/lib/education/proFunnelTelemetry', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  trackTrialCancelOfferViewed: (...a: unknown[]) => capture('trial_cancel_offer_viewed', ...a),
  trackTrialCancelOfferAccepted: (...a: unknown[]) => capture('trial_cancel_offer_accepted', ...a),
  trackTrialCancelOfferDismissed: (...a: unknown[]) => capture('trial_cancel_offer_dismissed', ...a),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const PORTAL = 'https://polar.sh/lexiclash/portal?customer_session_token=x';
const fetchOk = (body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response);

describe('TeacherCancelOfferDialog', () => {
  beforeEach(() => {
    capture.mockReset();
    vi.mocked(toast.error).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires trial_cancel_offer_viewed once with the plan status', () => {
    render(<TeacherCancelOfferDialog status="trialing" manageHref={PORTAL} external onClose={vi.fn()} />);
    expect(screen.getByTestId('cancel-offer-dialog')).toBeInTheDocument();
    expect(capture).toHaveBeenCalledWith('trial_cancel_offer_viewed', { status: 'trialing' });
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('pause is one click: POSTs the offer, fires accepted {offer:pause}, shows the new trial end', async () => {
    const spy = fetchOk({ ok: true, applied: 'pause', trial_end: '2027-01-06T00:00:00.000Z' });
    const onClose = vi.fn();
    render(<TeacherCancelOfferDialog status="trialing" manageHref={PORTAL} external onClose={onClose} />);
    fireEvent.click(screen.getByTestId('cancel-offer-pause'));
    await waitFor(() => expect(screen.getByTestId('cancel-offer-applied')).toBeInTheDocument());
    expect(spy).toHaveBeenCalledWith('/api/subscription/retention-offer', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)).toEqual({ offer: 'pause' });
    expect(capture).toHaveBeenCalledWith('trial_cancel_offer_accepted', { offer: 'pause', status: 'trialing' });
    expect(screen.getByTestId('cancel-offer-applied')).toHaveTextContent(
      'teacher.subscription.cancelOfferAppliedPause:January 6',
    );
    fireEvent.click(screen.getByTestId('cancel-offer-applied-done'));
    expect(onClose).toHaveBeenCalledWith('applied');
  });

  it('an active plan does not offer a live pause — that Polar call is not wired', () => {
    render(<TeacherCancelOfferDialog status="active" manageHref={PORTAL} external onClose={vi.fn()} />);
    expect(screen.queryByTestId('cancel-offer-pause')).not.toBeInTheDocument();
    expect(screen.getByTestId('cancel-offer-discount')).toBeInTheDocument();
  });

  it('discount is one click: fires accepted {offer:discount} and saves a request, not a bill change', async () => {
    fetchOk({ ok: true, applied: 'recorded' });
    render(<TeacherCancelOfferDialog status="active" manageHref={PORTAL} external onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('cancel-offer-discount'));
    await waitFor(() => expect(screen.getByTestId('cancel-offer-applied')).toBeInTheDocument());
    expect(capture).toHaveBeenCalledWith('trial_cancel_offer_accepted', { offer: 'discount', status: 'active' });
    expect(screen.getByTestId('cancel-offer-applied')).toHaveTextContent('teacher.subscription.cancelOfferRecorded');
  });

  it('continue-to-cancel fires dismissed and opens the Polar portal in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const onClose = vi.fn();
    render(<TeacherCancelOfferDialog status="trialing" manageHref={PORTAL} external onClose={onClose} />);
    fireEvent.click(screen.getByTestId('cancel-offer-continue'));
    expect(capture).toHaveBeenCalledWith('trial_cancel_offer_dismissed', { status: 'trialing' });
    expect(open).toHaveBeenCalledWith(PORTAL, '_blank', 'noopener,noreferrer');
    expect(onClose).toHaveBeenCalledWith('dismissed');
  });

  it('the backdrop is the same dismissal: navigates to the in-app plan page', () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { assign }, configurable: true });
    try {
      render(<TeacherCancelOfferDialog status="trialing" manageHref="/en/teacher/upgrade" external={false} onClose={vi.fn()} />);
      fireEvent.click(screen.getByTestId('cancel-offer-dialog'));
      expect(capture).toHaveBeenCalledWith('trial_cancel_offer_dismissed', { status: 'trialing' });
      expect(assign).toHaveBeenCalledWith('/en/teacher/upgrade');
    } finally {
      Object.defineProperty(window, 'location', { value: original, configurable: true });
    }
  });

  it('a failed POST shows an error, fires no acceptance, and the dialog stays open', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 502 } as Response);
    render(<TeacherCancelOfferDialog status="trialing" manageHref={PORTAL} external onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('cancel-offer-pause'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('teacher.subscription.cancelOfferError'));
    expect(capture).not.toHaveBeenCalledWith('trial_cancel_offer_accepted', expect.anything());
    expect(screen.getByTestId('cancel-offer-dialog')).toBeInTheDocument();
  });

  it('discount copy carries the price and the half price', () => {
    render(<TeacherCancelOfferDialog status="trialing" manageHref={PORTAL} external onClose={vi.fn()} />);
    expect(screen.getByTestId('cancel-offer-discount')).toHaveTextContent(
      'teacher.subscription.cancelOfferDiscountBody:$9,$4.50',
    );
  });
});
