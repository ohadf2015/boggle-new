import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { publishLevelUp, showToast, refreshCoins } = vi.hoisted(() => ({
  publishLevelUp: vi.fn(),
  showToast: vi.fn(),
  refreshCoins: vi.fn(),
}));
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp }));
vi.mock('@/components/quests/QuestCompletionToast', () => ({ showQuestCompletionToast: showToast }));
vi.mock('@/contexts/CoinContext', () => ({ useCoinsFromContext: () => ({ refreshCoins }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/lib/quests/useQuestSound', () => ({ useQuestSound: () => vi.fn() }));

import { useAllQuestsCompleteClaim } from '../useAllQuestsCompleteClaim';

const serve = (body: Record<string, unknown>) => {
  const f = vi.fn().mockResolvedValue({ ok: true, json: async () => body });
  vi.stubGlobal('fetch', f);
  return f;
};

describe('useAllQuestsCompleteClaim', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('given daily and weekly both done, when mounted anywhere in the app, then it claims once and celebrates', async () => {
    const f = serve({ success: true, claimed: true, xpReward: 250, coinReward: 200, levelUp: { oldLevel: 12, newLevel: 13 } });
    const { rerender } = renderHook(() => useAllQuestsCompleteClaim(true, true, false));
    rerender();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ isAllComplete: true, xpReward: 250, goldReward: 200 })));
    expect(f).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenCalledWith('/api/quests/all-complete-claim', { method: 'POST' });
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 12, newLevel: 13 }, 'quests');
    expect(refreshCoins).toHaveBeenCalled();
  });

  it('stays quiet when the server says it was already claimed', async () => {
    const f = serve({ success: true, claimed: false, xpReward: 0, coinReward: 0 });
    renderHook(() => useAllQuestsCompleteClaim(true, true, false));
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect(showToast).not.toHaveBeenCalled();
  });

  it('does not ask while loading or while either side is unfinished', () => {
    const f = serve({});
    renderHook(() => useAllQuestsCompleteClaim(true, false, false));
    renderHook(() => useAllQuestsCompleteClaim(false, true, false));
    renderHook(() => useAllQuestsCompleteClaim(true, true, true));
    expect(f).not.toHaveBeenCalled();
  });
});
