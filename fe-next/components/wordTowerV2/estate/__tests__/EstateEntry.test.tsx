import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/translations/en.js';
import { emptyEstate, perksFromEstate } from '@/lib/wordTowerV2/estate';
import { PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';
import { createRun } from '@/lib/wordTowerV2/run';
import { V2Results } from '../../V2Results';
import { EstateButton } from '../EstateButton';
import { PerkChips } from '../PerkChips';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound: vi.fn() }) }));

const t = (key: string, params?: Record<string, string | number>) => {
  const raw = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
  const str = typeof raw === 'string' ? raw : key;
  return Object.entries(params ?? {}).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), str);
};

describe('empire entry points', () => {
  it('given coins and waiting work, when the hud button renders, then it shows the balance and a badge', () => {
    const estate = { ...emptyEstate(), coins: 1240 };
    const onOpen = vi.fn();
    render(<EstateButton t={t} estate={estate} raids={2} onOpen={onOpen} />);
    const button = screen.getByRole('button', { name: en.wordTowerV2.estate.open });
    expect(button.textContent).toContain('1,240');
    // 2 raids + all five level-0 plots affordable at 1,240 coins.
    expect(button.textContent).toContain('7');
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalled();
  });

  it('given the results card, when an extra node is passed, then it is reachable from the results screen', () => {
    render(
      <V2Results
        t={t}
        peakM={12}
        score={100}
        bestM={12}
        isBest={false}
        run={createRun(1)}
        badges={[]}
        unlocked={new Set()}
        onRestart={() => undefined}
        extra={<EstateButton t={t} estate={emptyEstate()} raids={0} variant="panel" onOpen={() => undefined} />}
      />,
    );
    expect(screen.getByRole('button', { name: new RegExp(en.wordTowerV2.estate.open, 'i') })).toBeTruthy();
  });

  it('given built plots, when the run chip row renders, then each perk is stated in words', () => {
    const estate = { ...emptyEstate(), plots: PLOT_SLOTS.map((slot) => ({ slot, level: 5, damaged: false })) };
    render(<PerkChips t={t} perks={perksFromEstate(estate)} onOpen={() => undefined} />);
    expect(screen.getByRole('button').textContent).toContain('% steadier');
  });

  it('given a fresh estate, when the run chip row renders, then it invites the player to build', () => {
    render(<PerkChips t={t} perks={perksFromEstate(emptyEstate())} onOpen={() => undefined} />);
    expect(screen.getByRole('button').textContent).toBe(en.wordTowerV2.estate.perksNone);
  });
});
