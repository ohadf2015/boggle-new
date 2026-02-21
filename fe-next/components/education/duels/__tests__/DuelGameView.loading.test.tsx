/**
 * DuelGameView loading state tests — RED phase
 * Asserts that PageLoader is used instead of bare <Loader> + text div
 */

import { render, screen } from '@testing-library/react';
import { DuelGameView } from '../DuelGameView';
import { getDuelById } from '@/lib/supabase/education/duels';
import { useDuelSocket } from '@/hooks/useDuelSocket';

jest.mock('@/lib/supabase/education/duels');
jest.mock('@/hooks/useDuelSocket');

jest.mock('@/contexts/LanguageContext', () => ({
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
jest.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
}));

// Also mock the old Loader component in case it's still imported
jest.mock('@/components/ui/Loader', () => ({
  Loader: () => <div data-testid="legacy-loader" />,
}));

const mockGetDuelById = getDuelById as jest.MockedFunction<typeof getDuelById>;
const mockUseDuelSocket = useDuelSocket as jest.MockedFunction<typeof useDuelSocket>;

describe('DuelGameView — loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDuelSocket.mockReturnValue({
      socket: {} as any,
      isConnected: true,
      joinLobby: jest.fn(),
      leaveLobby: jest.fn(),
      createChallenge: jest.fn(),
      acceptChallenge: jest.fn(),
      declineChallenge: jest.fn(),
      cancelChallenge: jest.fn(),
      submitScore: jest.fn(),
      submitWord: jest.fn(),
      forfeitDuel: jest.fn(),
      syncState: jest.fn(),
      onChallengeReceived: jest.fn(),
      onLobbyUpdate: jest.fn(),
      onDuelAccepted: jest.fn(),
      onDuelDeclined: jest.fn(),
      onDuelCompleted: jest.fn(() => jest.fn()),
      onScoreSubmitted: jest.fn(() => jest.fn()),
      onError: jest.fn(() => jest.fn()),
      onDuelStarted: jest.fn(),
      onWordAccepted: jest.fn(),
      onWordRejected: jest.fn(),
      onOpponentProgress: jest.fn(),
      onOpponentDisconnected: jest.fn(),
      onOpponentReconnected: jest.fn(),
      onStateSynced: jest.fn(),
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
