import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MultiplayerInGameView from '../MultiplayerInGameView';

vi.mock('../../../hooks/useDesktopShellEnabled', () => ({
  useDesktopShellEnabled: vi.fn(),
}));

vi.mock('../../../hooks/gameState/store', () => ({
  useGameMode: vi.fn(() => 'classic'),
  useGameStore: (sel: (s: { setBlastBoardClearedByLocal: () => void }) => unknown) => sel({ setBlastBoardClearedByLocal: () => {} }),
}));

vi.mock('../../../components/blast/legacy/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: vi.fn(() => ({
    config: {},
    initialTileStates: [],
    blastSeed: 0,
    waveNumber: 0,
  })),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  })),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    profile: { total_games: 0 },
  })),
}));

vi.mock('../../game/InGameScreen', () => ({
  default: ({ 'data-testid': testId }: any) => (
    <div data-testid={testId || 'in-game-screen'}>InGameScreen</div>
  ),
}));

vi.mock('../desktop/StandardDesktopAdapter', () => ({
  StandardDesktopAdapter: () => (
    <div data-mp-shell>StandardDesktopAdapter</div>
  ),
}));

vi.mock('../../OpponentWordFeed', () => ({
  OpponentWordFeed: () => null,
}));

vi.mock('../../../hooks/useOpponentWordFeed', () => ({
  useOpponentWordFeed: vi.fn(() => ({ feedItems: [] })),
}));

vi.mock('../../ErrorBoundaries', () => ({
  FeatureErrorBoundary: ({ children }: any) => children,
}));

import { useDesktopShellEnabled } from '../../../hooks/useDesktopShellEnabled';

const mkProps = () => ({
  letterGrid: [
    ['A', 'B'],
    ['C', 'D'],
  ],
  gameCode: 'TEST',
  username: 'u',
  leaderboard: [],
  foundWords: [],
  remainingTime: 60,
  totalTime: 180,
  onWordSubmit: vi.fn(),
  gameActive: true,
  t: (key: string) => key,
  isHost: false,
  socket: null,
  showStartAnimation: false,
  gameLanguage: 'en' as const,
  minWordLength: 2,
  comboLevel: 0,
  comboLevelRef: { current: 0 },
});

describe('MultiplayerInGameView desktop branch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mounts StandardDesktopAdapter when desktop shell enabled + classic mode', () => {
    (useDesktopShellEnabled as any).mockReturnValue(true);
    const { container } = render(
      <MultiplayerInGameView {...(mkProps() as any)} />,
    );
    expect(container.querySelector('[data-mp-shell]')).toBeInTheDocument();
  });

  it('mounts legacy InGameScreen when desktop shell disabled', () => {
    (useDesktopShellEnabled as any).mockReturnValue(false);
    const { getByTestId } = render(
      <MultiplayerInGameView {...(mkProps() as any)} />,
    );
    expect(getByTestId('in-game-screen')).toBeInTheDocument();
  });
});
