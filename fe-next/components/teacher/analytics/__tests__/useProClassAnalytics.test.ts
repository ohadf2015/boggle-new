import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: vi.fn() }));

import { fetchWithAuth } from '@/utils/authFetch';
import { useProClassAnalytics } from '../useProClassAnalytics';

const metrics = { studentsNeedingHelp: 0, classAverageXp: 10, activeStudentsToday: 1, weeklyEngagement: 0, totalStudents: 2, commonMistakes: [] };
const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;

beforeEach(() => vi.clearAllMocks());

describe('useProClassAnalytics', () => {
  it('reads the dashboard through the Pro-gated server route', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(reply(200, { ok: true, metrics }));
    const { result } = renderHook(() => useProClassAnalytics({ classroomId: 'c1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/education/classroom/c1/analytics');
    expect(result.current.metrics).toEqual(metrics);
    expect(result.current.error).toBeNull();
  });

  it('reports a 402 as an error, never as empty metrics', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(reply(402, { ok: false, error: 'Teacher Pro required' }));
    const { result } = renderHook(() => useProClassAnalytics({ classroomId: 'c1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.metrics).toBeNull();
    expect(result.current.error?.message).toBe('Teacher Pro required');
  });

  it('refresh asks the server again', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(reply(200, { ok: true, metrics }));
    const { result } = renderHook(() => useProClassAnalytics({ classroomId: 'c1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.refresh(); });
    expect(fetchWithAuth).toHaveBeenCalledTimes(2);
  });
});
