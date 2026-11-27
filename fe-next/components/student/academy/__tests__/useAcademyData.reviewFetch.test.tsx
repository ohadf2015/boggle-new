import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const getWithAuth = vi.hoisted(() =>
  vi.fn(async (_url: string) => ({ ok: true, json: async () => ({ today: '2026-11-10', dueCount: 2, words: [], lessons: [] }) })),
);
const lessons = vi.hoisted(() => ({ list: [] as unknown[] }));

vi.mock('@/utils/authFetch', () => ({ getWithAuth }));
vi.mock('@/hooks/useStudentProgress', () => ({ useStudentProgress: () => ({ lessons: lessons.list, isLoading: false }) }));
vi.mock('@/hooks/usePracticeLessons', () => ({ usePracticeLessons: () => ({ lessons: [], isLoading: false }) }));
vi.mock('@/hooks/useWinStreak', () => ({ useWinStreak: () => ({ currentStreak: 0, isStreakAtRisk: false, lastWinDate: null }) }));

import { useAcademyData } from '../useAcademyData';
import { ReviewCountBridge } from '../ReviewCountBridge';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('student home review count fetch', () => {
  beforeEach(() => {
    getWithAuth.mockClear();
    lessons.list = [];
  });

  it('given a student with no lesson words, when home loads, then no word-memory request is sent', async () => {
    renderHook(() => useAcademyData('core'), { wrapper });
    await new Promise((r) => setTimeout(r, 20));
    expect(getWithAuth).not.toHaveBeenCalled();
  });

  it('given a lesson, when the bridge mounts, then it reports the SERVER due count for that lesson, and nothing before it lands', async () => {
    let release: () => void = () => {};
    getWithAuth.mockImplementationOnce(
      (_url: string) =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true, json: async () => ({ today: '2026-11-10', dueCount: 3, words: [], lessons: [] }) });
        }),
    );
    const onCount = vi.fn();
    render(<ReviewCountBridge lessonId="l1" onCount={onCount} />, { wrapper });
    await waitFor(() => expect(getWithAuth).toHaveBeenCalledWith('/api/education/word-memory?lessonId=l1'));
    expect(onCount).not.toHaveBeenCalled();
    release();
    await waitFor(() => expect(onCount).toHaveBeenCalledWith(3));
  });

  it('given a lesson whose words were never reviewed, when the bridge mounts, then nothing is due (new words are not due words)', async () => {
    getWithAuth.mockResolvedValueOnce({ ok: true, json: async () => ({ today: '2026-11-10', dueCount: 0, words: [], lessons: [] }) });
    const onCount = vi.fn();
    render(<ReviewCountBridge lessonId="l1" onCount={onCount} />, { wrapper });
    await waitFor(() => expect(onCount).toHaveBeenCalledWith(0));
  });

  it('given the read fails, when the bridge mounts, then the count resolves to 0 so home never waits forever', async () => {
    getWithAuth.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const onCount = vi.fn();
    render(<ReviewCountBridge lessonId="l1" onCount={onCount} />, { wrapper });
    await waitFor(() => expect(onCount).toHaveBeenCalledWith(0));
  });
});
