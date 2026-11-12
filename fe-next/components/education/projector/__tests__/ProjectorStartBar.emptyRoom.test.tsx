import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const botsBlockedProps = vi.hoisted(() => ({ last: null as null | Record<string, unknown> }));
vi.mock('../RehearsalBotsBlocked', () => ({
  RehearsalBotsBlocked: (props: Record<string, unknown>) => {
    botsBlockedProps.last = props;
    return <div data-testid="bots-blocked">peek-in-classic</div>;
  },
}));
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

function renderBar(mode: string, studentCount = 0, onStartPracticeRound: (() => void) | undefined = vi.fn(), quizBlocked = false, lessonWordsBlock?: Parameters<typeof ProjectorStartBar>[0]['lessonWordsBlock']) {
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
      lessonWordsBlock={lessonWordsBlock}
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

  it('Given a vocabulary-quiz room with nobody in, Then one explanation shows: the Start reason, not a second bots note', () => {
    renderBar('vocab-quiz');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(botsBlockedProps.last?.showNote).toBe(false);
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

  it('Given the lesson words could not be loaded, Then Start stays disabled with students in, says why and offers a retry', () => {
    const onRetry = vi.fn();
    renderBar('classic', 3, vi.fn(), false, { status: 'error', onRetry });
    expect(screen.getByTestId('projector-start')).toBeDisabled();
    expect(screen.getByTestId('projector-lesson-words')).toHaveTextContent('education.projectorLobby.lessonWordsFailed');
    screen.getByTestId('projector-lesson-words-retry').click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('Given the lesson words are still loading, Then Start waits and no retry is offered yet', () => {
    renderBar('classic', 3, vi.fn(), false, { status: 'loading', onRetry: vi.fn() });
    expect(screen.getByTestId('projector-start')).toBeDisabled();
    expect(screen.getByTestId('projector-lesson-words')).toHaveTextContent('education.projectorLobby.lessonWordsLoading');
    expect(screen.queryByTestId('projector-lesson-words-retry')).toBeNull();
  });
});
