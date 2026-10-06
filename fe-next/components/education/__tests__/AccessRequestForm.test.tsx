import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ refreshProfile: vi.fn(async () => {}) }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

import { AccessRequestForm } from '../AccessRequestForm';

describe('<AccessRequestForm>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrackGrowthEvent.mockClear();
  });

  it('disables submit until required fields filled', () => {
    render(<AccessRequestForm />);
    const submit = screen.getByRole('button', { name: /education\.access\.submit/i });
    expect(submit).toBeDisabled();
  });

  // The form only asks for what signup doesn't already capture: role + use case.
  // Name/email/country are derived server-side from the signed-in account (#722),
  // so they are NOT fields here — required = a role pick plus a ≥10-char use case.
  it('enables submit when required fields filled', async () => {
    render(<AccessRequestForm />);
    const user = userEvent.setup();
    const submit = screen.getByRole('button', { name: /education\.access\.submit/i });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');

    await waitFor(() => expect(submit).not.toBeDisabled());
  });

  it('posts to /api/education/access-request on submit', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as any));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe('/api/education/access-request');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.role).toBe('teacher');
    expect(body.use_case).toContain('Teaching');
  });

  // 202 approvalPending: the request row committed but instant approval is
  // still finishing server-side. The form must tell THAT truth — not the
  // "You're in!" success card followed by a /teacher push that bounces the
  // still-student user straight back here.
  it('shows the pending state and does NOT redirect when the server answers approvalPending', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 202,
      json: async () => ({ ok: true, success: true, approvalPending: true }),
    } as any));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));

    await screen.findByText('education.access.approval_pending_title');
    expect(screen.queryByText('education.access.success_title')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  // The pending copy offers "submit again to retry" — so the UI must make
  // that possible without a page reload: a back button returns to the form
  // with everything the teacher already typed still in place.
  it('back button on the pending card returns to the form with entered values intact', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 202,
      json: async () => ({ ok: true, success: true, approvalPending: true }),
    } as any));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));
    await screen.findByText('education.access.approval_pending_title');

    await user.click(screen.getByRole('button', { name: /education\.access\.approval_pending_back/i }));

    expect(screen.queryByText('education.access.approval_pending_title')).toBeNull();
    expect(screen.getByLabelText(/education\.access\.use_case_q/i)).toHaveValue('Teaching 9th grade ESL students.');
    expect(screen.getByRole('radio', { name: /education\.access\.role_teacher/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /education\.access\.submit/i })).toBeEnabled();
  });

  it('shows the success card and redirects to /teacher on a clean 200, tracking submission', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, success: true }),
    } as any));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));

    await screen.findByText('education.access.success_title');
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_request_submitted', { ok: true, status: 200 });
    // The redirect fires after a 1200ms success beat.
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/en/teacher'), { timeout: 2500 });
  });

  it('tracks edu_access_request_submitted on 202 approvalPending response', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 202,
      json: async () => ({ ok: true, success: true, approvalPending: true }),
    } as any));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));

    await screen.findByText('education.access.approval_pending_title');
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_request_submitted', { ok: true, status: 202 });
  });

  it('tracks edu_access_request_submitted on error response (e.g. 429)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ ok: false, error: 'rate limited' }),
    } as any));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));

    await screen.findByRole('alert');
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('edu_access_request_submitted', { ok: false, status: 429 });
  });

  it('a throwing tracker does not break form submit', async () => {
    mockTrackGrowthEvent.mockImplementation(() => {
      throw new Error('Analytics failed');
    });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, success: true }),
    } as any));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));

    // Form still succeeds despite tracker throwing!
    await screen.findByText('education.access.success_title');
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/en/teacher'), { timeout: 2500 });
  });
});
