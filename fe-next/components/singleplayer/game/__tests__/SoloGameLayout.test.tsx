import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

// The board, word strip and overlays are covered by their own suites; here they
// are stand-ins so the test reads the layout's own decisions.
vi.mock('@/components/GridComponent', () => ({
  default: (p: { interactive: boolean; highlightedPath?: Array<{ row: number; col: number }> }) => (
    <div data-testid="grid" data-interactive={String(p.interactive)} data-highlight={JSON.stringify(p.highlightedPath ?? [])} />
  ),
}));
vi.mock('@/components/game/in-game/components/WordFormingAreaConnected', () => ({
  WordFormingAreaConnected: (p: { isTypingMode: boolean; typedWord: string }) => (
    <div data-testid="word-forming" data-typing={String(p.isTypingMode)} data-typed={p.typedWord} />
  ),
}));
vi.mock('@/components/game/in-game/components/GameOverlays', () => ({
  GameOverlays: (p: { isPlaying: boolean }) => <div data-testid="overlays" data-playing={String(p.isPlaying)} />,
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

  it('reserves the missions slot even with no missions so the board cannot shift', () => {
    render(<SoloGameLayout {...props({ soloMissions: undefined, soloChrome: undefined })} />);
    const slot = document.querySelector('[data-solo-slot="missions"]');
    expect(slot).not.toBeNull();
    expect(slot?.className).toContain('min-h-[2.25rem]');
  });

  describe('desktop game shell', () => {
    const w = (word: string, ts: number, score = word.length) =>
      ({ word, score, timestamp: ts, timeSinceStart: ts, isValid: true });

    it('wraps the board in the shared shell: race on the left, found words on the right', () => {
      render(<SoloGameLayout {...props({ score: 12, bots: [{ name: 'BrainBot', score: 8 }], foundWords: [w('cat', 1), w('tree', 2, 9)] })} />);
      expect(screen.getByTestId('game-shell').getAttribute('data-game-shell')).toBe('classic');
      const left = screen.getByTestId('game-shell-left');
      expect(within(left).getByTestId('shell-standing-you').getAttribute('data-me')).toBe('true');
      expect(within(left).getByTestId('shell-standing-bot-0')).toBeInTheDocument();
      const right = screen.getByTestId('game-shell-right');
      const rows = within(right).getAllByTestId(/^shell-word-row-/);
      expect(rows[0].getAttribute('data-word')).toBe('tree');
      expect(within(rows[0]).getByText('+9')).toBeInTheDocument();
      expect(screen.getByTestId('game-shell-stage').contains(screen.getByTestId('solo-slot-board'))).toBe(true);
    });

    it('teaches keyboard play beside the board', () => {
      render(<SoloGameLayout {...props()} />);
      expect(within(screen.getByTestId('game-shell-left')).getByTestId('shell-keys')).toBeInTheDocument();
    });

    it('shows the typed word on the board strip and lights its path while typing', () => {
      render(
        <SoloGameLayout
          {...props({ isTypingMode: true, typedWord: 'AB', keyboardHighlight: [{ row: 0, col: 0 }, { row: 0, col: 1 }] })}
        />,
      );
      const strip = screen.getByTestId('word-forming');
      expect(strip.getAttribute('data-typing')).toBe('true');
      expect(strip.getAttribute('data-typed')).toBe('AB');
      expect(JSON.parse(screen.getByTestId('grid').getAttribute('data-highlight') ?? '[]')).toHaveLength(2);
    });
  });

  it('flags the shell while a lesson runs, so wide screens can lift it over the board', () => {
    const { rerender } = render(<SoloGameLayout {...props()} />);
    const shell = () => document.querySelector('[data-solo-slot="bar"]')?.parentElement;
    expect(shell()).not.toHaveAttribute('data-lesson');
    rerender(<SoloGameLayout {...props({ soloLessonActive: true })} />);
    expect(shell()).toHaveAttribute('data-lesson', 'on');
  });

  it('keeps the desktop typing tips out of the way while a lesson runs', () => {
    const { rerender } = render(<SoloGameLayout {...props()} />);
    expect(screen.getByTestId('overlays')).toHaveAttribute('data-playing', 'true');
    rerender(<SoloGameLayout {...props({ soloLessonActive: true })} />);
    expect(screen.getByTestId('overlays')).toHaveAttribute('data-playing', 'false');
  });
});
