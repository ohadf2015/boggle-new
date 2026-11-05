const { mockGetSupabase } = vi.hoisted(() => ({ mockGetSupabase: vi.fn() }));
vi.mock('../../modules/supabase/client.js', () => ({ getSupabase: mockGetSupabase }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkInWorkModeAccess } from '../gameStartRound';

function supabaseWithProfile(profile: Record<string, unknown>) {
  const single = vi.fn(() => Promise.resolve({ data: profile }));
  return { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) })) };
}

const socket = { data: {} } as never;
const room = (isClassroom: boolean) => ({ isClassroom, users: { teacher: { isHost: true, authUserId: 'u-teacher' } } }) as never;

describe('crossword beta gate', () => {
  beforeEach(() => mockGetSupabase.mockReturnValue(supabaseWithProfile({ is_admin: false, is_beta_tester: false })));

  it('lets any teacher run crossword in a classroom room', async () => {
    expect(await checkInWorkModeAccess(socket, room(true), 'crossword', 'he')).toBeNull();
  });

  it('still refuses a language crossword has no grid for, even in class', async () => {
    expect(await checkInWorkModeAccess(socket, room(true), 'crossword', 'fr' as never)).toMatch(/language/);
  });

  it('still refuses a non-beta host in an arcade room', async () => {
    expect(await checkInWorkModeAccess(socket, room(false), 'crossword', 'en')).toBe('Crossword is in beta');
  });

  it('keeps other beta modes gated in a classroom room', async () => {
    expect(await checkInWorkModeAccess(socket, room(true), 'word-tower', 'en')).not.toBeNull();
  });
});
