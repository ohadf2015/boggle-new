/**
 * The projector must report the settings the teacher actually chose.
 *
 * `ClassroomSetupStep` offers Small (5×5), Medium (6×6), Large (7×7) and
 * defaults to Medium. `ClassroomGameLobby` puts that choice on
 * `templateSettings.difficulty` verbatim, so the value arrives intact — but
 * `boardSizeLabel` was reading it against an older 4×4/5×5/6×6 scale with no
 * `medium` case at all, so Medium fell through to the default and the lobby
 * said 5×5. Every size was mislabelled by one step. Reported as "board size
 * silently reverted from Medium to 5×5"; nothing reverted, the label was wrong.
 * Reproduced live on 2026-09-06.
 *
 * These pins moved here with the surface: the teacher's lobby is now the
 * projector, and `boardSizeLabel` lives in `classroomModeLabels` so the student
 * banner and the projector can never drift apart again.
 */
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

function renderWithSize(difficulty: 'small' | 'medium' | 'large' | undefined) {
  render(
    <ProjectorLobby
      {...baseProps}
      templateSettings={{
        timerSeconds: 180,
        // `undefined` is what an older saved template looks like.
        difficulty: difficulty as string,
        minWordLength: 3,
        allowLateJoin: true,
      }}
    />
  );
}

describe('ProjectorLobby — board size label matches the setup screen', () => {
  beforeEach(() => { mockLiveGame = null; });

  it('labels Medium as 6×6, the size the setup screen offers', () => {
    renderWithSize('medium');
    expect(screen.getByText('6×6')).toBeInTheDocument();
  });

  it('labels Small as 5×5', () => {
    renderWithSize('small');
    expect(screen.getByText('5×5')).toBeInTheDocument();
  });

  it('labels Large as 7×7', () => {
    renderWithSize('large');
    expect(screen.getByText('7×7')).toBeInTheDocument();
  });

  it('falls back to the setup screen default (Medium) when nothing was recorded', () => {
    renderWithSize(undefined);
    expect(screen.getByText('6×6')).toBeInTheDocument();
  });
});

describe('ProjectorLobby — local settings beat the server record, never a default', () => {
  beforeEach(() => { mockLiveGame = null; });

  it('reads the teacher\'s own template the instant the lobby mounts', () => {
    renderWithSize('large');
    // 180s → 3 minutes, from sessionStorage, with no server round-trip.
    expect(screen.getByText('3 common.minutes')).toBeInTheDocument();
  });

  it('falls back to the room record when there is no local copy', () => {
    mockLiveGame = {
      gameCode: 'JATS5Z',
      classroomId: 'c1',
      classroomName: 'ELA Period 3',
      lessonNames: ['Week 3'],
      gameMode: 'classic',
      settings: {
        timerMinutes: 5,
        boardSize: 'small',
        allowLateJoin: false,
        vocabQuizQuestionCount: null,
        vocabQuizSeconds: null,
      },
    };
    render(<ProjectorLobby {...baseProps} />);
    expect(screen.getByText('5 common.minutes')).toBeInTheDocument();
    expect(screen.getByText('5×5')).toBeInTheDocument();
    expect(screen.getByText('education.projectorLobby.lateJoinOff')).toBeInTheDocument();
  });

  it('shows quiz settings for a quiz, not a board size and a round clock', () => {
    mockLiveGame = {
      gameCode: 'JATS5Z',
      classroomId: 'c1',
      classroomName: 'ELA Period 3',
      lessonNames: ['Week 3'],
      gameMode: 'vocab-quiz',
      settings: {
        timerMinutes: null,
        boardSize: null,
        allowLateJoin: true,
        vocabQuizQuestionCount: 8,
        vocabQuizSeconds: 25,
      },
    };
    render(<ProjectorLobby {...baseProps} classroomGameMode="vocab-quiz" />);
    expect(screen.getByText('teacher.classroom.gameModes.vocabQuiz')).toBeInTheDocument();
    expect(screen.getByText('vocabQuiz.setup.seconds:25')).toBeInTheDocument();
    expect(screen.queryByText('6×6')).not.toBeInTheDocument();
  });
});
