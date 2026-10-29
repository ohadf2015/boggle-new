import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const createAssignment = vi.fn();
const refresh = vi.fn();
let assignments: Array<Record<string, unknown>> = [];
let isLoading = false;
let fetchError: string | null = null;
vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: () => ({ assignments, isLoading, error: fetchError, createAssignment, refresh }),
}));
const getClassroomAssignments = vi.fn();
vi.mock('@/lib/supabase/education/assignments', () => ({ getClassroomAssignments: (...a: unknown[]) => getClassroomAssignments(...a) }));
const trackFirst = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({ trackEduFirstAssignmentCreated: (...a: unknown[]) => trackFirst(...a) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, b?: Record<string, unknown>) => {
      const text = typeof a === 'string' ? a : k;
      const params = (typeof a === 'object' ? a : b) as Record<string, unknown> | undefined;
      return params ? text.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? '')) : text;
    },
    language: 'en',
  }),
}));
const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));

import { useLobbyWarmup, LobbyWarmupButton, LobbyWarmupStatus } from '../LobbyWarmup';

const args = { classroomId: 'c1', lessonId: 'L1', teacherId: 't1', source: 'lobby' as const };

describe('lobby warm-up', () => {
  beforeEach(() => {
    assignments = [];
    isLoading = false;
    fetchError = null;
    createAssignment.mockReset();
    refresh.mockReset();
    trackFirst.mockReset();
    capture.mockReset();
    getClassroomAssignments.mockReset().mockResolvedValue({ data: [], error: null });
  });

  const loaded = () => {
    const hook = renderHook(() => useLobbyWarmup(args));
    isLoading = true;
    hook.rerender();
    isLoading = false;
    hook.rerender();
    return hook;
  };

  it('Given the class assignments have not loaded yet (or failed), Then no Send button shows', () => {
    const { result, rerender } = renderHook(() => useLobbyWarmup(args));
    expect(result.current.active).toBe(false);
    isLoading = true;
    rerender();
    fetchError = 'boom';
    isLoading = false;
    rerender();
    expect(result.current.active).toBe(false);
  });

  it('Given the list turns out to be assigned already at send time, Then nothing is created', async () => {
    getClassroomAssignments.mockResolvedValue({ data: [{ id: 'A1', lesson_id: 'L1' }], error: null });
    const { result } = loaded();
    await act(async () => { await result.current.send(); });
    expect(createAssignment).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it('Given the class had no homework yet, When the warm-up is sent, Then the first-assignment event fires and the counts refresh', async () => {
    createAssignment.mockResolvedValue({ success: true });
    const { result } = loaded();
    await act(async () => { await result.current.send(); });
    expect(trackFirst).toHaveBeenCalledWith({ classroomId: 'c1' });
    expect(refresh).toHaveBeenCalled();
  });

  it('Given the warm-up was just sent and counts are not in yet, Then it says Sent instead of "0 of 0"', () => {
    assignments = [{ id: 'temp-1', lesson_id: 'L1', completion_count: 0, student_count: 0 }];
    const { result } = loaded();
    render(<LobbyWarmupStatus warmup={result.current} />);
    expect(screen.getByTestId('lobby-warmup-status')).toHaveTextContent('Warm-up sent');
  });

  it('Given no assignment for the picked list, When the teacher taps Send, Then a practice warm-up due tomorrow is created for that list', async () => {
    createAssignment.mockResolvedValue({ success: true });
    const { result } = loaded();
    render(<LobbyWarmupButton warmup={result.current} />);
    fireEvent.click(screen.getByTestId('lobby-warmup-send'));
    await waitFor(() => expect(createAssignment).toHaveBeenCalled());
    const sent = createAssignment.mock.calls[0][0];
    expect(sent).toEqual(expect.objectContaining({ classroom_id: 'c1', lesson_id: 'L1', teacher_id: 't1', assignment_type: 'practice', practice_focus: null }));
    expect(sent.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(capture).toHaveBeenCalledWith('teacher_warmup_sent', expect.objectContaining({ classroom_id: 'c1', source: 'lobby' }));
  });

  it('Given the list is already assigned, Then nothing is re-sent (real homework keeps its settings) and the status counts who practised', () => {
    assignments = [{ id: 'A1', lesson_id: 'L1', completion_count: 4, student_count: 12 }];
    const { result } = loaded();
    render(
      <>
        <LobbyWarmupButton warmup={result.current} />
        <LobbyWarmupStatus warmup={result.current} />
      </>
    );
    expect(screen.queryByTestId('lobby-warmup-send')).toBeNull();
    expect(screen.getByTestId('lobby-warmup-status')).toHaveTextContent('4 of 12 students warmed up');
    act(() => void result.current.send());
    expect(createAssignment).not.toHaveBeenCalled();
  });

  it('Given the free assignment cap, Then the button says so quietly instead of failing loudly', async () => {
    createAssignment.mockResolvedValue({ success: false, error: 'ASSIGNMENT_LIMIT_REACHED' });
    const { result, rerender } = loaded();
    await act(async () => { await result.current.send(); });
    rerender();
    render(<LobbyWarmupButton warmup={result.current} />);
    expect(screen.getByTestId('lobby-warmup-capped')).toBeInTheDocument();
  });

  it('Given no list picked, Then there is no warm-up button and no status', () => {
    const { result } = renderHook(() => useLobbyWarmup({ ...args, lessonId: null }));
    const { container } = render(
      <>
        <LobbyWarmupButton warmup={result.current} />
        <LobbyWarmupStatus warmup={result.current} />
      </>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
