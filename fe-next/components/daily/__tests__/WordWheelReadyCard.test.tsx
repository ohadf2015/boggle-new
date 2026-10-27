import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import WordWheelReadyCard from '../WordWheelReadyCard';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const base = {
  t,
  centerLetter: 'N',
  outerLetters: ['W', 'G', 'H', 'A', 'I', 'T'],
  puzzleNumber: 285,
  streakDays: 0,
  onPlay: vi.fn(),
};

describe('WordWheelReadyCard', () => {
  beforeEach(() => { localStorage.clear(); });

  it('names its place in the daily trail', () => {
    render(<WordWheelReadyCard {...base} />);
    expect(screen.getByTestId('ready-step').textContent).toContain('daily.journeyStepOf');
  });

  it('Given a player who saw the how-to on an earlier visit, When the card mounts, Then it stays closed', () => {
    localStorage.setItem('lc:wheel-howto-seen', '1');
    render(<WordWheelReadyCard {...base} autoShowHowTo />);
    expect(screen.queryByTestId('wheel-howto')).toBeNull();
  });

  it('Given a first-time player, When the card mounts, Then the how-to shows, is remembered at show time, and survives a remount in the same visit', () => {
    const { unmount } = render(<WordWheelReadyCard {...base} autoShowHowTo />);
    expect(screen.getByTestId('wheel-howto')).toBeInTheDocument();
    expect(localStorage.getItem('lc:wheel-howto-seen')).toBe('1');
    unmount();
    render(<WordWheelReadyCard {...base} autoShowHowTo />);
    expect(screen.getByTestId('wheel-howto')).toBeInTheDocument();
  });

  it('Given a returning player, When they tap How to play, Then the how-to opens and PLAY still starts the day', () => {
    const onPlay = vi.fn();
    render(<WordWheelReadyCard {...base} onPlay={onPlay} />);
    expect(screen.queryByTestId('wheel-howto')).toBeNull();
    fireEvent.click(screen.getByTestId('ready-howto-link'));
    expect(screen.getByTestId('wheel-howto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'daily.play' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('offers a practice wheel, except when already practising', () => {
    const { rerender } = render(<WordWheelReadyCard {...base} />);
    expect(screen.getByTestId('ready-practice-link').getAttribute('href')).toBe('/en/daily/word-wheel?practice=1');
    rerender(<WordWheelReadyCard {...base} isPractice />);
    expect(screen.queryByTestId('ready-practice-link')).toBeNull();
  });

  it('names today\'s puzzle and starts it from one PLAY button', () => {
    const onPlay = vi.fn();
    render(<WordWheelReadyCard {...base} onPlay={onPlay}><div data-testid="board" /></WordWheelReadyCard>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('wordWheel.title');
    expect(screen.getByText(/daily\.puzzleNumber/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'daily.play' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('board')).toBeInTheDocument();
  });

  it('lists the three rules once, not as separate chips', () => {
    render(<WordWheelReadyCard {...base} />);
    const rules = screen.getByTestId('ready-rules');
    expect(rules.textContent).toContain('wordWheel.centerLetterRule');
    expect(rules.textContent).toContain('wordWheel.minLetters');
    expect(rules.textContent).toContain('wordWheel.timeLimit');
  });

  it('shows the streak only when there is one', () => {
    const { rerender } = render(<WordWheelReadyCard {...base} />);
    expect(screen.queryByTestId('ready-streak')).toBeNull();
    rerender(<WordWheelReadyCard {...base} streakDays={4} />);
    expect(screen.getByTestId('ready-streak').textContent).toContain('"count":4');
  });

  it('hides the outer letters until play starts', () => {
    render(<WordWheelReadyCard {...base} />);
    const tiles = screen.getAllByTestId('preview-outer-letter');
    expect(tiles).toHaveLength(6);
    tiles.forEach((tile, i) => expect(tile.textContent).not.toContain(base.outerLetters[i]));
    expect(screen.getByText('N')).toBeInTheDocument();
  });
});
