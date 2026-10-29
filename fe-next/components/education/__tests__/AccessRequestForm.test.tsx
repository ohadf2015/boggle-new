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

const startPolarTrialMock = vi.fn();
vi.mock('@/hooks/useStartTeacherProTrial', () => ({
  useStartTeacherProTrial: () => ({ start: startPolarTrialMock, pending: false }),
}));


const proState = vi.hoisted(() => ({
  hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null as string | null, accessTrialEnded: false,
  refresh: vi.fn(async () => {}),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
const offerReports = vi.hoisted(() => ({ click: vi.fn(), impression: vi.fn() }));
vi.mock('@/lib/education/reportProCtaClick', () => ({
  reportProCtaClick: (...a: unknown[]) => offerReports.click(...a),
  reportProOfferImpression: (...a: unknown[]) => offerReports.impression(...a),
}));

import { AccessRequestForm } from '../AccessRequestForm';

describe('<AccessRequestForm>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrackGrowthEvent.mockClear();
    startPolarTrialMock.mockClear();
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

  it('shows the success card with Polar trial + HQ CTAs and does not auto-redirect', async () => {
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
    expect(await screen.findByTestId('access-success-trial')).toHaveTextContent('Start your 14-day Teacher Pro trial');
    expect(screen.getByTestId('access-success-hq')).toHaveTextContent('education.access.go_to_teacher');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('lands a paid campaign teacher on the day-0 class screen instead of the Polar offer', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, success: true, paidDay0: true }),
    } as any)) as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/en/teacher/class-ready'));
    expect(screen.queryByTestId('access-success-trial')).toBeNull();
  });

  it('puts the class first: HQ is the big main action, Teacher Pro the quiet secondary', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, success: true }),
    } as any)) as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));

    const trial = await screen.findByTestId('access-success-trial');
    const hq = screen.getByTestId('access-success-hq');
    expect(hq.compareDocumentPosition(trial) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hq.className).toMatch(/\bmin-h-14\b/);
    expect(hq.className).toMatch(/(^|\s)bg-neo-navy(\s|$)/);
    expect(trial.className).not.toMatch(/\bmin-h-14\b/);
    expect(trial.className).not.toMatch(/(^|\s)bg-neo-navy(\s|$)/);
  });

  it('starts Polar trial from the success card', async () => {
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
    await screen.findByTestId('access-success-trial');
    await user.click(screen.getByTestId('access-success-trial'));
    expect(startPolarTrialMock).toHaveBeenCalledTimes(1);
  });

  it('opens Teacher HQ from the success card after refreshing the profile', async () => {
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
    await user.click(await screen.findByTestId('access-success-hq'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/en/teacher'));
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

    await screen.findByText('education.access.success_title');
    expect(pushMock).not.toHaveBeenCalled();
  });

  describe('Teacher Pro offer wording matches the class-ready card', () => {
    const submit = async () => {
      global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, success: true }) } as any)) as any;
      const user = userEvent.setup();
      render(<AccessRequestForm />);
      await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
      await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
      await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));
      return user;
    };
    beforeEach(() => {
      Object.assign(proState, { hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false });
      proState.refresh.mockClear();
      offerReports.click.mockClear();
      offerReports.impression.mockClear();
    });

    it('re-reads the entitlement after approval and reports rendered (source access_success)', async () => {
      await submit();
      await screen.findByTestId('access-success-trial');
      expect(proState.refresh).toHaveBeenCalledTimes(1);
      expect(offerReports.impression).toHaveBeenCalledWith({
        placement: 'access_success', stage: 'rendered', locale: 'en', cta: 'teacher_pro_trial', offer: 'trial',
      });
    });

    it('inside the free access trial asks to keep Pro, with the end date, as a trial checkout', async () => {
      proState.accessTrialExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      await submit();
      const btn = await screen.findByTestId('access-success-trial');
      expect(btn).toHaveTextContent('Keep Teacher Pro after my trial');
      expect(btn).toHaveAttribute('data-offer', 'keep_after_trial');
      expect(screen.getByTestId('access-success-offer-note')).toHaveTextContent(/starts when your trial ends/);
    });

    it('an ended access trial goes straight to $9/mo with no trial wording', async () => {
      proState.accessTrialEnded = true;
      await submit();
      const btn = await screen.findByTestId('access-success-trial');
      expect(btn).toHaveTextContent('Continue with Teacher Pro');
      expect(btn).not.toHaveTextContent(/14|trial/i);
    });

    it('reports the tap server-side and starts checkout', async () => {
      const user = await submit();
      await user.click(await screen.findByTestId('access-success-trial'));
      expect(offerReports.click).toHaveBeenCalledWith({ placement: 'access_success', locale: 'en', cta: 'teacher_pro_trial' });
      expect(startPolarTrialMock).toHaveBeenCalledTimes(1);
    });

    it('shows no Pro offer to a teacher who already has Pro; HQ stays the one button', async () => {
      proState.hasPro = true;
      await submit();
      await screen.findByTestId('access-success-hq');
      expect(screen.queryByTestId('access-success-trial')).toBeNull();
      expect(offerReports.impression).not.toHaveBeenCalled();
    });
  });
});
