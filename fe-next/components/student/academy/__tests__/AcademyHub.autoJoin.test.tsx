import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

const { viewProps, joinMock, liveRef, academyData } = vi.hoisted(() => ({
  academyData: { reviewLessonId: null, reviewWords: [] },
  viewProps: { current: null as null | Record<string, unknown> },
  joinMock: vi.fn(),
  liveRef: { game: null as null | Record<string, unknown>, socket: {} },
}));

vi.mock('../AcademyHubView', () => ({
  AcademyHubView: (p: Record<string, unknown>) => { viewProps.current = p; return null; },
}));
vi.mock('@/hooks/useActiveClassroomGame', () => ({ useActiveClassroomGame: () => ({ activeGame: liveRef.game, socket: liveRef.socket }) }));
vi.mock('@/components/student/useClassroomGameJoin', () => ({ useClassroomGameJoin: () => ({ join: joinMock, isJoining: false, joinError: null }) }));
vi.mock('@/hooks/useClassroomRewardListener', () => ({ useClassroomRewardListener: () => ({ reward: null, clearReward: vi.fn() }) }));
vi.mock('../useAcademyData', () => ({ useAcademyData: () => academyData }));
vi.mock('../ReviewCountBridge', () => ({ ReviewCountBridge: () => null }));

import { AcademyHub } from '../AcademyHub';
import { AUTO_JOIN_DELAY_MS } from '@/components/student/useClassroomAutoJoin';

const props = { userId: 'u1', studentName: 'Noa', classroomId: 'c1', profileXp: 0, isGuest: true, onSignOut: () => {} };

describe('AcademyHub — teacher opens a game while the student is on the class page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    joinMock.mockReset();
    viewProps.current = null;
  });
  afterEach(() => vi.useRealTimers());

  it('Given an open live room, When the page shows it, Then a notice shows and the student is joined through the same join after the delay', () => {
    liveRef.game = { gameCode: 'LIVE01', teacherName: 'T', lessonNames: [], roomOpen: true };
    render(<AcademyHub {...props} />);
    expect(viewProps.current?.autoJoinPending).toBe(true);
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS); });
    expect(joinMock).toHaveBeenCalledTimes(1);
    expect(viewProps.current?.autoJoinPending).toBe(false);
  });

  it('Given the notice, When the student taps Stay here, Then nothing joins', () => {
    liveRef.game = { gameCode: 'LIVE02', teacherName: 'T', lessonNames: [], roomOpen: true };
    render(<AcademyHub {...props} />);
    act(() => (viewProps.current?.onStayHere as () => void)());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(joinMock).not.toHaveBeenCalled();
    expect(viewProps.current?.autoJoinPending).toBe(false);
  });

  it('Given the notice, When the student taps the live button, Then they join now through the one join', () => {
    liveRef.game = { gameCode: 'LIVE03', teacherName: 'T', lessonNames: [], roomOpen: true };
    render(<AcademyHub {...props} />);
    act(() => (viewProps.current?.join as () => void)());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(joinMock).toHaveBeenCalledTimes(1);
  });
});
