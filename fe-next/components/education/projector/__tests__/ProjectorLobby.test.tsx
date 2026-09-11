/**
 * The projector lobby — ONE surface a whole classroom reads off a wall.
 *
 * Before this piece the same session printed its join code twice: `TvJoinBar`
 * inside `TvLobbyView` (QR + code + address) AND `ClassroomModeBanner`'s
 * expanded panel (QR + code + copy button), stacked on the teacher's screen.
 * Two codes, two QRs, two sizes, both live. These tests pin the collapsed
 * surface: one QR, one code, big enough for the back row, and a Start control
 * that says WHY it is disabled instead of sitting dead (pitfall class 4).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: {
    div: 'div', span: 'span', p: 'p', h1: 'h1', h2: 'h2', button: 'button', li: 'li', ul: 'ul',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({
  useLiveClassroomGameInfo: () => mockLiveGame,
}));

vi.mock('@/components/lobby/LobbyReactions', () => ({
  LobbyReactions: () => <div data-testid="lobby-reactions" />,
}));

let mockLiveGame: unknown = null;

import ProjectorLobby from '../ProjectorLobby';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const baseProps = {
  gameCode: 'GHYRVS',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [] as { username: string }[],
  t,
  onStartGame: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
};

describe('ProjectorLobby — the join instructions', () => {
  beforeEach(() => { mockLiveGame = null; });

  it('prints the address a student can TYPE, carrying the code', () => {
    render(<ProjectorLobby {...baseProps} />);
    expect(screen.getByTestId('projector-join-address')).toHaveTextContent(
      'lexiclash.live/en/join/GHYRVS'
    );
  });

  it('shows the code once, one tile per character, back-row sized', () => {
    render(<ProjectorLobby {...baseProps} />);
    const code = screen.getByTestId('projector-code');
    const tiles = screen.getAllByTestId('projector-code-char');
    expect(tiles).toHaveLength(6);
    expect(tiles.map((el) => el.textContent).join('')).toBe('GHYRVS');
    // Min 12vw — a literal Tailwind arbitrary value, the only form v4 compiles.
    expect(code.className).toContain('12vw');
  });

  it('keeps the code and the address left-to-right in every locale', () => {
    render(<ProjectorLobby {...baseProps} language="he" />);
    expect(screen.getByTestId('projector-code')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('projector-join-address')).toHaveAttribute('dir', 'ltr');
  });

  it('renders exactly ONE QR, pointing at the locale join route', () => {
    render(<ProjectorLobby {...baseProps} />);
    const qrs = screen.getAllByTestId('projector-qr');
    expect(qrs).toHaveLength(1);
    expect(qrs[0]).toHaveAttribute('data-join-url', 'https://www.lexiclash.live/en/join/GHYRVS');
    expect(qrs[0].querySelector('svg')).toBeInTheDocument();
  });

  it('owns the whole viewport, so Start can never sit below the fold', () => {
    render(<ProjectorLobby {...baseProps} />);
    const root = screen.getByTestId('projector-lobby');
    // The page header renders above this in flow; a `min-h-screen` block under
    // it pushed the Start button off a 1080p projector entirely.
    expect(root.className).toContain('fixed');
    expect(root.className).toContain('inset-0');
    expect(root.className).toContain('overflow-hidden');
  });

  it('carries its own way out, since it covers the page header', () => {
    const onExitRoom = vi.fn();
    render(<ProjectorLobby {...baseProps} onExitRoom={onExitRoom} />);
    screen.getByTestId('projector-exit').click();
    expect(onExitRoom).toHaveBeenCalled();
  });

  it('is a dark-only surface — hardcoded navy, never the cream/dark pair', () => {
    render(<ProjectorLobby {...baseProps} />);
    const root = screen.getByTestId('projector-lobby');
    expect(root.className).toContain('bg-neo-navy');
    expect(root.className).not.toContain('bg-neo-cream');
  });
});

describe('ProjectorLobby — who is in the room', () => {
  beforeEach(() => { mockLiveGame = null; });

  it('says nobody is in yet rather than showing an empty box', () => {
    render(<ProjectorLobby {...baseProps} />);
    expect(screen.getByTestId('projector-roster-empty')).toBeInTheDocument();
  });

  it('pops a chip in per joined student and counts them live', () => {
    render(
      <ProjectorLobby
        {...baseProps}
        students={[{ username: 'Ada' }, { username: 'Bo' }, { username: 'Cy' }]}
      />
    );
    expect(screen.getAllByTestId('projector-student')).toHaveLength(3);
    expect(screen.getByTestId('projector-count')).toHaveTextContent('3');
    expect(screen.queryByTestId('projector-roster-empty')).not.toBeInTheDocument();
  });

  it('marks the students the server reports as ready', () => {
    render(
      <ProjectorLobby
        {...baseProps}
        students={[{ username: 'Ada' }, { username: 'Bo' }]}
        readyUsernames={['Bo']}
      />
    );
    const chips = screen.getAllByTestId('projector-student');
    expect(chips.map((c) => c.getAttribute('data-ready'))).toEqual(['false', 'true']);
  });
});

describe('ProjectorLobby — the Start control', () => {
  beforeEach(() => { mockLiveGame = null; });

  it('is disabled with a stated reason while the room is empty', () => {
    render(<ProjectorLobby {...baseProps} />);
    expect(screen.getByTestId('projector-start')).toBeDisabled();
    expect(screen.getByTestId('projector-start-reason')).toHaveTextContent(
      'education.projectorLobby.startBlocked'
    );
  });

  it('unlocks and drops the reason as soon as one student is in', () => {
    render(<ProjectorLobby {...baseProps} students={[{ username: 'Ada' }]} />);
    expect(screen.getByTestId('projector-start')).not.toBeDisabled();
    expect(screen.queryByTestId('projector-start-reason')).not.toBeInTheDocument();
  });

  it('takes the classroom label the teacher already chose, not arcade copy', () => {
    render(
      <ProjectorLobby {...baseProps} students={[{ username: 'Ada' }]} startLabelKey="hostView.startQuiz" />
    );
    expect(screen.getByRole('button', { name: /hostView\.startQuiz/ })).toBeInTheDocument();
    expect(screen.queryByText('hostView.startBattle')).not.toBeInTheDocument();
  });
});

describe('ProjectorLobby — the session it is projecting', () => {
  it('names the class the server resolved, and the lesson', () => {
    mockLiveGame = {
      gameCode: 'GHYRVS',
      classroomId: 'c1',
      classroomName: '7B English',
      lessonNames: ['Weather'],
      gameMode: 'classic',
      settings: { timerMinutes: 3, boardSize: 'large', allowLateJoin: true, vocabQuizQuestionCount: null, vocabQuizSeconds: null },
    };
    render(<ProjectorLobby {...baseProps} lessonName="Weather" wordCount={9} />);
    expect(screen.getByTestId('projector-session')).toHaveTextContent('7B English');
    expect(screen.getByTestId('projector-session')).toHaveTextContent('Weather');
  });

  it('falls back to the generic session label when the class has no name', () => {
    mockLiveGame = null;
    render(<ProjectorLobby {...baseProps} />);
    expect(screen.getByTestId('projector-session')).toHaveTextContent(
      'education.classroomGame.classroomSession'
    );
  });
});
