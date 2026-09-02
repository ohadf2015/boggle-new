import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TeacherFunnelRow } from '@/lib/education/teacherFunnel';
import type { TeacherActivityDetails } from '@/lib/education/teacherActivity';

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: unknown[]) => fetchWithAuth(...args),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>) =>
      typeof fb === 'string' ? fb : k,
    language: 'en',
  }),
}));

import { TeacherActivityDrawer } from '../TeacherActivityDrawer';

const row: TeacherFunnelRow = {
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
  trialState: 'active',
  roleGranted: true,
  lastSeenAt: '2026-08-10T00:00:00Z',
  classrooms: 1,
  students: 1,
  assignments: 1,
  stage: 'teaching',
  useCase: 'site word builder',
  useCaseKind: 'free',
  reviewedAt: '2026-08-02T00:00:00Z',
  schoolOrOrg: 'Ganado ISD',
  adminNote: null,
};

const details = (over: Partial<TeacherActivityDetails> = {}): TeacherActivityDetails => ({
  teacher: {
    id: 'u1',
    email: 'ada@school.edu',
    fullName: 'Ada Teacher',
    displayName: 'Ada D',
    username: 'ada',
    roleGranted: true,
    lastSeenAt: '2026-08-10T00:00:00Z',
    trialExpiresAt: '2026-09-01T00:00:00Z',
    status: 'approved',
  },
  classrooms: [
    {
      id: 'c1',
      name: '3RD GRADE',
      joinCode: 'ABC123',
      language: 'en',
      createdAt: '2026-08-21T09:00:00Z',
      studentCount: 1,
      students: [{ id: 's1', joinedAt: '2026-08-22T00:00:00Z' }],
    },
  ],
  wordlists: [
    {
      id: 'l1',
      name: 'Week 1',
      language: 'en',
      createdAt: '2026-08-01T00:00:00Z',
      wordCount: 12,
      sourceGameCode: null,
    },
  ],
  assignments: [
    {
      id: 'a1',
      title: 'Practice animals',
      type: 'practice',
      classroomName: '3RD GRADE',
      lessonName: 'Week 1',
      dueDate: '2026-08-30T00:00:00Z',
      createdAt: '2026-08-10T00:00:00Z',
      completedCount: 1,
    },
  ],
  completions: [
    {
      studentId: 's1',
      lessonId: 'l1',
      lessonName: 'Week 1',
      completedAt: '2026-08-12T00:00:00Z',
      currentLevel: 2,
      totalXp: 40,
      wordsMasteredCount: 4,
    },
  ],
  ...over,
});

describe('<TeacherActivityDrawer>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shouldFetchTeacherDetailsWhenOpened', async () => {
    // GIVEN a granted teacher row
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => details() });

    // WHEN the activity drawer mounts
    render(<TeacherActivityDrawer row={row} onClose={vi.fn()} />);

    // THEN it loads /api/admin/teacher-funnel/{userId}/details with the auth helper
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    expect(String(fetchWithAuth.mock.calls[0][0])).toBe('/api/admin/teacher-funnel/u1/details');
    expect(await screen.findByText('Ada Teacher')).toBeInTheDocument();
    expect(screen.getByText('ada@school.edu')).toBeInTheDocument();
    expect(screen.getByText('3RD GRADE')).toBeInTheDocument();
    expect(screen.getAllByText('Week 1').length).toBeGreaterThan(0);
    expect(screen.getByText('Practice animals')).toBeInTheDocument();
  });

  it('shouldShowEmptyStatesWhenTeacherHasNoActivity', async () => {
    fetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () =>
        details({ classrooms: [], wordlists: [], assignments: [], completions: [] }),
    });

    render(<TeacherActivityDrawer row={row} onClose={vi.fn()} />);

    expect(await screen.findByText('No classrooms yet.')).toBeInTheDocument();
    expect(screen.getByText('No word lists yet.')).toBeInTheDocument();
    expect(screen.getByText('No assignments yet.')).toBeInTheDocument();
    expect(screen.getByText('No recent completions.')).toBeInTheDocument();
  });

  it('shouldCallOnCloseWhenCloseIsClicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => details() });

    render(<TeacherActivityDrawer row={row} onClose={onClose} />);
    await screen.findByText('Ada Teacher');
    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('shouldShowErrorWhenDetailsFetchFails', async () => {
    fetchWithAuth.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'nope' }) });

    render(<TeacherActivityDrawer row={row} onClose={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load teacher activity/i);
  });
});
