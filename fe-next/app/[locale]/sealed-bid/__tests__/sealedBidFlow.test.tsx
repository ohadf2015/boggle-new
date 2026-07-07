'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SealedBidPage from '../page';

// Mock heavy deps
vi.mock('../../../../lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: {
    spawnCoinStream: vi.fn(),
    spawnBurst: vi.fn(),
    mount: vi.fn(),
    unmount: vi.fn(),
  },
}));

vi.mock('../../../../components/daily/WordWheelPixiRing', () => ({
  default: () => null,
}));

vi.mock('../../../../components/sealedBid/SealedBidWheel', () => ({
  default: () => <div data-testid="sealed-bid-wheel">Wheel</div>,
}));

vi.mock('../../../../components/sealedBid/OddsBoard', () => ({
  default: () => <div data-testid="odds-board">Odds</div>,
}));

vi.mock('../../../../components/sealedBid/ChipTray', () => ({
  default: () => <div data-testid="chip-tray">Chips</div>,
}));

vi.mock('../../../../components/sealedBid/Showdown', () => ({
  default: () => <div data-testid="showdown">Showdown</div>,
}));

vi.mock('../../../../components/sealedBid/SealedBidSessionSummary', () => ({
  SealedBidSessionSummary: () => <div data-testid="summary">Summary</div>,
}));

vi.mock('../../../../components/sealedBid/SealedBidShareCard', () => ({
  SealedBidShareCard: () => <div data-testid="share-card">Share</div>,
}));

vi.mock('../../../../components/game/GameStage', () => ({
  GameStage: ({ children, header, footer }: any) => (
    <div>
      {header}
      {children}
      {footer}
    </div>
  ),
}));

vi.mock('../../../../components/game/ScreenFlashOverlay', () => ({
  ScreenFlashOverlay: () => null,
}));

vi.mock('../../../../components/tutorial/ModeCoach', () => ({
  ModeCoach: () => null,
}));

vi.mock('../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, opts?: any) => {
      // Simple fallback: return key if no translation, or opts.n for count tests
      if (opts?.n) return `Round ${opts.n}/${opts.total}`;
      if (opts?.score) return `Score: ${opts.score}`;
      if (key === 'sealedBid.round') return 'Round';
      if (key === 'sealedBid.chips') return 'Chips';
      if (key === 'sealedBid.lockBid') return 'Lock Bid';
      if (key === 'sealedBid.pass') return 'Pass';
      if (key === 'sealedBid.busted') return 'Busted';
      if (key === 'sealedBid.cashOut') return 'Cash Out';
      return key;
    },
    language: 'en',
  }),
}));

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    canSeeInWorkModes: false,
  }),
}));

vi.mock('../../../../contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

vi.mock('../../../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: vi.fn(),
  }),
}));

vi.mock('../../../../contexts/CoinContext', () => ({
  useCoinActions: () => ({
    addCoins: vi.fn().mockResolvedValue(10),
  }),
}));

vi.mock('../../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('SealedBidFlow (smoke test)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    });
  });

  it('renders bidding phase with wheel and chip tray', async () => {
    render(<SealedBidPage />);
    await waitFor(() => {
      // Check for game stage / round counter
      expect(screen.getByText(/Round/i)).toBeInTheDocument();
    });
  });

  it('does not gate page for non-admin users (ungate check)', async () => {
    render(<SealedBidPage />);
    await waitFor(() => {
      // Should NOT show admin-only message
      expect(screen.queryByText(/adminOnly/i)).not.toBeInTheDocument();
    });
  });
});
