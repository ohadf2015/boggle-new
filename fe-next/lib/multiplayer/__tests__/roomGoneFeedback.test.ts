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

  // The silent branch this replaces was deliberate ("stale lobby taps stay
  // silent as before") and prod disagreed. 14d of PostHog: 46 people hit a
  // `gone` join error 232 times — 5.2 attempts each — and 42 of 54 error
  // sessions had NO `room=` in the URL, so they landed here and got nothing.
  // `/multiplayer` is also the #1 rageclick page in the product (65 users).
  // Two distinct populations reach this branch and BOTH need a message:
  //   1. a stale lobby tap — the dead row vanishes from the list with no words;
  //   2. an invite follow RE-tapping after PageClient already stripped `room=`
  //      from the URL, which flips `cameFromInvite` to false on every attempt
  //      after the first. That is the 2026-05-25 "empty page" regression this
  //      helper was written to fix, leaking back in through the retry path.
  it('names the dead room on a stale lobby tap (not active, not an invite follow)', () => {
    const fb = roomGoneFeedback({ wasActive: false, cameFromInvite: false, roomCode: 'ABC123' });
    expect(fb).toEqual({ key: 'invite.toast.notFound', params: { code: 'ABC123' }, icon: '🔍' });
  });

  it('still says something when a stale tap has no code left to name', () => {
    const fb = roomGoneFeedback({ wasActive: false, cameFromInvite: false, roomCode: '' });
    expect(fb).toEqual({ key: 'multiplayerFlow.roomTimedOut', icon: '⏱️' });
  });

  it('never returns null — every gone-room error gets user-visible feedback', () => {
    for (const wasActive of [true, false]) {
      for (const cameFromInvite of [true, false]) {
        for (const roomCode of ['ABC123', '']) {
          expect(roomGoneFeedback({ wasActive, cameFromInvite, roomCode })).not.toBeNull();
        }
      }
    }
  });
});
