import { describe, expect, it } from 'vitest';
import { roomGoneFeedback } from '../roomGoneFeedback';

// Regression: a user who followed a friend's invite link to a room that no
// longer exists was silently dropped on an empty lobby with zero feedback
// (PageClient onError only toasted when `isActive`). The reported "empty page"
// URL `/multiplayer?utm_source=solo-confirm&...` is the post-strip state of a
// dead-invite auto-join. This helper decides what feedback that user gets.
describe('roomGoneFeedback', () => {
  it('tells an active player their room timed out (no code needed)', () => {
    const fb = roomGoneFeedback({ wasActive: true, cameFromInvite: true, roomCode: 'ABC123' });
    expect(fb).toEqual({ key: 'multiplayerFlow.roomTimedOut', icon: '⏱️' });
  });

  it('active state wins even when there is no invite param', () => {
    const fb = roomGoneFeedback({ wasActive: true, cameFromInvite: false, roomCode: '' });
    expect(fb).toEqual({ key: 'multiplayerFlow.roomTimedOut', icon: '⏱️' });
  });

  it('tells a cold invite-follower the specific room is gone, with the code', () => {
    const fb = roomGoneFeedback({ wasActive: false, cameFromInvite: true, roomCode: 'ZZTEST9' });
    expect(fb).toEqual({ key: 'invite.toast.notFound', params: { code: 'ZZTEST9' }, icon: '🔍' });
  });

  it('falls back to a generic expired message when the code is already gone', () => {
    const fb = roomGoneFeedback({ wasActive: false, cameFromInvite: true, roomCode: '' });
    expect(fb).toEqual({ key: 'invite.toast.expired', icon: '🔍' });
  });

  it('stays silent for a stale lobby tap (not active, not an invite follow)', () => {
    const fb = roomGoneFeedback({ wasActive: false, cameFromInvite: false, roomCode: 'ABC123' });
    expect(fb).toBeNull();
  });
});
