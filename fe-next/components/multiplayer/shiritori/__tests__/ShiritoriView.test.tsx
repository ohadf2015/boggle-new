/**
 * ShiritoriView presentational tests — turn gating, chain/required-head display,
 * submit, and the IME composition guard (Enter at keyCode 229 must NOT submit a
 * half-composed kana reading). Spec: docs/2026-05-21-shiritori-mode-spec.md.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShiritoriView, { type ShiritoriViewProps } from '../ShiritoriView';

const baseProps = (over: Partial<ShiritoriViewProps> = {}): ShiritoriViewProps => ({
  chain: ['しりとり', 'りんご'],
  requiredHead: 'ご',
  players: [
    { username: 'me', eliminated: false },
    { username: 'bob', eliminated: false },
  ],
  currentPlayer: 'me',
  me: 'me',
  finished: false,
  winner: null,
  lastError: null,
  onSubmit: vi.fn(),
  t: (k: string) => k,
  ...over,
});

describe('ShiritoriView', () => {
  it('shows the required head kana and the chain history', () => {
    render(<ShiritoriView {...baseProps()} />);
    expect(screen.getByTestId('required-head').textContent).toBe('ご');
    expect(screen.getByText('しりとり')).toBeTruthy();
    expect(screen.getByText('りんご')).toBeTruthy();
  });

  it('enables input on my turn and submits the typed word', () => {
    const onSubmit = vi.fn();
    render(<ShiritoriView {...baseProps({ onSubmit })} />);
    const input = screen.getByLabelText('shiritori.inputLabel') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    fireEvent.change(input, { target: { value: 'ごりら' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
    expect(onSubmit).toHaveBeenCalledWith('ごりら');
  });

  it('does NOT submit on Enter while the IME is still composing (keyCode 229)', () => {
    const onSubmit = vi.fn();
    render(<ShiritoriView {...baseProps({ onSubmit })} />);
    const input = screen.getByLabelText('shiritori.inputLabel') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ごり' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables input when it is not my turn', () => {
    render(<ShiritoriView {...baseProps({ currentPlayer: 'bob' })} />);
    const input = screen.getByLabelText('shiritori.inputLabel') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('shows the winner when the game is finished', () => {
    render(<ShiritoriView {...baseProps({ finished: true, winner: 'me' })} />);
    expect(screen.getByText('shiritori.youWin')).toBeTruthy();
  });

  it('renders the turn rail inside a desktop sidebar so wide viewports use the width', () => {
    render(<ShiritoriView {...baseProps()} />);
    const sidebar = screen.getByTestId('shiritori-turn-rail');
    expect(sidebar).toBeTruthy();
    expect(sidebar.querySelector('[aria-label="shiritori.players"]')).toBeTruthy();
  });

  describe('countdown timer bar', () => {
    it('renders role="timer" when turnStartedAt is provided', () => {
      render(<ShiritoriView {...baseProps({ turnStartedAt: Date.now() - 1000 })} />);
      expect(screen.getByRole('timer')).toBeTruthy();
    });

    it('does NOT render role="timer" when turnStartedAt is absent', () => {
      render(<ShiritoriView {...baseProps({ turnStartedAt: null })} />);
      expect(screen.queryByRole('timer')).toBeNull();
    });

    it('bar is full (100%) at the start of a turn', () => {
      // turnStartedAt = now → ~15s remaining → bar should be near 100%
      render(<ShiritoriView {...baseProps({ turnStartedAt: Date.now() })} />);
      const bar = screen.getByRole('timer').querySelector('div');
      // width style should be close to 100%
      const width = parseFloat(bar?.style?.width ?? '0');
      expect(width).toBeGreaterThan(90);
    });

    it('bar has orange class when ≤5s remain', () => {
      // turnStartedAt 11s ago → ~4s left → orange
      const TURN_MS = 15_000;
      render(<ShiritoriView {...baseProps({ turnStartedAt: Date.now() - (TURN_MS - 4000) })} />);
      const bar = screen.getByRole('timer').querySelector('div');
      expect(bar?.className).toContain('bg-neo-orange');
    });

    it('bar has yellow class when ≤9s remain', () => {
      // turnStartedAt 8s ago → ~7s left → yellow
      const TURN_MS = 15_000;
      render(<ShiritoriView {...baseProps({ turnStartedAt: Date.now() - (TURN_MS - 7000) })} />);
      const bar = screen.getByRole('timer').querySelector('div');
      expect(bar?.className).toContain('bg-neo-yellow');
    });

    it('timer bar is absent when game is finished', () => {
      render(<ShiritoriView {...baseProps({ finished: true, winner: 'me', turnStartedAt: Date.now() })} />);
      expect(screen.queryByRole('timer')).toBeNull();
    });
  });
});
