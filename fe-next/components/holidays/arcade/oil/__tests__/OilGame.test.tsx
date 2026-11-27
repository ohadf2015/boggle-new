import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
const sfx = new Proxy({}, { get: () => vi.fn() });
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfx }));
vi.mock('@/hooks/fastValidateWord', () => ({ fastValidateWord: vi.fn(async () => true) }));
vi.mock('@/lib/holidays/holidayClient', () => ({ noticeHolidayWord: vi.fn() }));

const fx = { paused: false, reduced: false, burstAt: vi.fn(), floatAt: vi.fn(), cheer: vi.fn() };
vi.mock('../../ArcadeShell', () => ({ useArcadeFx: () => fx }));
const loop = { tick: (_dt: number) => {} };
vi.mock('../../useArcadeLoop', () => ({ useArcadeLoop: (tick: (dt: number) => void) => { loop.tick = tick; } }));

import OilGame from '../OilGame';

describe('OilGame menorah', () => {
  it('Given night 1 survived, when night 2 begins, then the second candle ignites with a burst and the cheer names night 2', () => {
    render(<OilGame content={{ rack: 'ABCDEFGHI'.split('') }} lang="en" onScore={vi.fn()} onEnd={vi.fn()} />);
    act(() => {
      for (let i = 0; i < 121; i++) loop.tick(0.1);
    });
    const target = fx.burstAt.mock.calls.find((c) => c[1] === 'coin')?.[0] as HTMLElement | null;
    expect(target?.dataset.slot).toBe('1');
    expect(target?.dataset.lit).toBe('true');
    expect(fx.cheer).toHaveBeenCalledWith('holiday.arcade.oil.nightLit:{"night":2}');
  });
});
