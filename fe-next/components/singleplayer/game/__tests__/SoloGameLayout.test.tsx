import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

// The board, word strip and overlays are covered by their own suites; here they
// are stand-ins so the test reads the layout's own decisions.
vi.mock('@/components/GridComponent', () => ({
  default: (p: { interactive: boolean }) => (
    <div data-testid="grid" data-interactive={String(p.interactive)} />
  ),
}));
vi.mock('@/components/game/in-game/components/WordFormingAreaConnected', () => ({
  WordFormingAreaConnected: () => <div data-testid="word-forming" />,
}));
vi.mock('@/components/game/in-game/components/GameOverlays', () => ({
  GameOverlays: () => null,
}));
vi.mock('@/components/game/FloatingScoreAnimation', () => ({ default: () => null }));
vi.mock('@/components/game/ComboMilestoneAnnouncement', () => ({ ComboMilestoneAnnouncement: () => null }));
vi.mock('@/contexts/AccessibilityContext', () => ({
  useHapticsEnabled: () => false,
  useShouldReduceMotion: () => true,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));

import { SoloGameLayout, type SoloGameLayoutProps } from '../SoloGameLayout';

const t = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as SoloGameLayoutProps['t'];

function props(over: Partial<SoloGameLayoutProps> = {}): SoloGameLayoutProps {
  return {
    grid: [['A', 'B'], ['C', 'D']],
    language: 'en',
    score: 12,
    remainingTime: 45,
    totalSeconds: 60,
    isPaused: false,
    isGameOver: false,
    bots: [{ name: 'BrainBot', score: 8 }],
    foundWords: [],
    comboLevel: 0,
    lastWordFoundTime: 0,
    fireRoundActive: false,
    fireRoundRemaining: 0,
    earthquakeState: 'idle',
    currentFeedback: null,
    highlightedPath: [],
    isDesktop: false,
    awaitingStart: false,
    onStart: vi.fn(),
    onWordSubmit: vi.fn(),
    onWordChange: vi.fn(),
    onExit: vi.fn(),
    onPauseToggle: vi.fn(),
    gameStatsRef: { current: null },
    t,
    ...over,
  };
}

describe('SoloGameLayout', () => {
  it('sizes the board from its OWN slot, not the whole column', () => {
    // GIVEN a running game
    render(<SoloGameLayout {...props()} />);
    // THEN the board slot is the size container the board measures against —
    // the old shell measured the whole center column and squashed the board
    // to 330x240 on a 375x667 phone.
    const slot = screen.getByTestId('solo-slot-board');
    expect(slot.className).toContain('[container-type:size]');
    expect(slot.className).toContain('flex-1');
    expect(slot.className).toContain('min-h-0');
  });

  it('shows the race: player score vs the bot, leader flagged', () => {
    render(<SoloGameLayout {...props({ score: 12, bots: [{ name: 'BrainBot', score: 8 }] })} />);
    const race = screen.getByTestId('solo-race');
    expect(within(race).getByText('12')).toBeInTheDocument();
    expect(within(race).getByText('8')).toBeInTheDocument();
    expect(within(race).getByText('BrainBot')).toBeInTheDocument();
    expect(race.getAttribute('data-leader')).toBe('player');
  });

  it('flags the bot as leader when it is ahead', () => {
    render(<SoloGameLayout {...props({ score: 3, bots: [{ name: 'BrainBot', score: 9 }] })} />);
    expect(screen.getByTestId('solo-race').getAttribute('data-leader')).toBe('bot');
  });

  it('renders the clock as m:ss and marks the last 10 seconds urgent', () => {
    const { rerender } = render(<SoloGameLayout {...props({ remainingTime: 65 })} />);
    expect(screen.getByTestId('solo-timer').textContent).toContain('1:05');
    expect(screen.getByTestId('solo-timer').getAttribute('data-urgent')).toBe('false');
    rerender(<SoloGameLayout {...props({ remainingTime: 9 })} />);
    expect(screen.getByTestId('solo-timer').getAttribute('data-urgent')).toBe('true');
  });

  it('has no clock in untimed play', () => {
    render(<SoloGameLayout {...props({ remainingTime: null, bots: [] })} />);
    expect(screen.queryByTestId('solo-timer')).toBeNull();
  });

  it('holds the board behind a start card until the player taps Start', () => {
    // GIVEN a new round waiting for the player
    const onStart = vi.fn();
    render(<SoloGameLayout {...props({ awaitingStart: true, onStart })} />);
    // THEN the board is not playable and the start card explains the round
    expect(screen.getByTestId('grid').getAttribute('data-interactive')).toBe('false');
    const card = screen.getByTestId('solo-start-card');
    expect(within(card).getByText(/singlePlayer\.startCard\.titleOne/)).toBeInTheDocument();
    expect(within(card).getByText('singlePlayer.dragInstruction')).toBeInTheDocument();
    // WHEN they tap Start
    fireEvent.click(within(card).getByRole('button', { name: 'singlePlayer.startGame' }));
    // THEN the round begins
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('board is playable once started, and not while paused', () => {
    const { rerender } = render(<SoloGameLayout {...props()} />);
    expect(screen.getByTestId('grid').getAttribute('data-interactive')).toBe('true');
    rerender(<SoloGameLayout {...props({ isPaused: true })} />);
    expect(screen.getByTestId('grid').getAttribute('data-interactive')).toBe('false');
  });

  it('lists found words newest first with a count, valid words only', () => {
    const w = (word: string, ts: number, isValid: boolean | null = true) =>
      ({ word, score: word.length, timestamp: ts, timeSinceStart: ts, isValid });
    render(<SoloGameLayout {...props({ foundWords: [w('cat', 1), w('zzz', 2, false), w('tree', 3)] })} />);
    const feed = screen.getByTestId('solo-slot-words');
    const items = within(feed).getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('tree');
    expect(items[1]).toContain('cat');
    expect(items.join()).not.toContain('zzz');
  });

  it('never renders chat — solo has no room', () => {
    render(<SoloGameLayout {...props()} />);
    expect(screen.queryByText(/chat/i)).toBeNull();
  });

  it('exit and pause are labelled buttons', () => {
    const onExit = vi.fn();
    const onPauseToggle = vi.fn();
    render(<SoloGameLayout {...props({ onExit, onPauseToggle })} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.exit' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.pause' }));
    expect(onExit).toHaveBeenCalled();
    expect(onPauseToggle).toHaveBeenCalled();
  });
});
