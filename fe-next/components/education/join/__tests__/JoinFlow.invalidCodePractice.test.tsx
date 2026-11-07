import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockCapture } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockCapture: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => ({ classroomId: null, isLoading: false }) }));
vi.mock('@/hooks/usePracticeLessons', () => ({
  usePracticeLessons: () => ({ lessons: [], isLoading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: mockCapture }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const codeField = () => screen.getByLabelText('education.student.join.codeLabel') as HTMLInputElement;

describe('<JoinFlow> — a wrong code still leaves a way to play', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('GIVEN a typed code the server calls invalid THEN the code stays, the field has focus, and a no-account practice round is offered', async () => {
    mockResolve.mockResolvedValue({ verdict: 'invalid' });
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'ZZZZZQ' } });

    await screen.findByRole('alert');
    await waitFor(() => expect(codeField()).toHaveFocus());
    expect(codeField()).toHaveValue('ZZZZZQ');
    const practice = screen.getByTestId('dead-end-practice');
    expect(practice).toHaveAttribute('href', '/en/join/practice');
    expect(mockCapture).toHaveBeenCalledWith('edu_dead_end_shown', { state: 'invalid_code' });
  });

  it('GIVEN the lookup could not be performed (`unverified`) THEN no wrong-code practice offer appears', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'ZZZZZQ' } });
    await waitFor(() => expect(mockResolve).toHaveBeenCalled());
    expect(screen.queryByTestId('dead-end-practice')).toBeNull();
  });

  it('GIVEN no code has been refused THEN the code step shows no practice offer', () => {
    render(<JoinFlow />);
    expect(screen.queryByTestId('dead-end-practice')).toBeNull();
  });
});
