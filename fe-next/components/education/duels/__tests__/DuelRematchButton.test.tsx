/**
 * The REMATCH control has four things to say, and one of them used to be a lie.
 *
 * Round 3's button had two states (idle / "setting it up…") and the second one
 * never ended: the tap created a duel the other student had not agreed to and
 * the screen sat there. Now the button IS the handshake — it asks, it shows
 * that the other kid asked first, it lets you back out, and it admits when the
 * opponent has already gone home.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DuelRematchButton } from '../DuelRematchButton';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, _fallback?: string, params?: Record<string, unknown>) =>
      params?.name ? `${key}:${params.name}` : key,
  }),
}));

const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));

describe('DuelRematchButton', () => {
  const onRematch = vi.fn();
  const onCancel = vi.fn();

  const props = {
    opponentName: 'Maya',
    onRematch,
    onCancel,
    seriesDecided: false,
  };

  beforeEach(() => vi.clearAllMocks());

  it('asks for a rematch when idle', () => {
    render(<DuelRematchButton {...props} state="idle" />);

    fireEvent.click(screen.getByTestId('duel-rematch-btn'));
    expect(onRematch).toHaveBeenCalled();
  });

  it('offers a NEW SERIES once the best-of-3 is decided', () => {
    render(<DuelRematchButton {...props} state="idle" seriesDecided />);
    expect(screen.getByTestId('duel-rematch-btn')).toHaveTextContent('education.duels.newSeries');
  });

  it('turns into ACCEPT when the other student asked first, and says who', () => {
    render(<DuelRematchButton {...props} state="offered" offeredByName="Maya" />);

    const button = screen.getByTestId('duel-rematch-btn');
    expect(button).toHaveTextContent('education.duels.rematchAccept');
    expect(screen.getByTestId('duel-rematch-note')).toHaveTextContent(
      'education.duels.rematchWants:Maya'
    );

    fireEvent.click(button);
    expect(onRematch).toHaveBeenCalled();
  });

  it('plays a sting once when the offer arrives, not on every render', () => {
    const { rerender } = render(<DuelRematchButton {...props} state="idle" />);
    expect(playSound).not.toHaveBeenCalled();

    rerender(<DuelRematchButton {...props} state="offered" offeredByName="Maya" />);
    rerender(<DuelRematchButton {...props} state="offered" offeredByName="Maya" />);

    expect(playSound).toHaveBeenCalledTimes(1);
  });

  it('is a way OUT while waiting — the tap cancels instead of re-asking', () => {
    render(<DuelRematchButton {...props} state="pending" />);

    const button = screen.getByTestId('duel-rematch-btn');
    expect(button).toHaveTextContent('education.duels.rematchWaiting:Maya');

    fireEvent.click(button);
    expect(onCancel).toHaveBeenCalled();
    expect(onRematch).not.toHaveBeenCalled();
  });

  it('says where the rematch went when the opponent had already left', () => {
    render(<DuelRematchButton {...props} state="invited" />);
    expect(screen.getByTestId('duel-rematch-btn')).toHaveTextContent(
      'education.duels.rematchInvited'
    );
  });

  it('keeps a visible 3px border in every state (no ghost controls)', () => {
    for (const state of ['idle', 'offered', 'pending', 'invited'] as const) {
      const { unmount } = render(<DuelRematchButton {...props} state={state} />);
      expect(screen.getByTestId('duel-rematch-btn').className).toContain('border-[3px]');
      unmount();
    }
  });
});
