import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  INVITE_REF_KEY,
  captureInviteRef,
  peekInviteRef,
  clearInviteRef,
  consumePendingInviteRef,
} from '../inviteRef';

const realDateNow = Date.now;

function setNow(ms: number) {
  Date.now = () => ms;
}

describe('inviteRef', () => {
  beforeEach(() => {
    localStorage.clear();
    setNow(1_700_000_000_000);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Date.now = realDateNow;
  });

  describe('captureInviteRef', () => {
    it('persists a ref username to localStorage with timestamp', () => {
      captureInviteRef('alice');
      const raw = localStorage.getItem(INVITE_REF_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.username).toBe('alice');
      expect(parsed.ts).toBe(1_700_000_000_000);
    });

    it('ignores empty / null / whitespace usernames', () => {
      captureInviteRef('');
      captureInviteRef(null);
      captureInviteRef('   ');
      expect(localStorage.getItem(INVITE_REF_KEY)).toBeNull();
    });

    it('does not overwrite a self-referral (currentUsername === ref)', () => {
      captureInviteRef('bob', 'bob');
      expect(localStorage.getItem(INVITE_REF_KEY)).toBeNull();
    });

    it('case-insensitive self-referral check', () => {
      captureInviteRef('Alice', 'alice');
      expect(localStorage.getItem(INVITE_REF_KEY)).toBeNull();
    });

    it('sanitizes username (trim + first match) — rejects values with non-username chars', () => {
      captureInviteRef('<script>alert</script>');
      expect(localStorage.getItem(INVITE_REF_KEY)).toBeNull();
    });

    it('overwrites a stale ref with a new one', () => {
      captureInviteRef('alice');
      captureInviteRef('bob');
      expect(peekInviteRef()).toBe('bob');
    });
  });

  describe('peekInviteRef', () => {
    it('returns null when nothing is stored', () => {
      expect(peekInviteRef()).toBeNull();
    });

    it('returns the username when fresh', () => {
      captureInviteRef('alice');
      expect(peekInviteRef()).toBe('alice');
    });

    it('returns null when the ref is older than 7 days', () => {
      captureInviteRef('alice');
      // jump 8 days
      setNow(1_700_000_000_000 + 8 * 86_400_000);
      expect(peekInviteRef()).toBeNull();
    });

    it('returns null on malformed JSON', () => {
      localStorage.setItem(INVITE_REF_KEY, 'not-json');
      expect(peekInviteRef()).toBeNull();
    });
  });

  describe('clearInviteRef', () => {
    it('removes the stored ref', () => {
      captureInviteRef('alice');
      clearInviteRef();
      expect(peekInviteRef()).toBeNull();
    });
  });

  describe('consumePendingInviteRef', () => {
    it('returns null when no ref is stored', async () => {
      const result = await consumePendingInviteRef({
        searchUsers: vi.fn(),
        sendFriendRequest: vi.fn(),
      });
      expect(result).toBeNull();
    });

    it('looks up the user by username and sends a friend request', async () => {
      captureInviteRef('alice');
      const search = vi
        .fn()
        .mockResolvedValue([{ username: 'alice', odUserId: 'u-123' }]);
      const send = vi.fn().mockResolvedValue({ success: true });

      const result = await consumePendingInviteRef({
        searchUsers: search,
        sendFriendRequest: send,
      });

      expect(search).toHaveBeenCalledWith('alice');
      expect(send).toHaveBeenCalledWith('u-123');
      expect(result).toEqual({ username: 'alice', success: true });
      // ref should be cleared after success
      expect(peekInviteRef()).toBeNull();
    });

    it('matches case-insensitively when searchUsers returns mixed case', async () => {
      captureInviteRef('alice');
      const search = vi
        .fn()
        .mockResolvedValue([{ username: 'Alice', odUserId: 'u-123' }]);
      const send = vi.fn().mockResolvedValue({ success: true });

      const result = await consumePendingInviteRef({
        searchUsers: search,
        sendFriendRequest: send,
      });

      expect(send).toHaveBeenCalledWith('u-123');
      expect(result?.success).toBe(true);
    });

    it('clears the ref and returns notFound when user lookup is empty', async () => {
      captureInviteRef('ghost');
      const search = vi.fn().mockResolvedValue([]);
      const send = vi.fn();

      const result = await consumePendingInviteRef({
        searchUsers: search,
        sendFriendRequest: send,
      });

      expect(send).not.toHaveBeenCalled();
      expect(result).toEqual({ username: 'ghost', success: false, reason: 'not_found' });
      expect(peekInviteRef()).toBeNull();
    });

    it('clears the ref when sendFriendRequest fails (avoid retry loop)', async () => {
      captureInviteRef('alice');
      const search = vi
        .fn()
        .mockResolvedValue([{ username: 'alice', odUserId: 'u-123' }]);
      const send = vi
        .fn()
        .mockResolvedValue({ success: false, error: 'already-friends' });

      const result = await consumePendingInviteRef({
        searchUsers: search,
        sendFriendRequest: send,
      });

      expect(result).toEqual({
        username: 'alice',
        success: false,
        reason: 'send_failed',
        error: 'already-friends',
      });
      expect(peekInviteRef()).toBeNull();
    });
  });
});
