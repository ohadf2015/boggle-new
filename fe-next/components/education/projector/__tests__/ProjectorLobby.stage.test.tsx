/**
 * The projector lobby is a game-show ARENA, not a form: the arena art fills the
 * wall, and the Start button is the loudest thing on it once someone is in.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p', button: 'button', li: 'li', ul: 'ul' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => null }));

import ProjectorLobby from '../ProjectorLobby';

const t = (key: string) => key;
const baseProps = {
  gameCode: 'GHYRVS',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [] as { username: string }[],
  t,
  onStartGame: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
};

describe('ProjectorLobby — the arena stage', () => {
  it('paints the arena art behind everything, decorative and eager', () => {
    render(<ProjectorLobby {...baseProps} />);
    const art = screen.getByTestId('projector-arena-art');
    expect(art.getAttribute('src')).toContain('/images/education/arena-lobby-bg.webp');
    expect(art).toHaveAttribute('alt', '');
    expect(art.getAttribute('loading')).not.toBe('lazy');
    // Static appear only: a fullscreen layer never tweens its opacity (pitfall 5).
    expect(art.className).not.toContain('opacity-0');
  });

  it('keeps the root a dark-only fixed surface over the art', () => {
    render(<ProjectorLobby {...baseProps} />);
    const root = screen.getByTestId('projector-lobby');
    expect(root.className).toContain('bg-neo-navy');
    expect(root.className).toContain('z-[65]');
  });

  it('makes Start pulse for attention only once it can actually start', () => {
    const { rerender } = render(<ProjectorLobby {...baseProps} />);
    expect(screen.getByTestId('projector-start').getAttribute('data-ready')).toBe('false');
    rerender(<ProjectorLobby {...baseProps} students={[{ username: 'Maya' }]} />);
    expect(screen.getByTestId('projector-start').getAttribute('data-ready')).toBe('true');
  });
});
