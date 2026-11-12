import { renderHook } from '@testing-library/react';

const { mockPublishLevelUp, mockComplete } = vi.hoisted(() => ({ mockPublishLevelUp: vi.fn(), mockComplete: vi.fn(async () => undefined) }));
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp: mockPublishLevelUp }));
vi.mock('@/components/education/PracticeSessionProvider', () => ({ usePracticeSession: () => ({ completePracticeSession: mockComplete }) }));

import { useRecordedXp } from '../useRecordedXp';

function stubPatch(body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body })));
}

describe('useRecordedXp — player level-up', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('given the PATCH reports a level-up, when the round is recorded, then it is announced as practice', async () => {
    stubPatch({ session: { id: 's1', completed_at: '2026-11-12T00:00:00Z', xp_awarded: 30 }, levelUp: { oldLevel: 2, newLevel: 3 } });
    const { result } = renderHook(() => useRecordedXp());
    await result.current({ type: 'flashcard', sessionId: 's1', cardsReviewed: 5, cardsCorrect: 5 });
    expect(mockPublishLevelUp).toHaveBeenCalledWith({ oldLevel: 2, newLevel: 3 }, 'practice');
  });

  it('given no level-up, when the round is recorded, then nothing is announced', async () => {
    stubPatch({ session: { id: 's2', completed_at: '2026-11-12T00:00:00Z', xp_awarded: 30 }, levelUp: null });
    const { result } = renderHook(() => useRecordedXp());
    await result.current({ type: 'flashcard', sessionId: 's2', cardsReviewed: 5, cardsCorrect: 5 });
    expect(mockPublishLevelUp).not.toHaveBeenCalled();
  });
});
