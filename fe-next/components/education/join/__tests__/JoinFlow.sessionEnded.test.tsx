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
const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(mockToast, { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));
const { mockReportPractice } = vi.hoisted(() => ({ mockReportPractice: vi.fn() }));
vi.mock('@/lib/education/reportLateJoinPractice', () => ({ reportLateJoinPracticeStarted: mockReportPractice }));

import JoinFlow from '../JoinFlow';

const K = 'education.student.join';
const endedPanel = () => screen.queryByTestId('join-ended-panel');
const endedNote = () => screen.queryByTestId('join-ended-note');
const codeField = () => screen.queryByLabelText(`${K}.codeLabel`) as HTMLInputElement | null;

describe('<JoinFlow> — a code whose game has ended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockClassroom.mockReturnValue({ classroomId: null, isLoading: false });
    mockLessons.mockReturnValue({ lessons: [], isLoading: false, error: null, refresh: vi.fn() });
  });

  async function goWithName() {
    const name = await screen.findByLabelText(`${K}.nameLabel`);
    fireEvent.change(name, { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${K}\\.flow\\.go`) }));
  }

  it('GIVEN the lookup says ended WHEN the QR lands THEN the student is asked for a name with a line that the game just ended, not a dead end', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended', label: 'Year 9 English' });
    render(<JoinFlow initialCode="ABC123" />);

    await waitFor(() => expect(endedNote()).toHaveTextContent('education.student.gameEnded.joinClassLine'));
    expect(screen.getByLabelText(`${K}.nameLabel`)).toBeInTheDocument();
    expect(endedPanel()).toBeNull();
  });

  it('GIVEN a late guest on an ended code WHEN they tap GO THEN they are enrolled and sent to the class page with a game-ended line', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c9', endedSessionCode: true });
    render(<JoinFlow initialCode="ABC123" />);
    await waitFor(() => expect(endedNote()).toBeInTheDocument());

    await goWithName();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en/student?class=open'));
    expect(mockJoin).toHaveBeenCalledWith('ABC123', expect.objectContaining({ guestName: 'Ada' }));
    expect(mockToast).toHaveBeenCalledWith('education.student.gameEnded.nextGameToast', expect.anything());
    expect(endedPanel()).toBeNull();
  });

  it('GIVEN a signed-in student opens an ended invite link THEN they are enrolled without a tap and land on the class page', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c9', endedSessionCode: true });
    render(<JoinFlow initialCode="ABC123" />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en/student?class=open'));
  });

  it('GIVEN the join itself answers SESSION_ENDED THEN the ended state shows', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    mockJoin.mockResolvedValue({ success: false, code: 'SESSION_ENDED' });
    render(<JoinFlow initialCode="ABC123" />);
    await goWithName();

    await waitFor(() => expect(endedPanel()).toBeInTheDocument());
    expect(screen.getByText('education.student.gameEnded.title')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('GIVEN the server enrolled them off a game code it only now knows ended THEN they go to the class page too', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c9', endedSessionCode: true });
    render(<JoinFlow initialCode="ABC123" />);
    await goWithName();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en/student?class=open'));
  });

  it('GIVEN an ended code the server could not tie to a class THEN the ended state still offers practice', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    mockJoin.mockResolvedValue({ success: false, code: 'SESSION_ENDED' });
    render(<JoinFlow initialCode="ABC123" />);
    await goWithName();

    const practice = await screen.findByTestId('dead-end-practice');
    expect(practice).toHaveAttribute('href', '/en/join/practice');
    fireEvent.click(practice);
    expect(mockReportPractice).toHaveBeenCalledWith({ gameCode: 'ABC123', door: 'join_flow' });
  });

  it('GIVEN the ended state WHEN the student taps "type a new code" THEN an empty code field is back', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    mockJoin.mockResolvedValue({ success: false, code: 'SESSION_ENDED' });
    render(<JoinFlow initialCode="ABC123" />);
    await goWithName();
    await waitFor(() => expect(endedPanel()).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'education.student.gameEnded.newCode' }));

    expect(endedPanel()).toBeNull();
    expect(codeField()).toHaveValue('');
  });

  it('GIVEN a typed code the lookup calls ended WHEN NEXT is pressed THEN the name step carries the game-ended line', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow />);
    fireEvent.change(codeField()!, { target: { value: 'ABC12' } });
    fireEvent.change(codeField()!, { target: { value: 'ABC123' } });

    await waitFor(() => expect(endedNote()).toBeInTheDocument());
  });
});
