import { vi } from 'vitest';
/**
 * AdminTeacherDetail — the admin read-only teacher dashboard.
 *
 * One teacher's world on one page: identity + plan, classrooms with rosters
 * and the games actually played in each, wordlists with their words,
 * assignments, completions.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

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

import { AdminTeacherDetail } from '../AdminTeacherDetail';
import type { TeacherActivityDetails } from '@/lib/education/teacherActivity';

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
      studentCount: 2,
      students: [
        { id: 's1', joinedAt: '2026-08-22T00:00:00Z' },
        { id: 's2', joinedAt: '2026-08-23T00:00:00Z' },
      ],
    },
  ],
  wordlists: [
    {
      id: 'l1',
      name: 'Week 1',
      language: 'en',
      createdAt: '2026-08-01T00:00:00Z',
      wordCount: 3,
      words: ['cat', 'dog', 'hat'],
      sourceGameCode: null,
    },
  ],
  gamesByClassroom: {
    c1: [
      {
        gameCode: 'ROOM42',
        gameMode: 'classic',
        playedAt: '2026-08-22T10:00:00Z',
        playerCount: 2,
        rosterCount: 2,
        coveragePct: 66.6,
        averageAccuracyPct: 70,
        topPlayers: [
          { name: 'Sally', score: 120 },
          { name: 'Ben', score: 90 },
        ],
        missedWords: ['hat'],
      },
    ],
  },
  plan: { tier: 'pro', hasPro: true, periodEnd: '2026-10-01T00:00:00Z' },
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

describe('<AdminTeacherDetail>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shouldFetchTheTeacherDetailsEndpoint', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => details() });
    render(<AdminTeacherDetail userId="u1" />);

    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    expect(String(fetchWithAuth.mock.calls[0][0])).toBe(
      '/api/admin/teacher-funnel/u1/details',
    );
  });

  it('shouldRenderIdentityPlanAndEverySection', async () => {
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => details() });
    render(<AdminTeacherDetail userId="u1" />);

    expect(await screen.findByText('Ada Teacher')).toBeInTheDocument();
    expect(screen.getByText('ada@school.edu')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText('3RD GRADE')).toBeInTheDocument();
    // Games table: mode, players, missed words
    expect(screen.getByText('classic')).toBeInTheDocument();
    expect(screen.getByText(/Sally 120/)).toBeInTheDocument();
    expect(screen.getAllByText('hat').length).toBeGreaterThan(0);
    // Wordlist words preview
    expect(screen.getByText('cat')).toBeInTheDocument();
    // Assignments + completions
    expect(screen.getByText('Practice animals')).toBeInTheDocument();
    expect(screen.getAllByText('Week 1').length).toBeGreaterThan(0);
  });

  it('shouldShowAnEmptyStatePerSectionWhenTeacherHasNoActivity', async () => {
    fetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () =>
        details({
          classrooms: [],
          wordlists: [],
          assignments: [],
          completions: [],
          gamesByClassroom: {},
          plan: { tier: 'free', hasPro: false, periodEnd: null },
        }),
    });
    render(<AdminTeacherDetail userId="u1" />);

    expect(await screen.findByText('No classrooms yet.')).toBeInTheDocument();
    expect(screen.getByText('No word lists yet.')).toBeInTheDocument();
    expect(screen.getByText(/Free/)).toBeInTheDocument();
  });

  it('shouldSurfaceTheErrorWhenTheFetchFails', async () => {
    fetchWithAuth.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    render(<AdminTeacherDetail userId="u1" />);

    expect(
      await screen.findByText('Could not load teacher activity.'),
    ).toBeInTheDocument();
  });
});
