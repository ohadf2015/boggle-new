/**
 * getClassroomMembershipLevel — the per-student differentiation tier the server
 * hands each socket on join. Must default to 'core' on any miss (no row, error,
 * no client, garbage value) so a lookup failure never changes gameplay.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ eq: mockEq, maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('../client', () => ({ getSupabase: vi.fn(() => ({ from: mockFrom })) }));

import { getClassroomMembershipLevel } from '../classroomMembership';
import { getSupabase } from '../client';

describe('getClassroomMembershipLevel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockImplementation(() => ({ eq: mockEq, maybeSingle: mockMaybeSingle }));
    mockSelect.mockImplementation(() => ({ eq: mockEq }));
    mockFrom.mockImplementation(() => ({ select: mockSelect }));
    (getSupabase as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
  });

  it('reads level from classroom_memberships for (classroom_id, student_id)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { level: 'support' }, error: null });
    expect(await getClassroomMembershipLevel('s1', 'c1')).toBe('support');
    expect(mockFrom).toHaveBeenCalledWith('classroom_memberships');
    expect(mockSelect).toHaveBeenCalledWith('level');
    expect(mockEq).toHaveBeenCalledWith('classroom_id', 'c1');
    expect(mockEq).toHaveBeenCalledWith('student_id', 's1');
  });

  it("defaults to 'core' on no row, error, unknown value, and missing client", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await getClassroomMembershipLevel('s1', 'c1')).toBe('core');

    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    expect(await getClassroomMembershipLevel('s1', 'c1')).toBe('core');

    mockMaybeSingle.mockResolvedValueOnce({ data: { level: 'hard' }, error: null });
    expect(await getClassroomMembershipLevel('s1', 'c1')).toBe('core');

    (getSupabase as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
    expect(await getClassroomMembershipLevel('s1', 'c1')).toBe('core');
  });
});
