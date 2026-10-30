import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent, cleanup, act } from '@testing-library/react';
import { LobbyFlowStrip } from '../LobbyFlowStrip';
import type { LobbyWarmupState } from '../LobbyWarmup';

vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <span data-src={String(props.src)} /> }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, a?: unknown, b?: Record<string, number>) => (b ? `${k}:${b.done}/${b.total}` : k) }),
}));

const warmup = (over: Partial<LobbyWarmupState> = {}): LobbyWarmupState => ({
  active: true,
  sent: null,
  sendState: 'idle',
  send: vi.fn(async () => {}),
  refresh: vi.fn(async () => {}),
  ...over,
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LobbyFlowStrip: learn, solo, then the class plays live', () => {
  it('Given the list is not out yet, Then three numbered steps show and step one sends the list to phones', () => {
    const w = warmup();
    render(<LobbyFlowStrip warmup={w} modeName="Word Hunt" />);
    const steps = within(screen.getByTestId('lobby-flow')).getAllByTestId('lobby-flow-step');
    expect(steps.map((s) => s.getAttribute('data-step'))).toEqual(['learn', 'solo', 'live']);
    fireEvent.click(screen.getByTestId('lobby-warmup-send'));
    expect(w.send).toHaveBeenCalledTimes(1);
  });

  it('Given the list went out, Then it shows who has practised and keeps that count fresh', () => {
    vi.useFakeTimers();
    const w = warmup({ sent: { done: 12, total: 34 } });
    render(<LobbyFlowStrip warmup={w} modeName="Word Hunt" />);
    expect(screen.getByTestId('lobby-warmup-status')).toHaveTextContent('12/34');
    expect(screen.queryByTestId('lobby-warmup-send')).toBeNull();
    act(() => vi.advanceTimersByTime(20_000));
    expect(w.refresh).toHaveBeenCalled();
  });

  it('Then the run sheet is text steps, no picture strip competing with the game tiles', () => {
    render(<LobbyFlowStrip warmup={warmup()} modeName="Word Hunt" />);
    expect(screen.getByTestId('lobby-flow').querySelector('[data-src]')).toBeNull();
  });

  it('Then the live step names the game the class will play', () => {
    render(<LobbyFlowStrip warmup={warmup()} modeName="Word Hunt" />);
    const live = screen.getAllByTestId('lobby-flow-step')[2];
    expect(live.textContent).toContain('eduShell.home.flow.live');
  });
});
