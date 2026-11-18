import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type Estate, emptyEstate, repairCost } from '@/lib/wordTowerV2/estate';
import { PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';
import { finishDistrictPlan } from '@/lib/wordTowerV2/estateFinish';
import type { UseEstate } from '../../useEstate';
import { DistrictScreen } from '../DistrictScreen';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound: vi.fn() }) }));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => true }));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

const api = (estate: Estate, overrides: Partial<UseEstate> = {}) =>
  ({
    status: 'ready',
    authed: true,
    estate,
    perks: {},
    inbox: [],
    upgrade: vi.fn().mockResolvedValue({ ok: true, districtCompleted: false }),
    repair: vi.fn().mockResolvedValue({ ok: true, districtCompleted: false }),
    finishDistrict: vi.fn().mockResolvedValue({ ok: true, districtCompleted: true }),
    markSeen: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as UseEstate;

const buildButton = () => screen.getByRole('button', { name: /wordTowerV2\.estate\.upgrade/ });
const finishButton = () => screen.getByRole('button', { name: /wordTowerV2\.estate\.finishAll|wordTowerV2\.estate\.finishConfirm/ });
const rich = { ...emptyEstate(), coins: 1_000_000 };

describe('DistrictScreen spending', () => {
  it('given the request blows up, when building, then the button works again and the player is told', async () => {
    const upgrade = vi.fn().mockRejectedValue(new Error('boom'));
    render(<DistrictScreen t={t} estate={api(rich, { upgrade })} onClose={() => undefined} />);
    await act(async () => void fireEvent.click(buildButton()));
    expect(buildButton()).not.toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('wordTowerV2.estate.spendFailed');
  });

  it('given the build maxes the plot, then the next plot is selected so building can go on', async () => {
    const upgrade = vi.fn().mockResolvedValue({ ok: true, districtCompleted: false });
    const almost: Estate = { ...rich, plots: rich.plots.map((p) => (p.slot === 'foundation' ? { ...p, level: 4 } : p)) };
    const built: Estate = { ...rich, plots: rich.plots.map((p) => (p.slot === 'foundation' ? { ...p, level: 5 } : p)) };
    const { rerender } = render(<DistrictScreen t={t} estate={api(almost, { upgrade })} onClose={() => undefined} />);
    await act(async () => void fireEvent.click(buildButton()));
    rerender(<DistrictScreen t={t} estate={api(built, { upgrade })} onClose={() => undefined} />);
    expect(screen.getAllByTestId(`plot-card-${PLOT_SLOTS[1]}`)[0]).toHaveAttribute('data-selected', 'true');
  });

  it('given enough coins, then the whole district price is shown and takes a second tap to spend', async () => {
    const finishDistrict = vi.fn().mockResolvedValue({ ok: true, districtCompleted: false });
    render(<DistrictScreen t={t} estate={api(rich, { finishDistrict })} onClose={() => undefined} />);
    expect(finishButton()).toHaveTextContent(finishDistrictPlan(rich)!.coins.toLocaleString());
    fireEvent.click(finishButton());
    expect(finishDistrict).not.toHaveBeenCalled();
    expect(finishButton()).toHaveTextContent('wordTowerV2.estate.finishConfirm');
    await act(async () => void fireEvent.click(finishButton()));
    expect(finishDistrict).toHaveBeenCalledTimes(1);
  });

  it('given a maxed first plot and no coins, when opened, then the next unfinished plot is shown', () => {
    const e: Estate = { ...emptyEstate(), plots: emptyEstate().plots.map((p) => (p.slot === 'foundation' ? { ...p, level: 5 } : p)) };
    render(<DistrictScreen t={t} estate={api(e)} onClose={() => undefined} />);
    expect(screen.getAllByTestId(`plot-card-${PLOT_SLOTS[1]}`)[0]).toHaveAttribute('data-selected', 'true');
  });

  it('given too few coins, then the finish button is off and says how many are missing', () => {
    const price = finishDistrictPlan(emptyEstate())!.coins;
    render(<DistrictScreen t={t} estate={api({ ...emptyEstate(), coins: price - 10 })} onClose={() => undefined} />);
    expect(finishButton()).toBeDisabled();
    expect(screen.getByText('wordTowerV2.estate.need:{"n":"10"}')).toBeInTheDocument();
  });

  it('given a damaged plot and no coins, then the repair says how many are missing', () => {
    const broken: Estate = { ...emptyEstate(), plots: emptyEstate().plots.map((p) => (p.slot === 'foundation' ? { ...p, level: 3, damaged: true } : p)) };
    render(<DistrictScreen t={t} estate={api(broken)} onClose={() => undefined} />);
    const missing = repairCost(1, 'foundation', 3).toLocaleString();
    expect(screen.getAllByText(`wordTowerV2.estate.need:{"n":"${missing}"}`).length).toBeGreaterThan(0);
  });
});
