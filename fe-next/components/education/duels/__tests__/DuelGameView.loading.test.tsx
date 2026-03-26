/**
 * DuelGameView loading state tests — RED phase
 * Asserts that PageLoader is used instead of bare <Loader> + text div
 */

import { render, screen } from '@testing-library/react';
import { DuelGameView } from '../DuelGameView';
import { getDuelById } from '@/lib/supabase/education/duels';
import { useDuelSocket } from '@/hooks/useDuelSocket';

vi.mock('@/lib/supabase/education/duels');
vi.mock('@/hooks/useDuelSocket');

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'duels.loading': 'Loading...',
        'duels.loadingDuel': 'Loading your duel...',
      };
      return map[key] ?? key;
    },
    locale: 'en',
    dir: 'ltr',
  }),
}));

// Mock PageLoader so we can detect it reliably
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
}));

// Also mock the old Loader component in case it's still imported
vi.mock('@/components/ui/Loader', () => ({
  Loader: () => <div data-testid="legacy-loader" />,
}));

const mockGetDuelById = getDuelById as jest.MockedFunction<typeof getDuelById>;
const mockUseDuelSocket = useDuelSocket as jest.MockedFunction<typeof useDuelSocket>;

describe('DuelGameView — loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDuelSocket.mockReturnValue({
      socket: {} as any,
      isConnected: true,
      joinLobby: vi.fn(),
      leaveLobby: vi.fn(),
      createChallenge: vi.fn(),
      acceptChallenge: vi.fn(),
      declineChallenge: vi.fn(),
      cancelChallenge: vi.fn(),
      submitScore: vi.fn(),
      submitWord: vi.fn(),
      forfeitDuel: vi.fn(),
      syncState: vi.fn(),
      onChallengeReceived: vi.fn(),
      onLobbyUpdate: vi.fn(),
      onDuelAccepted: vi.fn(),
      onDuelDeclined: vi.fn(),
      onDuelCompleted: vi.fn(() => vi.fn()),
      onScoreSubmitted: vi.fn(() => vi.fn()),
      onError: vi.fn(() => vi.fn()),
      onDuelStarted: vi.fn(),
      onWordAccepted: vi.fn(),
      onWordRejected: vi.fn(),
      onOpponentProgress: vi.fn(),
      onOpponentDisconnected: vi.fn(),
      onOpponentReconnected: vi.fn(),
      onStateSynced: vi.fn(),
    });

    // Never resolve so component stays in loading phase
    mockGetDuelById.mockReturnValue(new Promise(() => {}));
  });

  it('renders PageLoader when loading duel data', () => {
    render(<DuelGameView duelId="duel-123" studentId="student-1" />);

    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows contextual loading text', () => {
    render(<DuelGameView duelId="duel-123" studentId="student-1" />);

    expect(screen.getByText('Loading your duel...')).toBeInTheDocument();
  });

  it('does not render game board while loading', () => {
    render(<DuelGameView duelId="duel-123" studentId="student-1" />);

    expect(screen.queryByTestId('duel-board-grid')).not.toBeInTheDocument();
  });
});
