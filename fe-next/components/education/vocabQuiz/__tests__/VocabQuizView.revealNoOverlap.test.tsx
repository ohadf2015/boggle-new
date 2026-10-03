import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { VocabQuizView } from '../VocabQuizView';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

function makeSocket() {
  const handlers = new Map<string, Array<(payload: unknown) => void>>();
  const socket = {
    on(event: string, fn: (payload: unknown) => void) {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
    },
    off(event: string, fn: (payload: unknown) => void) {
      handlers.set(event, (handlers.get(event) ?? []).filter((h) => h !== fn));
    },
    emit() {},
  };
  const server = (event: string, payload: unknown) =>
    act(() => {
      for (const fn of handlers.get(event) ?? []) fn(payload);
    });
  return { socket: socket as never, server };
}

const QUESTION = {
  gameCode: 'ABC123', index: 0, total: 5, focus: 'definition' as const,
  prompt: 'to leave behind for good', choices: ['abandon', 'brittle', 'candid', 'dwindle'],
  limitMs: 20_000, remainingMs: 20_000, serverNow: 1_700_000_000_000,
};

const REVEAL = {
  gameCode: 'ABC123', index: 0, total: 5, answerIndex: 0, answer: 'abandon', word: 'abandon',
  definition: 'to leave behind for good', distribution: [2, 0, 0, 0],
  standings: [
    { username: 'ana', score: 148, streak: 3, bestStreak: 3, correctCount: 1 },
    { username: 'bo', score: 120, streak: 1, bestStreak: 1, correctCount: 1 },
  ],
  nextInMs: 3_000, isLast: false,
};

function toReveal(answer?: { correct: boolean; choiceIndex: number; points: number; streak: number }) {
  const { socket, server } = makeSocket();
  render(<VocabQuizView socket={socket} username="ana" t={t} />);
  server(VOCAB_QUIZ_EVENTS.question, QUESTION);
  if (answer) {
    server(VOCAB_QUIZ_EVENTS.answerResult, {
      index: 0, speedBonus: 0, streakBonus: 0, totalScore: answer.points, ...answer,
    });
  }
  server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);
}

function absoluteAncestor(el: HTMLElement): HTMLElement | null {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (/(^|\s)absolute(\s|$)/.test(node.className)) return node;
  }
  return null;
}

describe('VocabQuizView — the reveal never sits on the answer tiles', () => {
  it('lays the verdict out after the answers, in flow, not floated over them', () => {
    toReveal({ correct: true, choiceIndex: 0, points: 148, streak: 3 });
    const verdict = screen.getByTestId('vocab-quiz-verdict');
    const answers = screen.getByRole('group', { name: 'vocabQuiz.answers.label' });
    expect(absoluteAncestor(verdict)).toBeNull();
    expect(answers.contains(verdict)).toBe(false);
    expect(answers.compareDocumentPosition(verdict) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the no-answer verdict in flow too', () => {
    toReveal();
    expect(absoluteAncestor(screen.getByTestId('vocab-quiz-verdict'))).toBeNull();
  });
});

describe('VocabQuizView — the verdict is loud', () => {
  it('shows the points this answer earned in the verdict itself', () => {
    toReveal({ correct: true, choiceIndex: 0, points: 148, streak: 3 });
    expect(screen.getByTestId('vocab-quiz-verdict-points')).toHaveTextContent('+148');
  });

  it('shows the live streak on a right answer from two in a row', () => {
    toReveal({ correct: true, choiceIndex: 0, points: 148, streak: 3 });
    expect(screen.getByTestId('vocab-quiz-verdict-streak')).toHaveTextContent('eg2Modes.feedback.streak:3');
  });

  it('shows no points chip on a miss', () => {
    toReveal({ correct: false, choiceIndex: 1, points: 0, streak: 0 });
    expect(screen.queryByTestId('vocab-quiz-verdict-points')).toBeNull();
    expect(screen.queryByTestId('vocab-quiz-verdict-streak')).toBeNull();
  });
});

describe('VocabQuizView — a treasure chest never hides the verdict', () => {
  function toChestReveal() {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.answerResult, {
      index: 0, correct: true, choiceIndex: 0, points: 148, speedBonus: 0, streakBonus: 0,
      streak: 1, totalScore: 148, chestPending: true,
    });
    server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);
  }

  it('offers the chests in place of the spent answer grid, not as a full-screen cover', () => {
    toChestReveal();
    const chest = screen.getByRole('button', { name: 'vocabQuiz.treasure.chestLabel:1' });
    for (let node: HTMLElement | null = chest; node; node = node.parentElement) {
      expect(node.className).not.toMatch(/(^|\s)fixed(\s|$)/);
    }
    expect(screen.queryByRole('group', { name: 'vocabQuiz.answers.label' })).toBeNull();
  });

  it('keeps the verdict and its points on screen while the chests are offered', () => {
    toChestReveal();
    expect(screen.getByTestId('vocab-quiz-verdict')).toBeInTheDocument();
    expect(screen.getByTestId('vocab-quiz-verdict-points')).toHaveTextContent('+148');
    expect(screen.getAllByRole('button', { name: /vocabQuiz\.treasure\.chestLabel/ })).toHaveLength(3);
  });
});
