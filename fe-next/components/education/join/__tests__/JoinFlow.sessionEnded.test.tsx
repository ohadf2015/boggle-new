import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockPush, mockClassroom } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  mockClassroom: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, unknown>) => (params ? `${k}:${JSON.stringify(params)}` : k),
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: mockClassroom }));
const { mockLessons } = vi.hoisted(() => ({ mockLessons: vi.fn() }));
vi.mock('@/hooks/usePracticeLessons', () => ({ usePracticeLessons: mockLessons }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));
const { mockReportPractice } = vi.hoisted(() => ({ mockReportPractice: vi.fn() }));
vi.mock('@/lib/education/reportLateJoinPractice', () => ({ reportLateJoinPracticeStarted: mockReportPractice }));

import JoinFlow from '../JoinFlow';

const K = 'education.student.join';
const endedPanel = () => screen.queryByTestId('join-ended-panel');
const codeField = () => screen.queryByLabelText(`${K}.codeLabel`) as HTMLInputElement | null;

describe('<JoinFlow> — a code whose game has ended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockClassroom.mockReturnValue({ classroomId: null, isLoading: false });
    mockLessons.mockReturnValue({ lessons: [], isLoading: false, error: null, refresh: vi.fn() });
  });

  it('GIVEN the lookup says ended WHEN the QR lands THEN the ended state shows, not the code field with an error', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended', label: 'Year 9 English' });
    render(<JoinFlow initialCode="ABC123" />);

    await waitFor(() => expect(endedPanel()).toBeInTheDocument());
    expect(screen.getByText('education.student.gameEnded.title')).toBeInTheDocument();
    expect(screen.getByText('education.student.deadEnd.endedLine')).toBeInTheDocument();
    expect(codeField()).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('GIVEN a late student with no class WHEN they tap practice THEN the no-account practice round opens and the start is recorded', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow initialCode="ABC123" />);

    const practice = await screen.findByTestId('dead-end-practice');
    expect(practice).toHaveAttribute('href', '/en/join/practice');
    expect(practice).toHaveTextContent('education.student.deadEnd.practiceCta');
    fireEvent.click(practice);
    expect(mockReportPractice).toHaveBeenCalledWith({ gameCode: 'ABC123', door: 'join_flow' });
  });

  it("GIVEN an enrolled student WHEN the ended state shows THEN practice opens the class's latest list and leads the actions", async () => {
    mockClassroom.mockReturnValue({ classroomId: 'c1', isLoading: false });
    mockLessons.mockReturnValue({
      lessons: [{ id: 'L7', name: 'Week 9', classroom_id: 'c1', words: [{ word: 'cat' }], assignment: null }],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow initialCode="ABC123" />);

    const practice = await screen.findByTestId('dead-end-practice');
    expect(practice).toHaveAttribute('href', '/en/student/lessons/L7?mode=spelling');
    const newCode = screen.getByRole('button', { name: 'education.student.gameEnded.newCode' });
    expect(practice.compareDocumentPosition(newCode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('GIVEN the ended state takes focus THEN its heading opts out of the global focus ring', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow initialCode="ABC123" />);

    const heading = await screen.findByRole('heading', { name: 'education.student.gameEnded.title' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveClass('outline-none!');
  });

  it('GIVEN the join itself answers SESSION_ENDED THEN the ended state shows', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    mockJoin.mockResolvedValue({ success: false, code: 'SESSION_ENDED' });
    render(<JoinFlow initialCode="ABC123" />);

    const name = await screen.findByLabelText(`${K}.nameLabel`);
    fireEvent.change(name, { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${K}\\.flow\\.go`) }));

    await waitFor(() => expect(endedPanel()).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('GIVEN the server enrolled them off an ended game code THEN the ended state shows with their class, and nothing navigates', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c9', endedSessionCode: true });
    render(<JoinFlow initialCode="ABC123" />);

    const name = await screen.findByLabelText(`${K}.nameLabel`);
    fireEvent.change(name, { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${K}\\.flow\\.go`) }));

    await waitFor(() => expect(endedPanel()).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'education.student.gameEnded.toClass' })).toHaveAttribute('href', '/en/student?class=open');
    await new Promise((r) => setTimeout(r, 900));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('GIVEN the ended state WHEN the student taps "type a new code" THEN an empty code field is back', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow initialCode="ABC123" />);
    await waitFor(() => expect(endedPanel()).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'education.student.gameEnded.newCode' }));

    expect(endedPanel()).toBeNull();
    expect(codeField()).toHaveValue('');
  });

  it('GIVEN the student has a class THEN the ended state links to it, inside edu', async () => {
    mockClassroom.mockReturnValue({ classroomId: 'c1', isLoading: false });
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow initialCode="ABC123" />);
    await waitFor(() => expect(endedPanel()).toBeInTheDocument());

    expect(screen.getByRole('link', { name: 'education.student.gameEnded.toClass' })).toHaveAttribute(
      'href',
      '/en/student?class=open'
    );
  });

  it('GIVEN no class THEN there is no class link', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow initialCode="ABC123" />);
    await waitFor(() => expect(endedPanel()).toBeInTheDocument());

    expect(screen.queryByRole('link', { name: 'education.student.gameEnded.toClass' })).toBeNull();
  });

  it('GIVEN a typed code the lookup calls ended WHEN NEXT is pressed THEN the ended state shows', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow />);
    fireEvent.change(codeField()!, { target: { value: 'ABC12' } });
    fireEvent.change(codeField()!, { target: { value: 'ABC123' } });

    await waitFor(() => expect(endedPanel()).toBeInTheDocument());
  });
});
