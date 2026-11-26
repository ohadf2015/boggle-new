import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProCancelIntercept } from '../TeacherProCancelIntercept';
import { TeacherProManageLink } from '../TeacherProManageLink';

const trackShown = vi.fn();
const trackChosen = vi.fn();
vi.mock('@/lib/education/cancelRetentionTelemetry', () => ({
  trackCancelInterceptShown: (...a: unknown[]) => trackShown(...a),
  trackCancelInterceptChosen: (...a: unknown[]) => trackChosen(...a),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const HREF = 'https://polar.sh/lexiclash/portal?customer_session_token=x';

function open(phase: 'trial' | 'paid' = 'trial') {
  const onClose = vi.fn();
  render(<TeacherProCancelIntercept href={HREF} phase={phase} surface="trial_lifecycle" onClose={onClose} />);
  return onClose;
}

describe('TeacherProCancelIntercept', () => {
  beforeEach(() => {
    trackShown.mockReset();
    trackChosen.mockReset();
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(window, 'open').mockReturnValue({} as Window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows pause and half-price before cancel, and records the open', () => {
    open();
    expect(screen.getByTestId('teacher-cancel-intercept')).toHaveAttribute('data-phase', 'trial');
    expect(screen.getByTestId('teacher-cancel-pause')).toHaveTextContent('teacher.subscription.cancelKeepPause');
    expect(screen.getByTestId('teacher-cancel-pause')).toHaveTextContent('teacher.subscription.cancelKeepPauseTrialNote');
    expect(screen.getByTestId('teacher-cancel-discount')).toBeInTheDocument();
    expect(screen.getByTestId('teacher-cancel-continue')).toBeInTheDocument();
    expect(trackShown).toHaveBeenCalledWith({ surface: 'trial_lifecycle', phase: 'trial' });
  });

  it('a paying teacher sees the period-end pause note, not the trial one', () => {
    open('paid');
    expect(screen.getByTestId('teacher-cancel-pause')).toHaveTextContent('teacher.subscription.cancelKeepPausePaidNote');
  });

  it('pause posts to Polar retain and does not open the portal', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ mechanism: 'trial_extend' }) } as Response);
    const onClose = open();
    fireEvent.click(screen.getByTestId('teacher-cancel-pause'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/subscription/retain',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ offer: 'pause' }) }),
    );
    expect(window.open).not.toHaveBeenCalled();
    expect(trackChosen).toHaveBeenCalledWith({ surface: 'trial_lifecycle', phase: 'trial', offer: 'pause' });
  });

  it('continue is the only path that opens the Polar portal', () => {
    open();
    fireEvent.click(screen.getByTestId('teacher-cancel-continue'));
    expect(window.open).toHaveBeenCalledWith(HREF, '_blank', 'noopener,noreferrer');
    expect(fetch).not.toHaveBeenCalled();
    expect(trackChosen).toHaveBeenCalledWith(expect.objectContaining({ offer: 'continue' }));
  });

  it('keep closes without a Polar call', () => {
    const onClose = open();
    fireEvent.click(screen.getByTestId('teacher-cancel-keep'));
    expect(onClose).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
  });

  it('Manage or cancel opens the keep offer and does not jump to Polar', () => {
    render(
      <TeacherProManageLink portalUrl={HREF} testId="manage" surface="trial_charge_soon">
        Manage or cancel
      </TeacherProManageLink>,
    );
    const link = screen.getByTestId('manage');
    expect(link).toHaveAttribute('href', HREF);
    expect(link).toHaveAttribute('target', '_blank');
    fireEvent.click(link);
    expect(screen.getByTestId('teacher-cancel-intercept')).toHaveAttribute('data-surface', 'trial_charge_soon');
    expect(window.open).not.toHaveBeenCalled();
  });
});
