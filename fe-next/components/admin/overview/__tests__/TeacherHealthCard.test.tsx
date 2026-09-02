import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TeacherFunnelResult } from '@/lib/education/teacherFunnel';

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: any[]) => fetchWithAuth(...args),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string | Record<string, string | number>, _params?: Record<string, string | number>) =>
      typeof fb === 'string' ? fb : k,
    language: 'en',
  }),
}));

import { TeacherHealthCard } from '../TeacherHealthCard';

const payload = (over: Partial<TeacherFunnelResult> = {}): TeacherFunnelResult => ({
  rows: [
    {
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
      students: 5,
      assignments: 2,
      stage: 'teaching',
      useCase: 'site word builder',
      useCaseKind: 'free',
      reviewedAt: '2026-08-02T00:00:00Z',
      schoolOrOrg: 'Ganado ISD',
      adminNote: null,
    },
    {
      requestId: 'r2',
      userId: 'u2',
      email: 'blocked@school.edu',
      fullName: 'Blocked Teacher',
      locale: 'en',
      country: 'US',
      status: 'approved',
      role: 'teacher',
      createdAt: '2026-08-01T00:00:00Z',
      trialExpiresAt: '2026-09-01T00:00:00Z',
      trialState: 'active',
      roleGranted: false,
      lastSeenAt: null,
      classrooms: 0,
      students: 0,
      assignments: 0,
      stage: 'blocked',
      useCase: 'vocab games',
      useCaseKind: 'free',
      reviewedAt: '2026-08-02T00:00:00Z',
      schoolOrOrg: null,
      adminNote: null,
    },
  ],
  reasons: [],
  summary: {
    requested: 2,
    approved: 2,
    roleGranted: 1,
    createdClassroom: 1,
    gotStudents: 1,
    assigned: 1,
    blocked: 1,
    awaitingSignup: 0,
    trialExpired: 0,
    returnedNoClassroom: 0,
    returnedNoClassroomTrialActive: 0,
    excludedMachineRows: 0,
  },
  activity: {},
  classrooms: [],
  ...over,
});

describe('TeacherHealthCard', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
    push.mockReset();
  });

  it('shows loading state then renders teacher health metrics', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<TeacherHealthCard />);
    expect(screen.getByText('Teacher health')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Teaching')).toBeInTheDocument();
  });

  it('shows a blocked alert when blocked count > 0', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<TeacherHealthCard />);
    await waitFor(() =>
      expect(screen.getByText(/cannot access the teacher dashboard/)).toBeInTheDocument(),
    );
  });

  it('navigates to teacher-access on View click', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => payload() });
    render(<TeacherHealthCard />);
    await waitFor(() => expect(screen.getByText('View')).toBeInTheDocument());
    await userEvent.click(screen.getByText('View'));
    expect(push).toHaveBeenCalledWith('/en/admin/teacher-access');
  });
});
