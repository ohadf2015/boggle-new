/**
 * markTeacherLiveStarted — the "ran a live game" checklist step is stamped when a
 * room is actually created, once, and never throws into the socket handler.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockIs = vi.fn();
const mockEq = vi.fn(() => ({ is: mockIs }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ update: mockUpdate }));

vi.mock('../client', () => ({ getSupabase: vi.fn(() => ({ from: mockFrom })) }));
vi.mock('../../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { markTeacherLiveStarted } from '../teacherActivation';
import { getSupabase } from '../client';

describe('markTeacherLiveStarted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIs.mockResolvedValue({ error: null });
    (getSupabase as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
  });

  it('stamps the profile once, only while the column is still empty', async () => {
    await markTeacherLiveStarted('t1');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({ teacher_activation_live_started_at: expect.any(String) });
    expect(mockEq).toHaveBeenCalledWith('id', 't1');
    expect(mockIs).toHaveBeenCalledWith('teacher_activation_live_started_at', null);
  });

  it('never throws: a failed write, a thrown write or a missing client are all swallowed', async () => {
    mockIs.mockResolvedValueOnce({ error: { message: 'boom' } });
    await expect(markTeacherLiveStarted('t1')).resolves.toBeUndefined();
    mockIs.mockRejectedValueOnce(new Error('network'));
    await expect(markTeacherLiveStarted('t1')).resolves.toBeUndefined();
    (getSupabase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await expect(markTeacherLiveStarted('t1')).resolves.toBeUndefined();
  });

  it('ignores an empty teacher id', async () => {
    await markTeacherLiveStarted('');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
