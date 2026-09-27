import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmoteTray } from '../EmoteTray';
import { LOBBY_EMOTES } from '@/lib/lobby/lobbyEmotes';

// Identity translator — assert on the key so we don't couple to copy.
const t = (k: string) => k;

describe('EmoteTray', () => {
  it('renders one accessible button per lobby emote', () => {
    render(<EmoteTray onEmote={vi.fn()} t={t} />);
    for (const e of LOBBY_EMOTES) {
      expect(screen.getByRole('button', { name: e.labelKey })).toBeInTheDocument();
    }
  });

  it('calls onEmote with the emote id when a button is tapped', () => {
    const onEmote = vi.fn();
    render(<EmoteTray onEmote={onEmote} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'lobby.emote.angry' }));
    expect(onEmote).toHaveBeenCalledWith('emoteAngry');
  });

  it('disables every button and blocks taps while on cooldown', () => {
    const onEmote = vi.fn();
    render(<EmoteTray onEmote={onEmote} t={t} disabled />);
    const btn = screen.getByRole('button', { name: 'lobby.emote.wink' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onEmote).not.toHaveBeenCalled();
  });

  describe('compact mode', () => {
    it('collapses to a single trigger button — emote row hidden until tapped', () => {
      render(<EmoteTray onEmote={vi.fn()} t={t} compact />);
      expect(screen.getByTestId('emote-trigger')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'lobby.emote.angry' })).toBeNull();
    });

    it('expands the emote row when the trigger is tapped', () => {
      render(<EmoteTray onEmote={vi.fn()} t={t} compact />);
      fireEvent.click(screen.getByTestId('emote-trigger'));
      expect(screen.getByRole('button', { name: 'lobby.emote.angry' })).toBeInTheDocument();
    });

    it('sends the emote and collapses again after a tap', () => {
      const onEmote = vi.fn();
      render(<EmoteTray onEmote={onEmote} t={t} compact />);
      fireEvent.click(screen.getByTestId('emote-trigger'));
      fireEvent.click(screen.getByRole('button', { name: 'lobby.emote.angry' }));
      expect(onEmote).toHaveBeenCalledWith('emoteAngry');
      expect(screen.queryByRole('button', { name: 'lobby.emote.angry' })).toBeNull();
    });
  });
});
