import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockPush, mockSignOut } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, string>) => (params && typeof params === 'object' ? `${k}:${JSON.stringify(params)}` : k),
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn(), trackJoinCodeStepRefused: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ signOut: mockSignOut, resendEmailVerification: vi.fn() }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => <div data-testid="join-language-chip" /> }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: vi.fn() }));

import JoinFlow from '../JoinFlow';

const teacher = { id: 'teacher-1', email: 't@school.edu', is_anonymous: false, email_confirmed_at: '2026-01-01', user_metadata: {} };

describe('<JoinFlow> when a teacher opens their own class code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 7' });
    mockUseAuth.mockReturnValue({ user: teacher, loading: false });
  });

  it('Given no room is open, When the join is refused as their own class, Then a start-a-game screen replaces the form', async () => {
    mockJoin.mockResolvedValue({ success: false, code: 'TEACHER_OWN_CLASS', classroomId: 'c1' });
    render(<JoinFlow initialCode="P45KRT" />);
    const primary = await screen.findByTestId('own-class-primary');
    expect(primary).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c1');
    expect(screen.queryByText('education.student.join.teacherOwnClass')).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('Given their room is live, When refused, Then the primary action opens the host board', async () => {
    mockJoin.mockResolvedValue({ success: false, code: 'TEACHER_OWN_CLASS', classroomId: 'c1', gameCode: 'LIVE01' });
    render(<JoinFlow initialCode="P45KRT" />);
    expect(await screen.findByTestId('own-class-primary')).toHaveAttribute('href', '/en/education/live/host?room=LIVE01');
  });

  it('Given a teacher joining someone else\'s class, When the join succeeds, Then the ordinary student path runs and no own-class screen shows', async () => {
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c9' });
    render(<JoinFlow initialCode="P45KRT" />);
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(screen.queryByTestId('join-own-class-panel')).not.toBeInTheDocument();
  });
});
