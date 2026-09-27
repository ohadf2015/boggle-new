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

let capturedBlastAdapterProps: Record<string, unknown> | null = null;
vi.mock('../desktop/BlastDesktopAdapter', () => ({
  BlastDesktopAdapter: (props: Record<string, unknown>) => {
    capturedBlastAdapterProps = props;
    return <div data-blast-shell>BlastDesktopAdapter</div>;
  },
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
import { useGameMode } from '../../../hooks/gameState/store';
import { getComboMultiplier } from '../../../shared/utils/scoring';

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
    (useGameMode as any).mockReturnValue('classic');
  });

  it('mounts StandardDesktopAdapter when desktop shell enabled + classic mode', () => {
    (useDesktopShellEnabled as any).mockReturnValue(true);
    const { container } = render(
      <MultiplayerInGameView {...(mkProps() as any)} />,
    );
    expect(container.querySelector('[data-mp-shell]')).toBeInTheDocument();
  });

  it('passes the canonical server combo multiplier to BlastDesktopAdapter (not the linear approximation)', () => {
    (useDesktopShellEnabled as any).mockReturnValue(true);
    (useGameMode as any).mockReturnValue('blast');
    capturedBlastAdapterProps = null;
    const comboLevel = 14; // linear formula would say 2.4×; server credits 2.25×
    render(
      <MultiplayerInGameView {...({ ...mkProps(), comboLevel } as any)} />,
    );
    expect(capturedBlastAdapterProps).not.toBeNull();
    expect(capturedBlastAdapterProps!.comboMultiplier).toBe(getComboMultiplier(comboLevel));
    expect(capturedBlastAdapterProps!.comboMultiplier).toBe(2.25);
  });

  it('mounts legacy InGameScreen when desktop shell disabled', () => {
    (useDesktopShellEnabled as any).mockReturnValue(false);
    const { getByTestId } = render(
      <MultiplayerInGameView {...(mkProps() as any)} />,
    );
    expect(getByTestId('in-game-screen')).toBeInTheDocument();
  });
});
