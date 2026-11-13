import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockResolve, mockUseAuth, mockStudentClassroom } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockStudentClassroom: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: vi.fn() }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: mockStudentClassroom }));
vi.mock('@/hooks/usePracticeLessons', () => ({
  usePracticeLessons: () => ({ lessons: [], isLoading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const codeField = () => screen.getByLabelText('education.student.join.codeLabel') as HTMLInputElement;

describe('<JoinFlow> — a wrong code says what to do next', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockStudentClassroom.mockReturnValue({ classroomId: null, isLoading: false });
    mockResolve.mockResolvedValue({ verdict: 'invalid' });
  });

  it('GIVEN a student already in a class WHEN their code is refused THEN the class page is offered, where the next game opens', async () => {
    mockStudentClassroom.mockReturnValue({ classroomId: 'class-1', isLoading: false });
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'ZZZZZQ' } });

    const toClass = await screen.findByTestId('wrong-code-to-class');
    expect(toClass).toHaveAttribute('href', '/en/student?class=open');
    expect(toClass).toHaveTextContent('education.student.gameEnded.toClass');
    expect(screen.getByText('education.student.join.wrongCodeClassLine')).toBeInTheDocument();
  });

  it('GIVEN a student with no class WHEN their code is refused THEN no class link is offered', async () => {
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'ZZZZZQ' } });

    await screen.findByRole('alert');
    expect(screen.queryByTestId('wrong-code-to-class')).toBeNull();
  });

  it('GIVEN a refused code holding O, 0, I or 1 THEN the student is told codes never use those characters', async () => {
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'AB0CDE' } });

    expect(await screen.findByText('education.student.join.noLookalikes')).toBeInTheDocument();
  });

  it('GIVEN a refused code without lookalike characters THEN no lookalike hint is shown', async () => {
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'ZZZZZQ' } });

    await screen.findByRole('alert');
    expect(screen.queryByText('education.student.join.noLookalikes')).toBeNull();
  });
});
