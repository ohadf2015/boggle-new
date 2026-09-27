import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { WordTowerVersus } from '../WordTowerVersus';

vi.mock('../WordTowerScene', () => ({ WordTowerScene: () => null }));
vi.mock('../WordTowerVersusRail', () => ({
  WordTowerVersusRail: ({ standings }: any) => (
    <div data-testid="versus-rail">
      {standings.map((s: any) => (
        <div key={s.id} data-testid={`rival-${s.id}`}>
          {s.username} {Math.round(s.heightM)}m
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
    dir: 'ltr'
  }),
}));

let socketHandlers: Record<string, (payload: unknown) => void>;
let emitMock: ReturnType<typeof vi.fn>;

function makeSocket() {
  socketHandlers = {};
  emitMock = vi.fn();
  return {
    id: 'test-sock-1',
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      socketHandlers[event] = handler;
    }),
    off: vi.fn(),
    emit: emitMock,
  } as unknown as import('socket.io-client').Socket;
}

describe('WordTowerVersus — height sync + reactions E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sync rival heights via towerStandings socket event', async () => {
    const socket = makeSocket();

    render(<WordTowerVersus socket={socket} username="Player1" />);

    // Initially waiting for state
    expect(screen.getByText('wordTower.versus.waiting')).toBeInTheDocument();

    // Simulate server initialization
    act(() => {
      socketHandlers['towerStateSync']?.({
        you: {
          tray: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          anchorLetter: 'A',
          scramblesLeft: 2,
          heightM: 10,
          combo: 0,
          floors: 3,
          bombCharge: 0,
        },
        standings: [
          { id: 'player1', username: 'Player1', heightM: 10, combo: 0 },
          { id: 'rival1', username: 'Rival1', heightM: 15, combo: 0 },
        ],
        endsAtMs: Date.now() + 300000,
      });
    });

    // Should now show player's height
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    // Verify rival rail has both players
    const rail = screen.getByTestId('versus-rail');
    expect(rail.textContent).toContain('Player1');
    expect(rail.textContent).toContain('Rival1');
    expect(rail.textContent).toContain('10m');
    expect(rail.textContent).toContain('15m');
  });

  it('should live-update rival heights via towerStandings broadcast', async () => {
    const socket = makeSocket();

    render(<WordTowerVersus socket={socket} username="Player1" />);

    // Initialize
    act(() => {
      socketHandlers['towerStateSync']?.({
        you: {
          tray: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          anchorLetter: 'A',
          scramblesLeft: 2,
          heightM: 10,
          combo: 0,
          floors: 3,
          bombCharge: 0,
        },
        standings: [
          { id: 'player1', username: 'Player1', heightM: 10, combo: 0 },
          { id: 'rival1', username: 'Rival1', heightM: 15, combo: 0 },
        ],
        endsAtMs: Date.now() + 300000,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    // Simulate Rival1 climbing to 20m via towerStandings broadcast
    act(() => {
      socketHandlers['towerStandings']?.({
        standings: [
          { id: 'player1', username: 'Player1', heightM: 10, combo: 0 },
          { id: 'rival1', username: 'Rival1', heightM: 20, combo: 0 },
        ],
      });
    });

    // Verify rival's height is updated to 20m
    await waitFor(() => {
      const rail = screen.getByTestId('versus-rail');
      expect(rail.textContent).toContain('20m');
      expect(rail.textContent).not.toContain('15m');
    });
  });

  it('should send and receive emoji reactions via quickReaction socket event', async () => {
    const socket = makeSocket();

    render(<WordTowerVersus socket={socket} username="Player1" />);

    // Initialize
    act(() => {
      socketHandlers['towerStateSync']?.({
        you: {
          tray: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          anchorLetter: 'A',
          scramblesLeft: 2,
          heightM: 10,
          combo: 0,
          floors: 3,
          bombCharge: 0,
        },
        standings: [
          { id: 'player1', username: 'Player1', heightM: 10, combo: 0 },
          { id: 'rival1', username: 'Rival1', heightM: 15, combo: 0 },
        ],
        endsAtMs: Date.now() + 300000,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    // Open reactions menu and send love reaction
    const reactionsButton = screen.getByRole('button', { name: 'reactions.label' });
    fireEvent.click(reactionsButton);

    const loveButton = screen.getByRole('button', { name: 'reactions.love' });
    fireEvent.click(loveButton);

    // Verify socket emit was called
    expect(emitMock).toHaveBeenCalledWith('quickReaction', {
      reactionId: 'love',
      username: 'Player1'
    });

    // Verify own reaction shows immediately
    expect(screen.getByText('Player1')).toBeInTheDocument();
  });

  it('should display incoming reactions from rivals', async () => {
    const socket = makeSocket();

    render(<WordTowerVersus socket={socket} username="Player1" />);

    // Initialize
    act(() => {
      socketHandlers['towerStateSync']?.({
        you: {
          tray: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          anchorLetter: 'A',
          scramblesLeft: 2,
          heightM: 10,
          combo: 0,
          floors: 3,
          bombCharge: 0,
        },
        standings: [
          { id: 'player1', username: 'Player1', heightM: 10, combo: 0 },
          { id: 'rival1', username: 'Rival1', heightM: 15, combo: 0 },
        ],
        endsAtMs: Date.now() + 300000,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    // Simulate incoming love reaction from Rival1
    act(() => {
      socketHandlers['quickReaction']?.({
        reactionId: 'love',
        username: 'Rival1',
      });
    });

    // Verify rival's reaction appears
    await waitFor(() => {
      expect(screen.getByText('Rival1')).toBeInTheDocument();
    });
  });

  it('should maintain height sync and reactions simultaneously', async () => {
    const socket = makeSocket();

    render(<WordTowerVersus socket={socket} username="Player1" />);

    // Initialize
    act(() => {
      socketHandlers['towerStateSync']?.({
        you: {
          tray: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          anchorLetter: 'A',
          scramblesLeft: 2,
          heightM: 10,
          combo: 0,
          floors: 3,
          bombCharge: 0,
        },
        standings: [
          { id: 'player1', username: 'Player1', heightM: 10, combo: 0 },
          { id: 'rival1', username: 'Rival1', heightM: 15, combo: 0 },
        ],
        endsAtMs: Date.now() + 300000,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    // Rival climbs while sending a reaction
    act(() => {
      socketHandlers['towerStandings']?.({
        standings: [
          { id: 'player1', username: 'Player1', heightM: 10, combo: 0 },
          { id: 'rival1', username: 'Rival1', heightM: 25, combo: 0 },
        ],
      });
    });

    // Then Rival sends a fire reaction
    act(() => {
      socketHandlers['quickReaction']?.({
        reactionId: 'fire',
        username: 'Rival1',
      });
    });

    // Both should be visible
    await waitFor(() => {
      const rail = screen.getByTestId('versus-rail');
      expect(rail.textContent).toContain('25m'); // Height updated
      expect(screen.getByText('Rival1')).toBeInTheDocument(); // Reaction shown
    });
  });
});
