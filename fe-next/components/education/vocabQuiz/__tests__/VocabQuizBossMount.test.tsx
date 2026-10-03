import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const BOSS = { maxHp: 6, hp: 4, lastHits: 2, defeated: false };
const QUESTION = {
  gameCode: 'BOSS01', index: 0, total: 5, focus: 'meaning', prompt: 'honest and direct',
  choices: ['a', 'b', 'c', 'd'], limitMs: 10_000, remainingMs: 10_000, serverNow: 0,
};
const base = {
  paused: false, question: QUESTION, standings: [], pendingChoice: null, myScore: 0, myStreak: 0,
  secondsLeft: 10, fractionLeft: 1, totalQuestions: 5, questionNumber: 1, finished: false, lockIn: null,
  chestPending: false, myChest: null, chestEvents: [], chestHit: null, missed: [], answer: vi.fn(), isQuizRoom: true,
};
let state: Record<string, unknown> = {};
vi.mock('../useVocabQuiz', () => ({ useVocabQuiz: () => state }));

const { VocabQuizHostView } = await import('../VocabQuizHostView');
const { VocabQuizView } = await import('../VocabQuizView');
const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}|${JSON.stringify(params)}` : key);

describe('Boss Battle on the live quiz surfaces', () => {
  beforeEach(() => {
    state = { ...base, phase: 'question', reveal: null, myAnswer: null, boss: BOSS };
  });

  it('puts the boss bar on the projector during a question', () => {
    render(<VocabQuizHostView socket={null} joinCode="BOSS01" playerCount={2} t={t} />);
    expect(screen.getByTestId('boss-bar')).toBeInTheDocument();
  });

  it('keeps a plain quiz free of any boss chrome', () => {
    state = { ...state, boss: null };
    render(<VocabQuizHostView socket={null} joinCode="BOSS01" playerCount={2} t={t} />);
    expect(screen.queryByTestId('boss-bar')).not.toBeInTheDocument();
  });

  it('swaps the bar for the verdict once the round ends', () => {
    state = { ...state, phase: 'ended', question: null, finished: true, boss: { ...BOSS, hp: 0, defeated: true } };
    render(<VocabQuizHostView socket={null} joinCode="BOSS01" playerCount={2} t={t} />);
    expect(screen.queryByTestId('boss-bar')).not.toBeInTheDocument();
    expect(screen.getByTestId('boss-outcome')).toHaveAttribute('data-outcome', 'defeated');
  });

  it('shows a student the hit their own answer landed', () => {
    state = {
      ...state, phase: 'reveal',
      reveal: { gameCode: 'BOSS01', index: 0, total: 5, answerIndex: 1, answer: 'b', word: 'candid', distribution: [0, 2, 0, 0], standings: [], nextInMs: 3000, isLast: false },
      myAnswer: { index: 0, correct: true, choiceIndex: 1, points: 100, speedBonus: 0, streakBonus: 0, streak: 1, totalScore: 100, bossHit: 1 },
    };
    render(<VocabQuizView socket={null} username="ana" t={t} />);
    expect(screen.getByTestId('boss-my-hit')).toHaveTextContent('eg2Modes.boss.yourHit|{"hits":1}');
  });

  it('gives a student the verdict on their finale too', () => {
    state = { ...state, phase: 'ended', question: null, finished: true, boss: { ...BOSS, hp: 2 } };
    render(<VocabQuizView socket={null} username="ana" t={t} />);
    expect(screen.getByTestId('boss-outcome')).toHaveAttribute('data-outcome', 'escaped');
  });
});
