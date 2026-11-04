import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { VocabQuizView } from '../VocabQuizView';
import { VocabQuizStudentHeader } from '../VocabQuizStudentHeader';
import { VocabQuizAnswerGrid } from '../VocabQuizAnswerGrid';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt} />,
}));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

function makeSocket() {
  const handlers = new Map<string, Array<(payload: unknown) => void>>();
  const emitted: Array<[string, unknown]> = [];
  const socket = {
    on(event: string, fn: (payload: unknown) => void) {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
    },
    off(event: string, fn: (payload: unknown) => void) {
      handlers.set(event, (handlers.get(event) ?? []).filter((h) => h !== fn));
    },
    emit(event: string, payload: unknown) {
      emitted.push([event, payload]);
    },
  };
  const server = (event: string, payload: unknown) =>
    act(() => {
      for (const fn of handlers.get(event) ?? []) fn(payload);
    });
  return { socket: socket as never, server, emitted };
}

const QUESTION = {
  gameCode: 'ABC123', index: 2, total: 8, focus: 'definition' as const,
  prompt: 'brittle', choices: ['fragile', 'enormous', 'quiet', 'ancient'],
  limitMs: 20_000, remainingMs: 20_000, serverNow: Date.now(),
};
const REVEAL = {
  gameCode: 'ABC123', index: 2, total: 8, answerIndex: 0, answer: 'fragile', word: 'brittle',
  definition: 'hard but easily broken', distribution: [2, 0, 0, 0],
  standings: [{ username: 'ana', score: 140, streak: 1, bestStreak: 1, correctCount: 1 }],
  nextInMs: 3_000, isLast: false,
};

function mountQuestion(onExit?: () => void) {
  const s = makeSocket();
  render(<VocabQuizView socket={s.socket} username="ana" t={t} onExit={onExit} />);
  s.server(VOCAB_QUIZ_EVENTS.question, QUESTION);
  return s;
}

describe('Vocab quiz lesson shell: top bar, footer bar, key hints', () => {
  it('shows round progress as a filled bar in the top bar', () => {
    render(
      <VocabQuizStudentHeader
        questionNumber={3} totalQuestions={8} streak={0} score={0} pop={null}
        mascot="thinking" t={t}
      />
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '8');
    expect(screen.getByTestId('vocab-quiz-progress-stripe')).toBeInTheDocument();
  });

  it('puts an exit button at the start of the top bar only when there is somewhere to go', () => {
    const onExit = vi.fn();
    mountQuestion(onExit);
    fireEvent.click(screen.getByRole('button', { name: 'vocabQuiz.exit' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('draws no exit button without an exit handler', () => {
    mountQuestion();
    expect(screen.queryByRole('button', { name: 'vocabQuiz.exit' })).toBeNull();
  });

  it('keeps one footer bar under the answers while the clock runs', () => {
    mountQuestion();
    const footer = screen.getByTestId('vocab-quiz-footer');
    const answers = screen.getByRole('group', { name: 'vocabQuiz.answers.label' });
    expect(answers.contains(footer)).toBe(false);
    expect(answers.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(footer).toHaveTextContent('vocabQuiz.footer.speedTip');
  });

  it('keeps the question footer to one compact row, then gives the verdict its own height in the same slot', () => {
    const s = mountQuestion();
    const before = screen.getByTestId('vocab-quiz-footer').className;
    expect(before).not.toMatch(/(^|\s)h-\[calc\(12rem/);
    const gridBefore = screen.getByRole('group', { name: 'vocabQuiz.answers.label' }).parentElement!.className;
    s.server(VOCAB_QUIZ_EVENTS.answerResult, {
      index: 2, correct: true, choiceIndex: 0, points: 140, speedBonus: 40, streakBonus: 0, streak: 1, totalScore: 140,
    });
    s.server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);
    const footer = screen.getByTestId('vocab-quiz-footer');
    expect(footer.className).toMatch(/(^|\s)h-\[calc\(12rem/);
    expect(footer.contains(screen.getByTestId('vocab-quiz-verdict'))).toBe(true);
    expect(screen.queryByTestId('vocab-quiz-footer-hint')).toBeNull();
    expect(screen.getByRole('group', { name: 'vocabQuiz.answers.label' }).parentElement!.className).toBe(gridBefore);
  });

  it('holds the question and answers in one column the width of the header', () => {
    mountQuestion();
    const column = screen.getByTestId('vocab-quiz-column');
    expect(column.className).toContain('max-w-[720px]');
    expect(column.contains(screen.getByTestId('vocab-quiz-prompt'))).toBe(true);
  });

  it('answers with the number keys 1 to 4', () => {
    const s = mountQuestion();
    fireEvent.keyDown(window, { key: '2' });
    expect(s.emitted.some(([, p]) => (p as { choiceIndex?: number })?.choiceIndex === 1)).toBe(true);
  });

  it('ignores number keys typed into a field or with a modifier held', () => {
    const s = mountQuestion();
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: '1' });
    fireEvent.keyDown(window, { key: '3', ctrlKey: true });
    expect(s.emitted.some(([, p]) => typeof (p as { choiceIndex?: number })?.choiceIndex === 'number')).toBe(false);
    input.remove();
  });
});

describe('VocabQuizAnswerGrid key hints and picked border', () => {
  const grid = (selectedIndex: number | null) =>
    render(
      <VocabQuizAnswerGrid
        choices={['a', 'b', 'c', 'd']} selectedIndex={selectedIndex} correctIndex={null}
        disabled={false} onSelect={() => {}} t={t}
      />
    );

  it('labels every card with its key', () => {
    grid(null);
    expect(screen.getAllByTestId('vocab-quiz-key-hint').map((n) => n.textContent)).toEqual(['1', '2', '3', '4']);
  });

  it('gives the picked card a coloured border the others do not have', () => {
    grid(1);
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toHaveAttribute('data-picked', 'true');
    expect(buttons[1].className).toContain('outline-neo-cyan');
    expect(buttons[0].className).not.toContain('outline-neo-cyan');
  });
});
