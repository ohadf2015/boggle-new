/**
 * Tests for useRealtimeClassroomProgress hook
 * Tests real-time classroom progress tracking
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeClassroomProgress } from '../useRealtimeClassroomProgress';
import * as supabaseRealtime from '@/lib/supabaseRealtime';

// Mock the realtime module
vi.mock('@/lib/supabaseRealtime', () => ({
  subscribeToClassroomProgress: vi.fn(),
}));

describe('useRealtimeClassroomProgress', () => {
  let mockUnsubscribe: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUnsubscribe = vi.fn();
    (supabaseRealtime.subscribeToClassroomProgress as any).mockReturnValue(mockUnsubscribe);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==================== TEST 1: Should Subscribe When Enabled ====================

  it('should subscribe when enabled', () => {
    // GIVEN: Hook with enabled option
    renderHook(() => useRealtimeClassroomProgress({
      classroomId: 'classroom-123',
      enabled: true,
    }));

    // THEN: Should call subscribe
    expect(supabaseRealtime.subscribeToClassroomProgress).toHaveBeenCalledWith(
      'classroom-123',
      expect.any(Function),
      expect.objectContaining({
        onStatusChange: expect.any(Function),
      })
    );
  });

  // ==================== TEST 2: Should Not Subscribe When Disabled ====================

  it('should not subscribe when disabled', () => {
    // GIVEN: Hook with disabled option
    renderHook(() => useRealtimeClassroomProgress({
      classroomId: 'classroom-123',
      enabled: false,
    }));

    // THEN: Should not call subscribe
    expect(supabaseRealtime.subscribeToClassroomProgress).not.toHaveBeenCalled();
  });

  // ==================== TEST 3: Should Track Active Students Count ====================

  it('should track active students count', () => {
    // GIVEN: Hook is mounted
    const { result } = renderHook(() => useRealtimeClassroomProgress({
      classroomId: 'classroom-123',
      enabled: true,
    }));

    // Get the update callback
    const updateCallback = (supabaseRealtime.subscribeToClassroomProgress as any).mock.calls[0][1];

    // WHEN: Student activities are received
    act(() => {
      updateCallback({
        studentId: 'student-1',
        eventType: 'UPDATE',
        data: { student_id: 'student-1' },
      });
    });

    act(() => {
      updateCallback({
        studentId: 'student-2',
        eventType: 'UPDATE',
        data: { student_id: 'student-2' },
      });
    });

    // THEN: Should track 2 active students
    expect(result.current.activeStudentsCount).toBe(2);
  });

  // ==================== TEST 4: Should Maintain Recent Activity Feed ====================

  it('should maintain recent activity feed', () => {
    // GIVEN: Hook is mounted
    const { result } = renderHook(() => useRealtimeClassroomProgress({
      classroomId: 'classroom-123',
      enabled: true,
    }));

    // Get the update callback
    const updateCallback = (supabaseRealtime.subscribeToClassroomProgress as any).mock.calls[0][1];

    // WHEN: Multiple activities are received
    act(() => {
      updateCallback({
        studentId: 'student-1',
        eventType: 'INSERT',
        data: { student_id: 'student-1', student_name: 'Alice' },
      });
    });

    act(() => {
      updateCallback({
        studentId: 'student-2',
        eventType: 'UPDATE',
        data: { student_id: 'student-2', student_name: 'Bob' },
      });
    });

    // THEN: Should maintain activity feed (newest first)
    expect(result.current.recentActivity).toHaveLength(2);
    expect(result.current.recentActivity[0].studentId).toBe('student-2'); // Most recent
    expect(result.current.recentActivity[1].studentId).toBe('student-1'); // Older
  });

  // ==================== TEST 5: Should Call onStudentActivity Callback ====================

  it('should call onStudentActivity callback', () => {
    // GIVEN: Hook with onStudentActivity callback
    const onStudentActivity = vi.fn();
    renderHook(() => useRealtimeClassroomProgress({
      classroomId: 'classroom-123',
      enabled: true,
      onStudentActivity,
    }));

    // Get the update callback
    const updateCallback = (supabaseRealtime.subscribeToClassroomProgress as any).mock.calls[0][1];

    // WHEN: Student activity is received
    act(() => {
      updateCallback({
        studentId: 'student-1',
        eventType: 'UPDATE',
        data: { student_id: 'student-1' },
      });
    });

    // THEN: Should call the callback
    expect(onStudentActivity).toHaveBeenCalledWith('student-1', 'word_attempted');
  });

  // ==================== TEST 6: Should Cleanup on Unmount ====================

  it('should cleanup on unmount', () => {
    // GIVEN: Hook is mounted
    const { unmount } = renderHook(() => useRealtimeClassroomProgress({
      classroomId: 'classroom-123',
      enabled: true,
    }));

    // WHEN: Component unmounts
    unmount();

    // THEN: Should call unsubscribe
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  // ==================== TEST 7: Should Update Connection Status ====================

  it('should update connection status', async () => {
    // GIVEN: Hook is mounted
    const { result } = renderHook(() => useRealtimeClassroomProgress({
      classroomId: 'classroom-123',
      enabled: true,
    }));

    // Get the status change callback
    const statusCallback = (supabaseRealtime.subscribeToClassroomProgress as any).mock.calls[0][2].onStatusChange;

    // Initial status should be connecting
    expect(result.current.connectionStatus).toBe('connecting');
    expect(result.current.isConnected).toBe(false);

    // WHEN: Status changes to SUBSCRIBED
    act(() => {
      statusCallback('SUBSCRIBED');
    });

    // THEN: Should update status
    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  // ==================== TEST 8: Should Remove Inactive Students ====================

  it('should remove inactive students after 5 minutes', () => {
    // GIVEN: Hook is mounted
    const { result } = renderHook(() => useRealtimeClassroomProgress({
      classroomId: 'classroom-123',
      enabled: true,
    }));

    // Get the update callback
    const updateCallback = (supabaseRealtime.subscribeToClassroomProgress as any).mock.calls[0][1];

    // WHEN: Student activity is received
    act(() => {
      updateCallback({
        studentId: 'student-1',
        eventType: 'UPDATE',
        data: { student_id: 'student-1' },
      });
    });

    expect(result.current.activeStudentsCount).toBe(1);

    // WHEN: 5 minutes + 1 minute (for cleanup interval) pass
    act(() => {
      vi.advanceTimersByTime(6 * 60 * 1000);
    });

    // THEN: Student should be removed from active list
    expect(result.current.activeStudentsCount).toBe(0);
  });

  // ==================== TEST 9: Should Limit Recent Activity Feed ====================

  it('should limit recent activity feed to 10 items', () => {
    // GIVEN: Hook is mounted
    const { result } = renderHook(() => useRealtimeClassroomProgress({
      classroomId: 'classroom-123',
      enabled: true,
    }));

    // Get the update callback
    const updateCallback = (supabaseRealtime.subscribeToClassroomProgress as any).mock.calls[0][1];

    // WHEN: 15 activities are received
    act(() => {
      for (let i = 0; i < 15; i++) {
        updateCallback({
          studentId: `student-${i}`,
          eventType: 'UPDATE',
          data: { student_id: `student-${i}` },
        });
      }
    });

    // THEN: Should only keep last 10 (newest first)
    expect(result.current.recentActivity).toHaveLength(10);
    expect(result.current.recentActivity[0].studentId).toBe('student-14'); // Most recent
    expect(result.current.recentActivity[9].studentId).toBe('student-5'); // Oldest kept
  });
});
