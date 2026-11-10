import { describe, it, expect, beforeEach } from 'vitest';
import {
  useLessonClaimsStore,
  ingestLessonClaimsRound,
  ingestLessonClaim,
} from '../useLessonClaims';
import type { LessonClaimsView, LessonWordClaimedEvent } from '@/shared/types/lessonClaims';

const view = (roundId = 4, over: Partial<LessonClaimsView> = {}): LessonClaimsView => ({
  roundId,
  total: 2,
  claimedCount: 0,
  slots: [
    { index: 0, first: 'S', length: 5, claim: null },
    { index: 1, first: 'C', length: 4, claim: null },
  ],
  ...over,
});

const event = (over: Partial<LessonWordClaimedEvent> = {}): LessonWordClaimedEvent => ({
  roundId: 4, index: 0, word: 'storm', username: 'Noa', avatar: { emoji: '🦊' }, teamId: null,
  claimedCount: 1, total: 2, bonus: 3, ...over,
});

const state = () => useLessonClaimsStore.getState();

describe('lesson claims store', () => {
  beforeEach(() => ingestLessonClaimsRound({}));

  it('Given a round start with a claim list, When ingested, Then the list is held', () => {
    ingestLessonClaimsRound({ lessonClaims: view() });
    expect(state().view?.total).toBe(2);
  });

  it('Given a round start without a list, When ingested, Then last round\'s list is cleared', () => {
    ingestLessonClaimsRound({ lessonClaims: view() });
    ingestLessonClaimsRound({ gameMode: 'classic' });
    expect(state().view).toBeNull();
  });

  it('Given a live claim, When ingested, Then its slot flips and the count moves', () => {
    ingestLessonClaimsRound({ lessonClaims: view() });
    ingestLessonClaim(event());
    expect(state().view?.slots[0].claim?.username).toBe('Noa');
    expect(state().view?.claimedCount).toBe(1);
    expect(state().lastClaim?.word).toBe('storm');
  });

  it('Given a claim from the previous round arrives late, When ingested, Then it is ignored', () => {
    ingestLessonClaimsRound({ lessonClaims: view(5) });
    ingestLessonClaim(event({ roundId: 4 }));
    expect(state().view?.claimedCount).toBe(0);
    expect(state().lastClaim).toBeNull();
  });

  it('Given a claim after the round list was cleared (round over, next start had no race), When ingested, Then it is ignored', () => {
    ingestLessonClaim(event());
    expect(state().view).toBeNull();
    expect(state().lastClaim).toBeNull();
  });

  it('Given a reconnect payload already holding the claim, When the same live event replays, Then nothing toasts twice', () => {
    const claimed = view(4, { claimedCount: 1 });
    claimed.slots[0] = { ...claimed.slots[0], claim: { word: 'storm', username: 'Noa', avatar: null, teamId: null } };
    ingestLessonClaimsRound({ lessonClaims: claimed });
    ingestLessonClaim(event());
    expect(state().lastClaim).toBeNull();
  });

  it('Given a malformed payload, When ingested, Then it is treated as no race', () => {
    ingestLessonClaimsRound({ lessonClaims: { roundId: 'x' } });
    expect(state().view).toBeNull();
  });
});
