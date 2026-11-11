import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const db = vi.hoisted(() => ({
  row: { chosen_title: 'LETTER_SCOUT' } as Record<string, unknown> | null,
  selectError: null as { message: string } | null,
  updateError: null as { message: string } | null,
  updates: [] as unknown[],
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: db.selectError ? null : db.row, error: db.selectError }),
        }),
      }),
      update: (u: unknown) => {
        db.updates.push(u);
        return { eq: async () => ({ error: db.updateError }) };
      },
    }),
  },
}));
const capture = vi.hoisted(() => vi.fn());
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: capture }));

import { useChosenTitle, __resetChosenTitleForTests } from '../useChosenTitle';

describe('useChosenTitle', () => {
  beforeEach(() => {
    __resetChosenTitleForTests();
    db.row = { chosen_title: 'LETTER_SCOUT' };
    db.selectError = null;
    db.updateError = null;
    db.updates = [];
  });

  it('loads the chosen title for the user', async () => {
    const { result } = renderHook(() => useChosenTitle('u1'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.title).toBe('LETTER_SCOUT');
  });

  it('a failed read is an error state, not "no title"', async () => {
    db.selectError = { message: 'column does not exist' };
    const { result } = renderHook(() => useChosenTitle('u1'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.title).toBeNull();
  });

  it('saving updates the title and fires title_picked', async () => {
    const { result } = renderHook(() => useChosenTitle('u1'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.save('WORD_SEEKER');
    });
    expect(db.updates).toEqual([{ chosen_title: 'WORD_SEEKER' }]);
    expect(result.current.title).toBe('WORD_SEEKER');
    expect(capture).toHaveBeenCalledWith('title_picked', { title: 'WORD_SEEKER' });
  });

  it('a rejected save keeps the old title and reports failure', async () => {
    db.updateError = { message: 'title is not unlocked' };
    const { result } = renderHook(() => useChosenTitle('u1'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    let ok = true;
    await act(async () => {
      ok = await result.current.save('ETERNAL_CHAMPION');
    });
    expect(ok).toBe(false);
    expect(result.current.title).toBe('LETTER_SCOUT');
  });
});
