import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const refreshProfile = vi.hoisted(() => vi.fn(async () => {}));
const track = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fb?: unknown) => (typeof fb === 'string' ? `${k}|${fb}` : k), language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ refreshProfile }) }));
vi.mock('next/navigation', () => ({ useRouter: () => nav }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));

import { AccessRequestForm } from '../AccessRequestForm';

const ok = (json: Record<string, unknown> = { ok: true }, status = 200) =>
  vi.fn(async () => ({ ok: status < 400, status, json: async () => json }) as unknown as Response);

const submitButton = () => screen.getByRole('button', { name: /education\.(trial\.cta|access\.class_ready_creating)/ });
const sentBody = (f: ReturnType<typeof ok>) => JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);

describe('<AccessRequestForm> — one tap to the first class', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const reasonBox = () => screen.getByRole('textbox');
  const typeReason = (text = 'Friday vocab battles with my class') => userEvent.setup().type(reasonBox(), text);

  it('Given the form, Then one free-text reason box is required, with no preset answers and the button is off', () => {
    render(<AccessRequestForm />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(reasonBox()).toBeRequired();
    expect(reasonBox()).toHaveAttribute('maxlength', '800');
    expect(screen.queryByText('education.access.use_case_spark')).toBeNull();
    expect(screen.queryByText('education.access.use_case_ex1')).toBeNull();
    expect(submitButton()).toBeDisabled();
  });

  it('Given a reason under 10 characters, Then the button stays off and the count left shows', async () => {
    render(<AccessRequestForm />);
    await typeReason('vocab');
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText('education.access.use_case_remaining')).toBeInTheDocument();
  });

  it('Given a reason of 10+ characters, When submitted, Then it is sent trimmed, with no role unless tapped', async () => {
    const f = ok();
    global.fetch = f as unknown as typeof fetch;
    render(<AccessRequestForm onApproved={vi.fn()} />);
    await typeReason('  Friday vocab battles with my class  ');
    await userEvent.setup().click(submitButton());
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('/api/education/access-request');
    const body = sentBody(f);
    expect(body.role).toBeUndefined();
    expect(body.use_case).toBe('Friday vocab battles with my class');
    expect(body.locale).toBe('en');
  });

  it('Given a role chip tapped, Then it is sent, and tapping it again clears it', async () => {
    const f = ok();
    global.fetch = f as unknown as typeof fetch;
    const user = userEvent.setup();
    render(<AccessRequestForm onApproved={vi.fn()} />);
    const tutor = screen.getByRole('radio', { name: /education\.access\.role_tutor/ });
    await user.click(tutor);
    expect(tutor).toHaveAttribute('aria-checked', 'true');
    await user.click(tutor);
    expect(tutor).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/ }));
    await user.type(reasonBox(), 'Friday vocab battles'); await user.click(submitButton());
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect(sentBody(f).role).toBe('teacher');
  });

  it('Given approval, Then the page is told where to go, with the profile refresh, and no success card or Pro offer shows', async () => {
    global.fetch = ok({ ok: true, paidDay0: false }) as unknown as typeof fetch;
    const onApproved = vi.fn();
    render(<AccessRequestForm onApproved={onApproved} />);
    await typeReason(); await userEvent.setup().click(submitButton());
    await waitFor(() => expect(onApproved).toHaveBeenCalledTimes(1));
    const approval = onApproved.mock.calls[0][0];
    expect(approval).toMatchObject({ paidDay0: false, alreadyApproved: false });
    await approval.ready;
    expect(refreshProfile).toHaveBeenCalled();
    expect(screen.queryByText('education.access.success_title')).toBeNull();
    expect(screen.queryByTestId('access-success-trial')).toBeNull();
    expect(screen.queryByTestId('access-success-offer')).toBeNull();
    expect(nav.push).not.toHaveBeenCalled();
    expect(submitButton()).toBeDisabled();
  });

  it('Given a paid campaign teacher or an already-approved account, Then the page hears it', async () => {
    global.fetch = ok({ ok: true, paidDay0: true, alreadyApproved: true }) as unknown as typeof fetch;
    const onApproved = vi.fn();
    render(<AccessRequestForm onApproved={onApproved} />);
    await typeReason(); await userEvent.setup().click(submitButton());
    await waitFor(() => expect(onApproved).toHaveBeenCalled());
    expect(onApproved.mock.calls[0][0]).toMatchObject({ paidDay0: true, alreadyApproved: true });
  });

  it('Given no page owner, When approved, Then the form itself refreshes and goes to class setup', async () => {
    global.fetch = ok() as unknown as typeof fetch;
    render(<AccessRequestForm />);
    await typeReason(); await userEvent.setup().click(submitButton());
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/en/teacher/classroom/new'));
    expect(refreshProfile).toHaveBeenCalled();
  });

  it('Given a profile refresh that never answers, Then the teacher still reaches class setup after a few seconds', async () => {
    vi.useFakeTimers();
    try {
      refreshProfile.mockImplementationOnce(() => new Promise(() => {}));
      global.fetch = ok() as unknown as typeof fetch;
      render(<AccessRequestForm />);
      fireEvent.change(reasonBox(), { target: { value: 'Friday vocab battles' } });
      fireEvent.click(submitButton());
      await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
      expect(nav.replace).not.toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
      expect(nav.replace).toHaveBeenCalledWith('/en/teacher/classroom/new');
      expect(nav.replace).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Given 202 approvalPending, Then the pending card shows and nothing navigates', async () => {
    global.fetch = ok({ ok: true, approvalPending: true }, 202) as unknown as typeof fetch;
    const onApproved = vi.fn();
    const user = userEvent.setup();
    render(<AccessRequestForm onApproved={onApproved} />);
    await user.type(reasonBox(), 'Friday vocab battles'); await user.click(submitButton());
    await screen.findByText('education.access.approval_pending_title');
    expect(onApproved).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'education.access.approval_pending_back' }));
    expect(submitButton()).toBeEnabled();
  });

  it('Given a 429, Then the rate-limit message is announced and the button comes back', async () => {
    global.fetch = ok({ ok: false }, 429) as unknown as typeof fetch;
    render(<AccessRequestForm onApproved={vi.fn()} />);
    await typeReason(); await userEvent.setup().click(submitButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('education.access.rate_limited');
    expect(submitButton()).toBeEnabled();
    expect(track).toHaveBeenCalledWith('edu_access_request_submitted', { ok: false, status: 429 });
  });

  it('Given a double tap, Then only one request is filed', async () => {
    let resolve: (v: unknown) => void = () => {};
    const f = vi.fn(() => new Promise((r) => { resolve = r; }));
    global.fetch = f as unknown as typeof fetch;
    render(<AccessRequestForm onApproved={vi.fn()} />);
    fireEvent.change(reasonBox(), { target: { value: 'Friday vocab battles' } });
    const btn = submitButton();
    btn.click();
    btn.click();
    resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
    await waitFor(() => expect(f).toHaveBeenCalledTimes(1));
  });

  it('Given a throwing tracker, Then the request still goes through', async () => {
    track.mockImplementation(() => { throw new Error('boom'); });
    global.fetch = ok() as unknown as typeof fetch;
    const onApproved = vi.fn();
    render(<AccessRequestForm onApproved={onApproved} />);
    await typeReason(); await userEvent.setup().click(submitButton());
    await waitFor(() => expect(onApproved).toHaveBeenCalled());
  });

  it('Given any locale, Then every line comes from the catalogue, never from an English fallback', () => {
    const { container } = render(<AccessRequestForm />);
    expect(container.textContent).not.toContain('|');
    expect(screen.getByRole('radiogroup').getAttribute('aria-label')).not.toContain('|');
  });

  it('greets by first name when known', () => {
    render(<AccessRequestForm knownName="Dana Levi" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('education.access.greeting');
  });
});
