import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../RehearsalBotsBlocked', () => ({ RehearsalBotsBlocked: () => <div data-testid="bots-blocked">peek-in-classic</div> }));
vi.mock('../ProjectorQuizBlocked', () => ({ ProjectorQuizBlocked: () => <div data-testid="quiz-blocked">quiz-blocked</div> }));

import { ProjectorStartBar } from '../ProjectorStartBar';

const t = (key: string) => key;

function lobbyFor(mode: string, quizBlocked = false) {
  return {
    mode,
    modeId: mode,
    quizBlocked,
    switched: false,
    isQuiz: mode === 'vocab-quiz',
    blockedReasonKey: null,
    applyMode: vi.fn(),
  } as unknown as Parameters<typeof ProjectorStartBar>[0]['lobby'];
}

function renderBar(mode: string, studentCount = 0, onStartPracticeRound: (() => void) | undefined = vi.fn(), quizBlocked = false) {
  render(
    <ProjectorStartBar
      gameCode="ROOM01"
      t={t}
      lobby={lobbyFor(mode, quizBlocked)}
      studentCount={studentCount}
      startLabelKey="hostView.startClassGame"
      starting={false}
      onStartGame={vi.fn()}
      autoStartSecondsLeft={null}
      onStartPracticeRound={onStartPracticeRound}
      practiceRoundPending={false}
      practiceRoundFailed={false}
    />,
  );
}

const classTokens = (el: HTMLElement) => el.className.split(/\s+/);

describe('ProjectorStartBar — a teacher waiting for the first student always sees Start', () => {
  afterEach(cleanup);

  it.each(['vocab-quiz', 'classic'])('Given a %s room with nobody in, Then Start is on screen, disabled', (mode) => {
    renderBar(mode);
    const start = screen.getByTestId('projector-start');
    expect(start).toBeDisabled();
    expect(classTokens(start)).not.toContain('hidden');
  });

  it.each(['vocab-quiz', 'classic'])('Given a %s room with nobody in, Then the reason is shown on every screen size', (mode) => {
    renderBar(mode);
    const reason = screen.getByText('eduLiveRoom.lobby.startBlocked');
    expect(classTokens(reason).some((c) => c.endsWith(':hidden') || c === 'hidden')).toBe(false);
  });

  it('Given a vocabulary-quiz room with nobody in, Then the rehearsal alternative sits below Start', () => {
    renderBar('vocab-quiz');
    const start = screen.getByTestId('projector-start');
    const alt = screen.getByTestId('bots-blocked');
    expect(start.compareDocumentPosition(alt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Given a classic room with nobody in, Then Preview with bots sits below Start', () => {
    renderBar('classic');
    const start = screen.getByTestId('projector-start');
    const practice = screen.getByTestId('projector-practice-round');
    expect(start.compareDocumentPosition(practice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Given a student joined, Then Start is enabled exactly as before', () => {
    renderBar('vocab-quiz', 1);
    expect(screen.getByTestId('projector-start')).toBeEnabled();
  });
});
