import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockPush, mockClassroom, mockTrack } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  mockClassroom: vi.fn(),
  mockTrack: vi.fn(),
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
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: mockTrack, trackStudentJoinStarted: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';
import { joinFailure } from '../joinFailure';

const K = 'education.student.join';

async function submitAs(name: string) {
  const field = await screen.findByLabelText(`${K}.nameLabel`);
  fireEvent.change(field, { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${K}\\.flow\\.go`) }));
}

describe('joinFailure — ROOM_LOCKED', () => {
  it('maps to the locked effect with its own message, not a generic error', () => {
    expect(joinFailure('ROOM_LOCKED')).toEqual({ outcome: 'room_locked', effect: 'locked', formErrorKey: `${K}.roomLocked.title` });
  });

  it('keeps the class-full message on the same path', () => {
    expect(joinFailure('STUDENT_LIMIT_REACHED').formErrorKey).toBe(`${K}.classroomFull`);
  });
});

describe('<JoinFlow> — the teacher locked the room', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockClassroom.mockReturnValue({ classroomId: null, isLoading: false });
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
  });

  it('GIVEN the join answers ROOM_LOCKED THEN the student sees the locked message, the ask-your-teacher hint, and a retry', async () => {
    mockJoin.mockResolvedValue({ success: false, code: 'ROOM_LOCKED' });
    render(<JoinFlow initialCode="ABC123" />);
    await submitAs('Ada');

    const alert = await screen.findByTestId('join-room-locked');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent(`${K}.roomLocked.title`);
    expect(alert).toHaveTextContent(`${K}.roomLocked.hint`);
    expect(screen.getByRole('button', { name: `${K}.roomLocked.retry` })).toBeInTheDocument();
    expect(screen.queryByText(`${K}.flow.genericError`)).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('GIVEN the teacher unlocked WHEN the student taps retry THEN the same name is sent again and they walk in', async () => {
    mockJoin.mockResolvedValueOnce({ success: false, code: 'ROOM_LOCKED' });
    render(<JoinFlow initialCode="ABC123" />);
    await submitAs('Ada');
    const retry = await screen.findByRole('button', { name: `${K}.roomLocked.retry` });

    mockJoin.mockResolvedValueOnce({ success: true, classroomId: 'c1', gameCode: 'ABC123' });
    fireEvent.click(retry);

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockJoin).toHaveBeenCalledTimes(2);
    expect(mockJoin.mock.calls[1][1]).toEqual(expect.objectContaining({ guestName: 'Ada' }));
  });
});
