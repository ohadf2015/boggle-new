import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const sfx = { playComboSound: vi.fn(), playLeadChangeSound: vi.fn(), playTimerHeartbeatSound: vi.fn() };
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfx }));

import { useRoundJuice } from '../useRoundJuice';

const behind = [{ username: 'Dana', score: 10 }, { username: 'Noa', score: 8 }];
const ahead = [{ username: 'Noa', score: 12 }, { username: 'Dana', score: 10 }];

function run(quietRank?: boolean) {
  sfx.playLeadChangeSound.mockClear();
  const hook = renderHook(({ standings }) => useRoundJuice({ meId: 'Noa', standings, remainingTime: 60, quietRank }), { initialProps: { standings: behind } });
  act(() => hook.rerender({ standings: ahead }));
  return hook.result.current;
}

describe('useRoundJuice quietRank', () => {
  it('Given a public game, When I take the lead, Then the lead banner, the pass callout and the sound fire as before', () => {
    const juice = run();
    expect(juice.banners.map((b) => b.text)).toEqual(['mpUi.round.tookLead']);
    expect(juice.callout?.text).toBe('mpUi.round.youPassed');
    expect(sfx.playLeadChangeSound).toHaveBeenCalledTimes(1);
  });

  it('Given a classroom duel owns the voice, When I take the overall lead, Then no rank banner, callout or sound, but the rank chip still flips', () => {
    const juice = run(true);
    expect(juice.banners).toEqual([]);
    expect(juice.callout).toBeNull();
    expect(sfx.playLeadChangeSound).not.toHaveBeenCalled();
    expect(juice.rankFlipKey).toBeDefined();
  });
});
