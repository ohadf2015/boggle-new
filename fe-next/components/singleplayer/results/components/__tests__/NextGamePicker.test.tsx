import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextGamePicker } from '../NextGamePicker';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

describe('NextGamePicker — choose the next game without leaving single player', () => {
  beforeEach(() => trackGrowthEvent.mockClear());

  it('Given a solo-bots win on EASY, When rendered, Then four options show with rematch-harder first', () => {
    render(<NextGamePicker mode="solo-bots" difficulty="EASY" isWinner onStartPreset={vi.fn()} onReplaySame={vi.fn()} />);
    const options = screen.getAllByTestId(/^next-game-/);
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveAttribute('data-testid', 'next-game-rematch-harder');
    expect(screen.getByTestId('next-game-practice')).toHaveAttribute('href', '/en/singleplayer?autoStart=practice');
    expect(screen.getByTestId('next-game-daily')).toHaveAttribute('href', '/en/daily');
  });

  it('Given the harder rematch is tapped, When handled, Then the preset starts in-page and the pick is tracked', () => {
    const onStartPreset = vi.fn();
    render(<NextGamePicker mode="solo-bots" difficulty="EASY" isWinner onStartPreset={onStartPreset} onReplaySame={vi.fn()} />);
    fireEvent.click(screen.getByTestId('next-game-rematch-harder'));
    expect(onStartPreset).toHaveBeenCalledWith('competitive');
    expect(trackGrowthEvent).toHaveBeenCalledWith('next_game_picked', expect.objectContaining({ option: 'rematch-harder', preset: 'competitive' }));
  });

  it('Given "same again" is tapped, When handled, Then the current setup replays', () => {
    const onReplaySame = vi.fn();
    render(<NextGamePicker mode="solo-bots" difficulty="EASY" isWinner={false} onStartPreset={vi.fn()} onReplaySame={onReplaySame} />);
    fireEvent.click(screen.getByTestId('next-game-rematch-same'));
    expect(onReplaySame).toHaveBeenCalledTimes(1);
  });

  it('Given a link option is tapped, When handled, Then the pick is tracked with its destination', () => {
    render(<NextGamePicker mode="solo-bots" difficulty="EASY" isWinner onStartPreset={vi.fn()} onReplaySame={vi.fn()} />);
    fireEvent.click(screen.getByTestId('next-game-daily'));
    expect(trackGrowthEvent).toHaveBeenCalledWith('next_game_picked', expect.objectContaining({ option: 'daily', href: '/en/daily' }));
  });
});
