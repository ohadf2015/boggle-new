/**
 * Live Vocab Quiz — the question card and option shapes, read from the back row
 * (RED first).
 *
 * Captured on HBQ23H: the prompt sat flush to one edge of a wide card with the
 * category ("הגדרות") floating as loose cyan text above it, and the option
 * shapes were 40px chips — the smallest thing on a wall whose whole job is
 * letting a student match the wall to the tile under their thumb.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabQuizChoiceBars } from '../VocabQuizChoiceBars';

const QUESTION = {
  phase: 'question' as const,
  paused: true,
  question: {
    gameCode: 'HBQ23H',
    index: 3,
    total: 10,
    focus: 'definition' as const,
    prompt: 'The organ that pumps blood',
    choices: ['puzzle', 'river', 'heart', 'whisper'],
    limitMs: 20_000,
    remainingMs: 10_000,
    serverNow: Date.now(),
  },
  reveal: null,
  standings: [],
  myAnswer: null,
  pendingChoice: null,
  myScore: 0,
  myStreak: 0,
  secondsLeft: 10,
  fractionLeft: 0.5,
  totalQuestions: 10,
  questionNumber: 4,
  finished: false,
  lockIn: null,
  chestPending: false,
  myChest: null,
  chestEvents: [],
  chestHit: null,
  answer: vi.fn(),
  isQuizRoom: true,
};

vi.mock('../useVocabQuiz', () => ({ useVocabQuiz: () => QUESTION }));

const { VocabQuizHostView } = await import('../VocabQuizHostView');

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('VocabQuizHostView — question card', () => {
  it('centres the prompt in its card', () => {
    render(<VocabQuizHostView socket={null} joinCode="HBQ23H" playerCount={1} t={t} />);
    const prompt = screen.getByText('The organ that pumps blood');
    expect(prompt.className).toContain('text-center');
  });

  it('wraps the category in a badge instead of loose text on the edge', () => {
    render(<VocabQuizHostView socket={null} joinCode="HBQ23H" playerCount={1} t={t} />);
    const badge = screen.getByTestId('vocab-quiz-focus-badge');
    expect(badge).toHaveTextContent('vocabQuiz.focus.definition');
    expect(badge.className).toContain('rounded-full');
    expect(badge.className).toContain('self-center');
  });

  it('says "paused" once on the wall', () => {
    render(<VocabQuizHostView socket={null} joinCode="HBQ23H" playerCount={1} t={t} />);
    expect(screen.getAllByText('vocabQuiz.paused')).toHaveLength(1);
  });
});

describe('VocabQuizChoiceBars — option shapes', () => {
  it('draws each shape chip ~30% larger than the old 40px chip', () => {
    render(
      <VocabQuizChoiceBars choices={['a', 'b', 'c', 'd']} distribution={[0, 0, 0, 0]} totalPlayers={4} answerIndex={null} sweep={false} t={t} />
    );
    for (const i of [0, 1, 2, 3]) {
      const chip = screen.getByTestId(`vocab-quiz-shape-${i}`);
      expect(chip.className).toContain('size-[3.25rem]');
      expect(chip.className).not.toContain('w-10');
    }
  });

  it('keeps the shape immediately before its answer text', () => {
    render(
      <VocabQuizChoiceBars choices={['a', 'b', 'c', 'd']} distribution={[0, 0, 0, 0]} totalPlayers={4} answerIndex={null} sweep={false} t={t} />
    );
    const chip = screen.getByTestId('vocab-quiz-shape-2');
    expect(chip.nextElementSibling).toHaveTextContent('c');
    expect(chip.nextElementSibling?.className).toContain('text-start');
  });
});
