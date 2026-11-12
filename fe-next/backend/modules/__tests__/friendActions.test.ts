import { describe, it, expect, vi, beforeEach } from 'vitest';

const fm = vi.hoisted(() => ({
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  unfriend: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));
const caps = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => ({ notifyFriendRequest: vi.fn(), notifyFriendAccepted: vi.fn() }));
const requestRow = vi.hoisted(() => ({ value: { user_id: 'sender', friend_id: 'me' } as Record<string, string> | null }));

vi.mock('../friendsManager', () => fm);
vi.mock('../../utils/socialPolicyServer', () => ({ resolveUserSocialCapabilities: (...a: unknown[]) => caps(...a) }));
vi.mock('../pushNotificationTriggers', () => push);
vi.mock('../../utils/socialHelpers', () => ({ getUserProfile: async (id: string) => ({ username: id, displayName: null }) }));
vi.mock('../../utils/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../supabaseServer', () => ({
  getSupabase: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: requestRow.value }) }) }) }),
  }),
}));

import { runFriendAction } from '../friendActions';

const emitted: Array<[string, string]> = [];
const io = { to: (room: string) => ({ emit: (event: string) => { emitted.push([room, event]); } }) };

describe('runFriendAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emitted.length = 0;
    (globalThis as Record<string, unknown>).__lcIo = io;
    caps.mockResolvedValue({ friendManagement: true });
    push.notifyFriendRequest.mockResolvedValue(undefined);
    push.notifyFriendAccepted.mockResolvedValue(undefined);
    requestRow.value = { user_id: 'sender', friend_id: 'me' };
  });

  it('Given a restricted (child/unknown-age) account, When it sends a request, Then nothing is written', async () => {
    caps.mockResolvedValue({ friendManagement: false });
    const res = await runFriendAction('me', 'request', 'them');
    expect(res).toEqual({ success: false, code: 'SOCIAL_RESTRICTED' });
    expect(fm.sendFriendRequest).not.toHaveBeenCalled();
  });

  it('Given a restricted account, When it accepts a request, Then nothing is written', async () => {
    caps.mockResolvedValue({ friendManagement: false });
    expect((await runFriendAction('me', 'accept', 'req-1')).code).toBe('SOCIAL_RESTRICTED');
    expect(fm.acceptFriendRequest).not.toHaveBeenCalled();
  });

  it('Given a request to yourself, Then it is rejected', async () => {
    expect((await runFriendAction('me', 'request', 'me')).code).toBe('CANNOT_ADD_SELF');
  });

  it('Given a new request, Then the target is told live and by push, and the actor’s other tabs refresh', async () => {
    fm.sendFriendRequest.mockResolvedValue({ success: true, request: { requestId: 'r1' } });
    expect(await runFriendAction('me', 'request', 'them')).toEqual({ success: true });
    expect(emitted).toEqual(expect.arrayContaining([['user:them', 'friends:requestReceived'], ['user:me', 'friends:requestSent']]));
    expect(push.notifyFriendRequest).toHaveBeenCalledWith('them', 'me', 'me');
  });

  it('Given the target had already asked us, Then both sides learn it was accepted', async () => {
    fm.sendFriendRequest.mockResolvedValue({ success: true, autoAccepted: true, request: { requestId: 'r1' } });
    await runFriendAction('me', 'request', 'them');
    expect(emitted).toEqual(expect.arrayContaining([['user:them', 'friends:requestAccepted'], ['user:me', 'friends:requestAccepted']]));
    expect(push.notifyFriendAccepted).toHaveBeenCalled();
  });

  it('Given an accept, Then the original sender is told', async () => {
    fm.acceptFriendRequest.mockResolvedValue({ success: true });
    expect(await runFriendAction('me', 'accept', 'req-1')).toEqual({ success: true });
    expect(fm.acceptFriendRequest).toHaveBeenCalledWith('req-1', 'me');
    expect(emitted).toEqual(expect.arrayContaining([['user:sender', 'friends:requestAccepted']]));
  });

  it('Given a block of a friend, Then the friend only learns the friendship ended', async () => {
    fm.blockUser.mockResolvedValue({ success: true, wasFriends: true });
    await runFriendAction('me', 'block', 'them');
    expect(emitted).toEqual([['user:them', 'friends:friendRemoved'], ['user:me', 'friends:friendRemoved']]);
  });

  it('Given a manager rejection, Then its code is returned', async () => {
    fm.unblockUser.mockResolvedValue({ success: false, errorCode: 'NOT_BLOCKED' });
    expect(await runFriendAction('me', 'unblock', 'them')).toEqual({ success: false, code: 'NOT_BLOCKED' });
  });

  it('Given no socket server in this process, Then the write still succeeds', async () => {
    delete (globalThis as Record<string, unknown>).__lcIo;
    fm.unfriend.mockResolvedValue({ success: true });
    expect(await runFriendAction('me', 'unfriend', 'them')).toEqual({ success: true });
  });
});
