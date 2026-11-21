import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockResolve, mockUseAuth, mockReduced } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockReduced: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: vi.fn() }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => ({ classroomId: null, isLoading: false }) }));
vi.mock('@/hooks/usePracticeLessons', () => ({
  usePracticeLessons: () => ({ lessons: [], isLoading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: mockReduced }));

import JoinFlow from '../JoinFlow';

const codeField = () => screen.getByLabelText('education.student.join.codeLabel') as HTMLInputElement;

describe('<JoinFlow> code step: a beat on a full code, a way back after a wrong one', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Ms Levy' });
    mockReduced.mockReturnValue(false);
  });
  afterEach(() => vi.useRealTimers());

  it('GIVEN motion is allowed WHEN the sixth character lands THEN the tiles pop in order before the name step opens', () => {
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'P45KRT' } });

    expect(screen.getByTestId('join-code-step')).toBeInTheDocument();
    const glyphs = screen.getAllByTestId('join-code-cell').map((c) => c.firstElementChild as HTMLElement);
    expect(glyphs.map((g) => g.style.animationDelay)).toEqual(['0ms', '45ms', '90ms', '135ms', '180ms', '225ms']);
    expect(screen.getByRole('button', { name: 'education.student.join.flow.next' })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByTestId('join-code-step')).not.toBeInTheDocument();
    expect(screen.getByTestId('join-name-step')).toBeInTheDocument();
  });

  it('GIVEN reduced motion WHEN the sixth character lands THEN the name step opens at once', () => {
    mockReduced.mockReturnValue(true);
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'P45KRT' } });
    expect(screen.getByTestId('join-name-step')).toBeInTheDocument();
  });

  it('GIVEN a code was refused THEN a button retypes it and the field takes focus', async () => {
    mockResolve.mockResolvedValue({ verdict: 'invalid' });
    mockReduced.mockReturnValue(true);
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'ZZZZZQ' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(codeField()).toHaveValue('ZZZZZQ');
    fireEvent.click(screen.getByRole('button', { name: 'education.student.join.flow.retypeCode' }));
    expect(codeField()).toHaveValue('');
    expect(codeField()).toHaveFocus();
  });
});
