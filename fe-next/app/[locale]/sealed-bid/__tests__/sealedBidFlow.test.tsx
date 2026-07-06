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
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en' }),
  useRouter: () => ({ replace: replaceMock }),
}));
vi.mock('../../../../components/game/GameStage', () => ({
  GameStage: ({
    children,
    header,
    footer,
  }: {
    children: React.ReactNode;
    header?: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div>
      {header}
      {children}
      {footer}
    </div>
  ),
}));

// Mutable auth state so we can exercise both the beta and non-beta branches.
let authState = { canSeeInWorkModes: true, loading: false };
vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

import SealedBidPage from '../page';

describe('SealedBidPage (solo betting table, beta-gated)', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    authState = { canSeeInWorkModes: true, loading: false };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    }) as unknown as typeof fetch;
  });

  it('renders the bidding phase for beta users', () => {
    const { container } = render(<SealedBidPage />);
    const tiles = container.querySelectorAll('[data-wheel-letter]');
    expect(tiles.length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText('sealedBid.lockBid')).toBeTruthy();
    expect(screen.getByText('sealedBid.pass')).toBeTruthy();
  });

  it('shows the chip stack HUD for beta users', () => {
    render(<SealedBidPage />);
    expect(screen.getByTestId('chip-stack')).toBeTruthy();
  });

  it('gates non-beta users: no game, redirects home', () => {
    authState = { canSeeInWorkModes: false, loading: false };
    const { container } = render(<SealedBidPage />);
    expect(container.querySelectorAll('[data-wheel-letter]').length).toBe(0);
    expect(screen.queryByTestId('chip-stack')).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/en');
  });

  it('renders nothing while auth is still loading (no flash)', () => {
    authState = { canSeeInWorkModes: false, loading: true };
    const { container } = render(<SealedBidPage />);
    expect(container.querySelectorAll('[data-wheel-letter]').length).toBe(0);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
