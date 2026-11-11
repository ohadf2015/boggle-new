import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const getWithAuth = vi.hoisted(() => vi.fn(async () => ({ ok: true, json: async () => ({ reviews: [] }) })));
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

  it('given a student with no lesson words, when home loads, then no spaced-repetition request is sent', async () => {
    renderHook(() => useAcademyData('core'), { wrapper });
    await new Promise((r) => setTimeout(r, 20));
    expect(getWithAuth).not.toHaveBeenCalled();
  });

  it('given a lesson with words, when the bridge mounts, then it asks for that lesson and reports the due count', async () => {
    const onCount = vi.fn();
    render(<ReviewCountBridge lessonId="l1" words={['orbit', 'comet']} onCount={onCount} />, { wrapper });
    await waitFor(() => expect(getWithAuth).toHaveBeenCalledWith('/api/education/spaced-repetition?lessonId=l1'));
    await waitFor(() => expect(onCount).toHaveBeenCalledWith(2));
  });
});
