/**
 * Playing a quick round must lock the body height chain and hide the global
 * bottom nav (setIsInGame) — otherwise classic/wheel/blast sit under the nav
 * with nested page scroll and look "off" vs daily/solo.
 */
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickModeAdapter } from '../QuickModeAdapter';
import type { QuickRoundConfig } from '../../types';

const setIsInGame = vi.fn();

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => setIsInGame,
}));

vi.mock('@/components/singleplayer/SinglePlayerGame', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-classic" />,
}));
vi.mock('@/components/daily/DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-hunt" />,
}));
vi.mock('@/components/daily/WordWheelGame', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-wheel" />,
}));
vi.mock('../BlastQuickRound', () => ({
  BlastQuickRound: () => <div data-testid="mock-blast" />,
}));

const base = {
  seed: 's-ingame',
  language: 'en',
  durationSec: 60,
  grid: [['A', 'B'], ['C', 'D']],
  totalWords: 4,
  perfectScore: 50,
} as const;

describe('QuickModeAdapter — in-game chrome lock', () => {
  beforeEach(() => setIsInGame.mockClear());

  it('sets isInGame true on mount and clears on unmount', () => {
    const { unmount } = render(
      <QuickModeAdapter
        config={{ mode: 'classic', ...base } as QuickRoundConfig}
        onDone={vi.fn()}
        onQuit={vi.fn()}
      />
    );
    expect(setIsInGame).toHaveBeenCalledWith(true);
    unmount();
    expect(setIsInGame).toHaveBeenCalledWith(false);
  });
});
