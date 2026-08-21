/**
 * Renders the funnel panel for real.
 *
 * Everything this file covers shipped in #828 with nothing rendering it: the only test that
 * mounts the Teacher Access page mocks TeacherFunnelPanel out entirely
 * (app/[locale]/admin/teacher-access/__tests__/PageClient.guard.test.tsx:34), and
 * buildTeacherFunnel's own tests are pure. `tsc --noEmit` does not render a component. This
 * repo has shipped invisible UI before — the crossword's 11x11 board and the retention hooks
 * were both built and never displayed — so the reasons panel, the reason column and the
 * drilldown get an actual mount.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TeacherFunnelResult } from '@/lib/education/teacherFunnel';

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: any[]) => fetchWithAuth(...args),
}));
// `t(key, fallback)` is the whole reason the new copy renders without touching six
// translation files — so the mock must honour the fallback, and the assertions below read
// the fallback text. A `t` that ignored its second argument would show raw key strings.
// Mirrors the real signature (contexts/LanguageContext.tsx:321): the second argument is a
// fallback STRING or an interpolation params OBJECT, and the result is always a string. A
// naive `fb || k` mock returns the params object, which React then refuses to render as a
// child — that is a mock bug, not a component bug, and it hid this whole file's first run.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>) =>
      typeof fb === 'string' ? fb : k,
    language: 'en',
  }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { TeacherFunnelPanel } from '../TeacherFunnelPanel';

const row = (over: Partial<TeacherFunnelResult['rows'][number]> = {}) => ({
  requestId: 'r1',
  userId: 'u1',
  email: 'ada@school.edu',
  fullName: 'Ada Teacher',
  locale: 'en',
  country: 'US',
  status: 'approved',
  role: 'teacher',
  createdAt: '2026-08-01T00:00:00Z',
  trialExpiresAt: '2026-09-01T00:00:00Z',
  trialState: 'active' as const,
  roleGranted: true,
  lastSeenAt: '2026-08-10T00:00:00Z',
  classrooms: 0,
  students: 0,
  assignments: 0,
  stage: 'approved' as const,
  useCase: 'site word builder',
  useCaseKind: 'free' as const,
  reviewedAt: '2026-08-02T00:00:00Z',
  schoolOrOrg: 'Ganado ISD',
  adminNote: null,
  ...over,
});

const payload = (over: Partial<TeacherFunnelResult> = {}): TeacherFunnelResult => ({
  rows: [
    row(),
    row({
      requestId: 'r2',
      email: 'leo@escola.br',
      fullName: 'Leo T',
      country: 'BR',
      useCase: 'Weekly vocabulary battles with my class',
      useCaseKind: 'chip',
    }),
  ],
  reasons: [
    { text: 'site word builder', count: 1, kind: 'free', roles: ['teacher'], countries: ['US'] },
    {
      text: 'Weekly vocabulary battles with my class',
      count: 1,
      kind: 'chip',
      roles: ['teacher'],
      countries: ['BR'],
    },
  ],
  summary: {
    requested: 2, approved: 2, roleGranted: 2, createdClassroom: 0, gotStudents: 0,
    assigned: 0, blocked: 0, awaitingSignup: 0, trialExpired: 0,
    returnedNoClassroom: 2, returnedNoClassroomTrialActive: 2, excludedMachineRows: 16,
  },
  activity: {
    classrooms: 2, lessons: 3, studentsJoined: 1, assignments: 0,
    lessonProgress: 2, achievements: 0, duels: null,
  },
  ...over,
});

function respondWith(body: unknown) {
  fetchWithAuth.mockResolvedValue({ ok: true, json: async () => body });
}

describe('<TeacherFunnelPanel>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows each stated reason verbatim, split by whether we suggested the words', async () => {
    respondWith(payload());
    render(<TeacherFunnelPanel />);

    await screen.findByText('Why they say they want it');
    // The teacher's own words and our own example chip must never end up in one bucket.
    expect(screen.getByText(/Their own words/)).toHaveTextContent('(1)');
    expect(screen.getByText(/Our example chips, tapped unchanged/)).toHaveTextContent('(1)');
    // Verbatim, not summarised into a theme.
    expect(screen.getAllByText('site word builder').length).toBeGreaterThan(0);
  });

  it('marks a chip-echo row in the table so it is not mistaken for demand', async () => {
    respondWith(payload());
    render(<TeacherFunnelPanel />);

    await screen.findByText('Leo T');
    expect(screen.getByText('example')).toBeInTheDocument();
  });

  it('names the teachers who came back and still have no classroom', async () => {
    respondWith(payload());
    render(<TeacherFunnelPanel />);

    // blocked is 0, so the old panel showed nothing wrong at all.
    await screen.findByText(/came back to the app and still have no classroom/);
  });

  it('reports how many machine rows it dropped instead of hiding them', async () => {
    respondWith(payload());
    render(<TeacherFunnelPanel />);

    await screen.findByText(/16 machine-written rows/);
  });

  it('prints module activity, and a dash where the count failed', async () => {
    respondWith(payload());
    render(<TeacherFunnelPanel />);

    await screen.findByText('What is happening inside the module');
    expect(screen.getByText('Badges unlocked').previousSibling).toHaveTextContent('0');
    // duels came back null — "could not count" must not render as zero.
    expect(screen.getByText('Duels played').previousSibling).toHaveTextContent('—');
  });

  it('opens the drilldown when a funnel row is clicked', async () => {
    const user = userEvent.setup();
    respondWith(payload());
    render(<TeacherFunnelPanel />);

    await screen.findByText('Ada Teacher');
    await user.click(screen.getByText('Ada Teacher'));

    // The drawer is the only place the full use_case and the school are readable.
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText('Ganado ISD')).toBeInTheDocument();
  });

  it('survives an API response from before reasons/activity existed', async () => {
    // Deploy window: a cached client bundle meeting the old route. `reasons.filter` on
    // undefined would white-screen the entire admin page.
    const { reasons, activity, ...old } = payload();
    respondWith(old);
    render(<TeacherFunnelPanel />);

    await screen.findByText('Ada Teacher');
    expect(screen.getByText(/Nobody has stated a reason yet/)).toBeInTheDocument();
  });
});
