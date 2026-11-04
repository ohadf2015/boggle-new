// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { proState, checkoutStart, blockedInApp, gateShown, upgradeClicked, reportViewed, fetchMock } = vi.hoisted(() => ({
  proState: { hasPro: false, loading: false, accessTrialExpires: null as string | null, accessTrialEnded: false },
  checkoutStart: vi.fn(),
  blockedInApp: { value: false },
  gateShown: vi.fn(),
  upgradeClicked: vi.fn(),
  reportViewed: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
vi.mock('@/hooks/useTeacherProCheckout', () => ({
  useTeacherProCheckout: (_source: string) => ({ pending: false, start: checkoutStart }),
}));
vi.mock('@/hooks/useCheckoutBlockedInApp', () => ({ useCheckoutBlockedInApp: () => blockedInApp.value }));
vi.mock('@/lib/education/telemetry', () => ({
  trackProgressReportViewed: (...args: unknown[]) => reportViewed(...args),
  trackProgressReportGateShown: (...args: unknown[]) => gateShown(...args),
  trackProgressReportUpgradeClicked: (...args: unknown[]) => upgradeClicked(...args),
}));

const { stableT } = vi.hoisted(() => {
  const translations: Record<string, string> = {
    'teacher.reports.progressMatrix.title': 'Per-student progress',
    'teacher.reports.progressMatrix.empty': 'No students or assignments in this class yet',
    'teacher.reports.progressMatrix.trend': 'Trend',
    'teacher.reports.progressMatrix.trendUp': 'Improving',
    'teacher.reports.progressMatrix.trendDown': 'Declining',
    'teacher.reports.progressMatrix.trendFlat': 'Holding steady',
    'teacher.reports.progressMatrix.trendNone': 'Not enough data yet',
    'teacher.reports.progressMatrix.cellCompleted': 'Completed, {{score}}% correct',
    'teacher.reports.progressMatrix.cellMissing': 'Not completed',
    'teacher.reports.progressMatrix.sampleTitle': 'Per-student correctness',
    'teacher.reports.progressMatrix.gateTitle': 'Per-student scores are a Pro feature',
    'teacher.reports.progressMatrix.gateBody': 'The score behind the completion counts.',
    'teacher.reports.progressMatrix.gateCta': 'See per-student scores with Pro: {{price}}/month',
    'teacher.reports.columns.student': 'Student',
    'teacher.reports.loading': 'Loading…',
    'teacher.reports.error': 'Something went wrong',
    'teacher.reports.retry': 'Try again',
    'teacher.reports.noData': 'No data yet',
    'teacher.subscription.proPlanName': 'Teacher Pro',
    'teacher.subscription.notInApp': 'Upgrade in the app store',
    'teacher.subscription.trustCancel': 'Cancel anytime',
    'teacher.proGate.trialEnded': 'Your Pro preview has ended.',
    'teacher.proGate.freeKeeps': 'Free still gives you {{modes}}',
    'eg2Pro.sample.students': 'Maya,Liam,Noa',
    'eg2Pro.sample.student': 'Student',
    'eg2Pro.sample.badge': 'Sample',
  };
  function stableT(key: string, params?: Record<string, string | number>) {
    let value = translations[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{{${k}}}`, String(v));
      }
    }
    return value;
  }
  return { stableT };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: stableT, language: 'en', dir: 'ltr' }),
}));

const matrix = {
  assignments: [
    { id: 'a1', title: 'Week 1 nouns', dueDate: '2026-10-06' },
    { id: 'a2', title: 'Old verbs', dueDate: '2026-09-01' },
  ],
  rows: [
    {
      studentId: 's1',
      studentName: 'Ada',
      cells: [
        { completed: true, correctness: 75 },
        { completed: false, correctness: null },
      ],
      trend: 'down',
    },
  ],
};

function mockFetchMatrix() {
  fetchMock.mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({ ok: true, matrix }),
  });
}

import { AssignmentProgressMatrix } from '../AssignmentProgressMatrix';

describe('AssignmentProgressMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proState.hasPro = false;
    proState.loading = false;
    proState.accessTrialExpires = null;
    proState.accessTrialEnded = false;
    blockedInApp.value = false;
    mockFetchMatrix();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('renders a student row for an entitled teacher and fires progress_report_viewed with class_id and surface', async () => {
    proState.hasPro = true;
    render(<AssignmentProgressMatrix classroomId="c1" classroomName="English 101" />);

    expect(await screen.findByRole('rowheader', { name: 'Ada' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Week 1 nouns' })).toBeInTheDocument();
    const cells = screen.getAllByTestId('progress-matrix-cell');
    const cell = cells.find((c) => c.getAttribute('data-completed') === 'true');
    expect(cell).toHaveAttribute('data-student', 's1');
    expect(cell).toHaveTextContent('75%');
    expect(cells.find((c) => c.getAttribute('data-completed') === 'false')).toHaveTextContent('—');
    expect(screen.getByTitle('Declining')).toBeInTheDocument();

    await waitFor(() => expect(reportViewed).toHaveBeenCalledWith('c1', 'progress_report'));
    expect(gateShown).not.toHaveBeenCalled();
  });

  it('lets a teacher on a live access trial see the real matrix', async () => {
    proState.accessTrialExpires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    render(<AssignmentProgressMatrix classroomId="c1" classroomName="English 101" />);
    expect(await screen.findByRole('rowheader', { name: 'Ada' })).toBeInTheDocument();
    expect(screen.queryByTestId('progress-matrix-paywall')).not.toBeInTheDocument();
  });

  it('shows the paywall without fetching for a free teacher and fires pro_gate_shown only after entitlement resolves', () => {
    proState.loading = true;
    const { rerender } = render(<AssignmentProgressMatrix classroomId="c1" classroomName="English 101" />);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(gateShown).not.toHaveBeenCalled();

    proState.loading = false;
    rerender(<AssignmentProgressMatrix classroomId="c1" classroomName="English 101" />);
    expect(screen.getByTestId('progress-matrix-paywall')).toBeInTheDocument();
    expect(screen.getByTestId('progress-matrix-sample-badge')).toHaveTextContent('Sample');
    expect(screen.queryByRole('rowheader', { name: 'Ada' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(reportViewed).not.toHaveBeenCalled();
    expect(gateShown).toHaveBeenCalledTimes(1);
    expect(gateShown).toHaveBeenCalledWith();
  });

  it('shows the paywall, not real rows, for an expired access trial', () => {
    proState.accessTrialExpires = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    proState.accessTrialEnded = true;
    render(<AssignmentProgressMatrix classroomId="c1" classroomName="English 101" />);
    expect(screen.getByTestId('progress-matrix-paywall')).toBeInTheDocument();
    expect(screen.getByText('Your Pro preview has ended.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(gateShown).toHaveBeenCalledTimes(1);
  });

  it('fires upgrade_clicked with the surface on the primary CTA and then starts the existing checkout', async () => {
    render(<AssignmentProgressMatrix classroomId="c1" classroomName="English 101" />);
    const cta = screen.getByTestId('progress-matrix-upgrade');
    expect(cta).toHaveTextContent('See per-student scores with Pro: $9/month');

    await userEvent.click(cta);
    expect(upgradeClicked).toHaveBeenCalledTimes(1);
    expect(upgradeClicked).toHaveBeenCalledWith();
    expect(checkoutStart).toHaveBeenCalledTimes(1);
  });

  it('hides the Polar button when checkout is blocked in the app webview', () => {
    blockedInApp.value = true;
    render(<AssignmentProgressMatrix classroomId="c1" classroomName="English 101" />);
    expect(screen.getByTestId('progress-matrix-not-in-app')).toBeInTheDocument();
    expect(screen.queryByTestId('progress-matrix-upgrade')).not.toBeInTheDocument();
  });

  it('a 402 from the route swaps to the paywall and never renders real student names', async () => {
    proState.hasPro = true;
    fetchMock.mockResolvedValue({ status: 402, ok: false });
    render(<AssignmentProgressMatrix classroomId="c1" classroomName="English 101" />);

    expect(await screen.findByTestId('progress-matrix-paywall')).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: 'Ada' })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Ada');
    expect(document.body.textContent).not.toContain('Week 1 nouns');
    expect(reportViewed).not.toHaveBeenCalled();
    expect(gateShown).toHaveBeenCalledTimes(1);
  });
});
