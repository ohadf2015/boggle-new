import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p', h1: 'h1', h2: 'h2', button: 'button', li: 'li', ul: 'ul' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));

vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({
  useLiveClassroomGameInfo: () => mockLiveGame,
}));

let mockLiveGame: unknown = null;

import ProjectorLobby from '../ProjectorLobby';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const baseProps = {
  gameCode: 'JATS5Z',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [] as { username: string }[],
  t,
  onStartGame: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
};

describe('ProjectorLobby — Wordcraft deals its own fixed board', () => {
  beforeEach(() => { mockLiveGame = null; });

  it('Given the room switched to Wordcraft, Then no board size chip describes a grid the mode ignores', () => {
    render(
      <ProjectorLobby
        {...baseProps}
        classroomGameMode="wordcraft"
        templateSettings={{ timerSeconds: 180, difficulty: 'medium', minWordLength: 3, allowLateJoin: true }}
      />
    );
    expect(screen.queryByText('6×6')).not.toBeInTheDocument();
    expect(screen.getByText('3 common.minutes')).toBeInTheDocument();
  });
});
