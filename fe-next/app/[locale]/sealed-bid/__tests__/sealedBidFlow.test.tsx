import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Heavy / environment deps mocked so the page renders in jsdom.
vi.mock('../../../../lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: { spawnCoinStream: vi.fn(), spawnBurst: vi.fn(), mount: vi.fn(), unmount: vi.fn() },
}));
vi.mock('../../../../components/daily/WordWheelPixiRing', () => ({ default: () => null }));
vi.mock('../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('../../../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn() }),
}));
vi.mock('../../../../contexts/CoinContext', () => ({
  useCoinActions: () => ({ addCoins: vi.fn().mockResolvedValue(0) }),
}));
vi.mock('../../../../contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));
vi.mock('../../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
  default: () => true,
}));
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'en' }) }));
vi.mock('../../../../components/game/GameStage', () => ({
  GameStage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import SealedBidPage from '../page';

describe('SealedBidPage (solo betting table)', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    }) as unknown as typeof fetch;
  });

  it('renders the bidding phase for all users (no admin gate)', () => {
    const { container } = render(<SealedBidPage />);
    // The word wheel dealt 7 tiles, and the bid controls are present — proving
    // the page is playable (no admin gate blocking render).
    const tiles = container.querySelectorAll('[data-wheel-letter]');
    expect(tiles.length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText('sealedBid.lockBid')).toBeTruthy();
    expect(screen.getByText('sealedBid.pass')).toBeTruthy();
  });

  it('shows the chip stack HUD', () => {
    render(<SealedBidPage />);
    expect(screen.getByTestId('chip-stack')).toBeTruthy();
  });
});
