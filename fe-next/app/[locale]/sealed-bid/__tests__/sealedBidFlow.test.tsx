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

vi.mock('../../../../components/sealedBid/SealedBidTable', () => ({
  default: () => (
    <div data-testid="sb-table">
      <div data-testid="sb-felt">Felt</div>
      <div data-testid="chip-tray">Chips</div>
      <button type="button" data-testid="sb-lock" disabled>
        Lock bid
      </button>
    </div>
  ),
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

  it('renders bidding phase with simplified HUD + casino table', async () => {
    render(<SealedBidPage />);
    await waitFor(() => {
      expect(screen.getByTestId('sb-hud')).toBeInTheDocument();
      expect(screen.getByTestId('sb-round')).toBeInTheDocument();
      expect(screen.getByTestId('sb-chip-stack')).toBeInTheDocument();
      expect(screen.getByTestId('sb-table')).toBeInTheDocument();
      expect(screen.getByTestId('sb-felt')).toBeInTheDocument();
    });
    // No dual title / badge chrome
    expect(screen.queryByText(/sealedBid\.badge/i)).not.toBeInTheDocument();
  });

  it('does not gate page for non-admin users (ungate check)', async () => {
    render(<SealedBidPage />);
    await waitFor(() => {
      expect(screen.queryByText(/adminOnly/i)).not.toBeInTheDocument();
    });
  });
});
