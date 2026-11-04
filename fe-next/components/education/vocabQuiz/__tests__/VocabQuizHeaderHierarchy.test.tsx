import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent, within } from '@testing-library/react';
import { VocabQuizView } from '../VocabQuizView';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt} />,
}));

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
  gameCode: 'ABC123', index: 2, total: 8, focus: 'definition' as const,
  prompt: 'brittle', choices: ['fragile', 'enormous', 'quiet', 'ancient'],
  limitMs: 20_000, remainingMs: 14_000, serverNow: Date.now(),
};

function mount() {
  const s = makeSocket();
  render(<VocabQuizView socket={s.socket} username="ana" t={t} />);
  s.server(VOCAB_QUIZ_EVENTS.question, QUESTION);
  return s;
}

describe('Student quiz: one progress bar, one timer, one footer status', () => {
  it('Given a question, Then the screen has exactly one progress bar and it carries the full count label', () => {
    mount();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    const header = screen.getByRole('banner');
    expect(header.contains(screen.getByRole('progressbar'))).toBe(true);
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('vocabQuiz.progress:3,8');
    expect(header.textContent).not.toContain('vocabQuiz.progress:3,8');
  });

  it('Given a question, Then the timer is a labelled countdown inside the question card, not in the footer', () => {
    mount();
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-label')).toBe('vocabQuiz.timeLeft:14');
    expect(timer).toHaveTextContent('14');
    expect(screen.getByTestId('vocab-quiz-footer').contains(timer)).toBe(false);
    expect(screen.getByTestId('vocab-quiz-question-block').contains(timer)).toBe(true);
    expect(screen.getByTestId('vocab-quiz-column').contains(timer)).toBe(true);
  });

  it('Given the question block, Then the topic label and the word share it and the column keeps 16px gaps', () => {
    mount();
    const block = screen.getByTestId('vocab-quiz-question-block');
    expect(block.contains(screen.getByTestId('vocab-quiz-prompt'))).toBe(true);
    expect(block.contains(screen.getByTestId('vocab-quiz-focus'))).toBe(true);
    expect(screen.getByTestId('vocab-quiz-column').className).toMatch(/(^|\s)gap-(4|5|6)\b/);
  });

  it('Given no answer yet, Then the footer carries a quiet hint, with no disabled button', () => {
    mount();
    const footer = screen.getByTestId('vocab-quiz-footer');
    expect(footer).toHaveTextContent('vocabQuiz.footer.speedTip');
    expect(footer.textContent).not.toContain('vocabQuiz.footer.waiting');
    expect(within(footer).queryByRole('button')).toBeNull();
  });

  it('Given an answer locked in, Then the footer says it once', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /fragile/ }));
    const footer = screen.getByTestId('vocab-quiz-footer');
    expect(footer).toHaveTextContent('vocabQuiz.footer.locked');
    expect(footer.textContent).not.toMatch(/vocabQuiz\.lockedIn(?!Count)/);
    expect(footer.textContent).not.toContain('vocabQuiz.footer.speedTip');
  });
});
