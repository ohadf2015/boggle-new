import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => {
  const make = (tag: string) =>
    function Motion({ animate, transition: _t, initial: _i, exit: _e, ...rest }: Record<string, unknown>) {
      return React.createElement(tag, { ...rest, 'data-animate': JSON.stringify(animate ?? null) });
    };
  return {
    m: { div: make('div'), span: make('span'), p: make('p'), button: make('button'), li: make('li'), ul: make('ul') },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
  };
});
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => null }));
vi.mock('@/components/lobby/LobbyReactions', () => ({ LobbyReactions: () => null }));

import ProjectorLobby from '../ProjectorLobby';

const props = {
  gameCode: 'GHYRVS',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [{ username: 'Ada' }],
  t: (key: string) => key,
  onStartGame: vi.fn(),
  onStartPracticeRound: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
};

function scaledAncestor(el: HTMLElement | null): HTMLElement | null {
  for (let node = el; node; node = node.parentElement) {
    if ((node.getAttribute('data-animate') ?? '').includes('scale')) return node;
  }
  return null;
}

describe('ProjectorLobby — START holds still while it breathes', () => {
  it('Given a student joined, Then no scale loop wraps the Start button', () => {
    render(<ProjectorLobby {...props} />);
    expect(scaledAncestor(screen.getByTestId('projector-start'))).toBeNull();
  });

  it('Given a student joined, Then a halo behind Start carries the breathing cue', () => {
    render(<ProjectorLobby {...props} />);
    const halo = screen.getByTestId('projector-start-halo');
    expect(halo).toHaveAttribute('aria-hidden', 'true');
    expect(halo.className).toContain('pointer-events-none');
    expect(screen.getByTestId('projector-start').contains(halo)).toBe(false);
  });

  it('Given nobody joined, Then there is no halo', () => {
    render(<ProjectorLobby {...props} students={[]} />);
    expect(screen.queryByTestId('projector-start-halo')).toBeNull();
  });
});
