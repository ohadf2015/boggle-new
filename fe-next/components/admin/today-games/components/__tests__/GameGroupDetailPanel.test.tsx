import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameGroupDetailPanel } from '../GameGroupDetailPanel';
import type { GameGroup, GamePlayer } from '@/lib/admin/gameLog/groupGames';

const mockT = (key: string, fallback: string) => fallback;

const mockGamePlayer = (overrides?: Partial<GamePlayer>): GamePlayer => ({
  key: 'player1',
  playerId: 'user123',
  guestSessionId: null,
  isGuest: false,
  displayName: 'Alice',
  profile: null,
  isHost: true,
  role: 'host',
  invitedByName: null,
  score: 100,
  wordCount: 5,
  isWinner: null,
  country: 'IL',
  platform: 'web',
  deviceType: 'iPhone',
  os: 'iOS',
  browser: 'Safari',
  userAgent: null,
  acquisition: { kind: 'direct', rawLabel: null, tooltip: '' },
  status: 'completed',
  errorReason: null,
  eventCount: 2,
  firstSeen: '2026-05-30T10:00:00Z',
  ...overrides,
});

const mockGameGroup = (overrides?: Partial<GameGroup>): GameGroup => ({
  key: 'game1',
  gameCode: 'ABC123',
  isMultiplayer: true,
  isRanked: false,
  modeRaw: 'classic',
  typeBucket: 'multiplayer',
  language: 'en',
  createdAt: '2026-05-30T10:00:00Z',
  endedAt: '2026-05-30T10:05:00Z',
  status: 'completed',
  host: mockGamePlayer(),
  hostAcquisition: { kind: 'direct', rawLabel: null, tooltip: '' },
  players: [
    mockGamePlayer(),
    mockGamePlayer({ key: 'player2', displayName: 'Bob', playerId: 'user456', isHost: false }),
  ],
  playerCount: 2,
  botCount: null,
  topScore: 100,
  totalWords: 10,
  errorReasons: [],
  ...overrides,
});

describe('GameGroupDetailPanel', () => {
  it('renders game code', () => {
    const group = mockGameGroup({ gameCode: 'XYZ789' });
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(screen.getByText('XYZ789', { exact: false })).toBeInTheDocument();
  });

  it('renders players list header', () => {
    const group = mockGameGroup();
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(screen.getByText('Players', { exact: false })).toBeInTheDocument();
  });

  it('renders all players with names', () => {
    const group = mockGameGroup();
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(screen.getByText('Alice', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Bob', { exact: false })).toBeInTheDocument();
  });

  it('shows error reasons if present', () => {
    const group = mockGameGroup({ errorReasons: ['Network timeout', 'Invalid move'] });
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(screen.getByText('Network timeout, Invalid move', { exact: false })).toBeInTheDocument();
  });

  it('shows host crown for host player', () => {
    const group = mockGameGroup();
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    // Host row should have crown emoji
    const aliceSection = screen.getByText('Alice', { exact: false }).closest('div');
    expect(aliceSection?.textContent).toContain('👑');
  });

  it('shows winner badge for winning player', () => {
    const group = mockGameGroup({
      players: [
        mockGamePlayer({ displayName: 'Alice', isWinner: true }),
        mockGamePlayer({ key: 'player2', displayName: 'Bob', isWinner: false }),
      ],
    });
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(screen.getByText('Winner', { exact: false })).toBeInTheDocument();
  });

  it('shows a "Left mid-game" badge for an abandoned player (explains 0/0)', () => {
    const group = mockGameGroup({
      players: [
        mockGamePlayer({ status: 'abandoned', displayName: 'Alice', score: 0, wordCount: 0 }),
      ],
    });
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(screen.getByText('Left mid-game', { exact: false })).toBeInTheDocument();
  });

  it('shows who invited a non-host multiplayer player', () => {
    const group = mockGameGroup({
      players: [
        mockGamePlayer({ key: 'p2', displayName: 'Bob', isHost: false, invitedByName: 'Alice' }),
      ],
    });
    const { container } = render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(container.textContent).toContain('Invited by');
    expect(container.textContent).toContain('Alice');
  });

  it('shows error status badge for errored player', () => {
    const group = mockGameGroup({
      players: [
        mockGamePlayer({ status: 'errored', displayName: 'Alice' }),
      ],
    });
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(screen.getByText('Error', { exact: false })).toBeInTheDocument();
  });

  it('displays player scores and word counts', () => {
    const group = mockGameGroup({
      players: [mockGamePlayer({ displayName: 'Alice', score: 250, wordCount: 12 })],
    });
    const { container } = render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(container.textContent).toContain('250');
    expect(container.textContent).toContain('12');
  });

  it('shows country flag and code when available', () => {
    const group = mockGameGroup({
      players: [mockGamePlayer({ country: 'IL' })],
    });
    const { container } = render(<GameGroupDetailPanel group={group} t={mockT} />);

    // Check that country info is in the rendered output
    const countryText = container.textContent;
    expect(countryText).toContain('IL');
  });

  it('shows platform label for web', () => {
    const group = mockGameGroup({
      players: [mockGamePlayer({ platform: 'web', displayName: 'Alice' })],
    });
    const { container } = render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(container.textContent).toContain('Web');
  });

  it('shows platform label for native', () => {
    const group = mockGameGroup({
      players: [mockGamePlayer({ platform: 'ios', displayName: 'Alice' })],
    });
    const { container } = render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(container.textContent).toContain('Native');
  });

  it('shows device information', () => {
    const group = mockGameGroup({
      players: [mockGamePlayer({ deviceType: 'iPhone', os: 'iOS', browser: 'Safari', displayName: 'Alice' })],
    });
    const { container } = render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(container.textContent).toContain('iPhone');
    expect(container.textContent).toContain('iOS');
    expect(container.textContent).toContain('Safari');
  });

  it('shows player error reason if present', () => {
    const group = mockGameGroup({
      players: [mockGamePlayer({ errorReason: 'Crash on submit', displayName: 'Alice' })],
    });
    const { container } = render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(container.textContent).toContain('Crash on submit');
  });

  it('shows guest badge for guest players', () => {
    const group = mockGameGroup({
      players: [mockGamePlayer({ isGuest: true, displayName: 'Guest Player' })],
    });
    const { container } = render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(container.textContent).toContain('Guest');
  });

  it('renders profile link for authenticated players', () => {
    const group = mockGameGroup({
      players: [mockGamePlayer({ playerId: 'user123', displayName: 'Alice' })],
    });
    render(<GameGroupDetailPanel group={group} t={mockT} />);

    const profileLink = screen.getByText('Profile', { exact: false }).closest('a');
    expect(profileLink).toHaveAttribute('href', '/admin/players/user123');
  });

  it('shows session ID for guest sessions', () => {
    const group = mockGameGroup({
      players: [
        mockGamePlayer({
          playerId: null,
          guestSessionId: 'guest_1234567890123_abcdefghij',
          displayName: 'Guest User',
        }),
      ],
    });
    const { container } = render(<GameGroupDetailPanel group={group} t={mockT} />);

    expect(container.textContent).toContain('Session');
    expect(container.textContent).toContain('guest_123456');
  });
});
