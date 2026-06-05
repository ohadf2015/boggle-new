import { vi } from 'vitest';
/* eslint-disable react/display-name */
/**
 * LobbyReactions — pre-game social toy
 *
 * Reuses the live `quickReaction` socket event (no gameState gate) so waiting
 * players can fling emoji at the room. These tests pin: the picker renders,
 * tapping a reaction emits `quickReaction`, and the sender's own emoji floats
 * locally (immediate feedback, no server round-trip needed).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LobbyReactions } from '../LobbyReactions';

const mockSocket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
vi.mock('@/utils/SocketContext', () => ({ useSocket: () => ({ socket: mockSocket }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }) }));
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: new Proxy({}, {
    get: (_t, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition', 'whileTap', 'whileHover'].includes(k)) clean[k] = v;
      }
      return React.createElement(tag === 'button' ? 'button' : 'div', clean, children as React.ReactNode);
    },
  }),
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('LobbyReactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the reaction trigger and a floating overlay', () => {
    render(<LobbyReactions username="me" />);
    expect(screen.getByLabelText('reactions.label')).toBeInTheDocument();
    expect(screen.getByTestId('lobby-reactions-overlay')).toBeInTheDocument();
  });

  it('emits quickReaction and floats the sender emoji on tap', () => {
    render(<LobbyReactions username="me" />);
    fireEvent.click(screen.getByLabelText('reactions.label')); // open tray
    fireEvent.click(screen.getByLabelText('reactions.fire'));   // tap 🔥
    expect(mockSocket.emit).toHaveBeenCalledWith('quickReaction', { reactionId: 'fire', username: 'me' });
    // own reaction shows immediately — sender name stamped on the float
    expect(screen.getByText('me')).toBeInTheDocument();
  });
});
