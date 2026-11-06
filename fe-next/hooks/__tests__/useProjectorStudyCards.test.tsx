/**
 * @vitest-environment happy-dom
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (...a: unknown[]) => fetchWithAuth(...a) }));

import { useProjectorStudyCards } from '../useProjectorStudyCards';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('useProjectorStudyCards', () => {
  beforeEach(() => fetchWithAuth.mockReset());

  it('Given a room with a deck, Then it reads the cards with the teacher session only', async () => {
    fetchWithAuth.mockResolvedValue(ok({ cards: [{ word: 'orbit', definition: 'a path' }, { nope: 1 }] }));
    const { result } = renderHook(() => useProjectorStudyCards('TZCOQ7', true));
    await waitFor(() => expect(result.current).toEqual([{ word: 'orbit', definition: 'a path' }]));
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/education/classroom/live-game/cards?code=TZCOQ7', expect.objectContaining({ requireSession: true }));
  });

  it('Given no deck, Then nothing is requested', () => {
    const { result } = renderHook(() => useProjectorStudyCards('TZCOQ7', false));
    expect(result.current).toEqual([]);
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });

  it('Given the request fails, Then the wall simply shows no words', async () => {
    fetchWithAuth.mockResolvedValue(new Response(null, { status: 403 }));
    const { result } = renderHook(() => useProjectorStudyCards('TZCOQ7', true));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});
