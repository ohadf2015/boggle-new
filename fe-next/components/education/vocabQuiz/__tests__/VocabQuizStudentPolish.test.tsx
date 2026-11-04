import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { VocabQuizRevealBanner } from '../VocabQuizRevealBanner';
import { VocabQuizAnswerGrid } from '../VocabQuizAnswerGrid';
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
  limitMs: 20_000, remainingMs: 20_000, serverNow: Date.now(),
};

describe('Student quiz phone — feedback bar like a lesson screen', () => {
  it('Given a right answer, Then the whole sheet is the lime feedback bar, filling the footer slot', () => {
    render(<VocabQuizRevealBanner correct answer="a" word="w" definition="d" sweep={false} t={t} />);
    const sheet = screen.getByTestId('vocab-quiz-verdict-sheet');
    expect(sheet.className).toContain('bg-neo-lime');
    expect(sheet.className).toContain('h-full');
    expect(sheet.className).toContain('rounded-t-');
  });

  it('Given a miss, Then the bar turns red and still teaches the word inside it', () => {
    render(<VocabQuizRevealBanner correct={false} answer="a" word="brittle" definition="easily broken" sweep={false} t={t} />);
    const sheet = screen.getByTestId('vocab-quiz-verdict-sheet');
    expect(sheet.className).toContain('bg-neo-red');
    expect(sheet).toContainElement(screen.getByText('easily broken'));
  });

  it('Given a wrong pick, Then the tile shake is skipped under reduced motion', () => {
    render(
      <VocabQuizAnswerGrid choices={['a', 'b', 'c', 'd']} selectedIndex={1} correctIndex={0} disabled onSelect={() => {}} t={t} />
    );
    const wrong = screen.getAllByRole('button')[1];
    expect(wrong.className).toContain('animate-neo-shake');
    expect(wrong.className).toContain('motion-reduce:animate-none');
  });
});

describe('Student quiz phone — the question is the hero', () => {
  it('Given a question, Then the prompt is big display type and the focus is a coloured label', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    const prompt = screen.getByTestId('vocab-quiz-prompt');
    expect(prompt).toHaveTextContent('to leave behind for good');
    expect(prompt.className).toContain('font-black');
    expect(screen.getByTestId('vocab-quiz-focus').className).toContain('text-neo-purple');
  });

  it('Given the last seconds tick, Then the clock turns orange without an opacity pulse on the full-width strip', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, { ...QUESTION, remainingMs: 3_000, serverNow: Date.now() });
    expect(screen.getByRole('timer').className).toContain('text-neo-orange');
    expect(screen.getByRole('timer').outerHTML).not.toContain('animate-pulse');
  });
});
