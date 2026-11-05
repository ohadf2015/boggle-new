import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt} />,
}));

import { VocabQuizView } from '../VocabQuizView';
import { VocabQuizAnswerGrid } from '../VocabQuizAnswerGrid';
import { VocabQuizFooterBar } from '../VocabQuizFooterBar';
import { VocabQuizRevealBanner } from '../VocabQuizRevealBanner';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

function mountQuestion() {
  const handlers = new Map<string, Array<(payload: unknown) => void>>();
  const socket = {
    on(event: string, fn: (payload: unknown) => void) {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
    },
    off() {},
    emit() {},
  };
  render(<VocabQuizView socket={socket as never} username="ana" t={t} />);
  act(() => {
    for (const fn of handlers.get(VOCAB_QUIZ_EVENTS.question) ?? []) {
      fn({
        gameCode: 'A', index: 0, total: 4, focus: 'synonym', prompt: 'brittle',
        choices: ['fragile', 'enormous', 'quiet', 'ancient'], limitMs: 20_000, remainingMs: 20_000, serverNow: Date.now(),
      });
    }
  });
}

describe('Student play stage is one stack composed to the viewport', () => {
  it('Given a question, Then the answer slot keeps its content height instead of growing into slabs', () => {
    mountQuestion();
    const slot = screen.getByRole('group', { name: 'vocabQuiz.answers.label' }).parentElement!;
    expect(slot.className).not.toMatch(/(^|\s)flex-1(\s|$)/);
    expect(slot.className).toMatch(/(^|\s)shrink-0(\s|$)/);
  });

  it('Given a question, Then header, question and answers share one stack that centres any leftover height around itself', () => {
    mountQuestion();
    const stack = screen.getByTestId('vocab-quiz-stack');
    expect(stack.className).toContain('justify-center');
    expect(stack.contains(screen.getByRole('banner'))).toBe(true);
    expect(stack.contains(screen.getByTestId('vocab-quiz-column'))).toBe(true);
    expect(stack.contains(screen.getByTestId('vocab-quiz-footer'))).toBe(false);
  });

  it('Given the grid, Then rows are content height, not a fill', () => {
    render(<VocabQuizAnswerGrid choices={['a', 'b']} selectedIndex={null} correctIndex={null} disabled={false} onSelect={() => {}} t={t} />);
    const grid = screen.getByRole('group');
    expect(grid.className).not.toContain('1fr');
    expect(grid.className).not.toMatch(/(^|\s)h-full(\s|$)/);
  });

  it('Given short words, Then the labels are 28px on a phone and 32px on a desktop', () => {
    render(<VocabQuizAnswerGrid choices={['fragile', 'quiet']} selectedIndex={null} correctIndex={null} disabled={false} onSelect={() => {}} t={t} />);
    const cls = screen.getAllByTestId('vocab-quiz-choice-label')[0].className;
    expect(cls).toContain('text-[clamp(1.5rem,7.4vw,1.75rem)]');
    expect(cls).toContain('sm:text-[2rem]');
    expect(cls).not.toMatch(/lg:text-/);
  });
});

describe('The band carries state while the clock runs', () => {
  it('Given no streak, Then it tells the student speed scores, not a generic tap hint', () => {
    render(<VocabQuizFooterBar locked={false} streak={0} t={t} />);
    const footer = screen.getByTestId('vocab-quiz-footer');
    expect(footer).toHaveTextContent('vocabQuiz.footer.speedTip');
    expect(footer).not.toHaveTextContent('vocabQuiz.footer.pick');
  });

  it('Given a live streak, Then the band counts it on the same line', () => {
    render(<VocabQuizFooterBar locked={false} streak={3} t={t} />);
    expect(screen.getByTestId('vocab-quiz-footer-hint')).toHaveTextContent('vocabQuiz.footer.streakRun:3');
  });

  it('Given the room count before a pick, Then it shows how many have answered', () => {
    render(<VocabQuizFooterBar locked={false} lockedIn={{ locked: 5, total: 20 }} t={t} />);
    expect(screen.getByTestId('vocab-quiz-footer')).toHaveTextContent('vocabQuiz.footer.roomCount:5,20');
  });
});

describe('The verdict band reads as answer feedback', () => {
  it('Given a verdict, Then a big round check or cross leads the row even with Lexi present', () => {
    render(<VocabQuizRevealBanner correct={false} answer="fragile" word="brittle" sweep={false} mascot="sad" t={t} />);
    const badge = screen.getByTestId('vocab-quiz-verdict-badge');
    expect(badge.dataset.verdict).toBe('wrong');
    expect(badge.className).toMatch(/size-1[2-4]/);
  });

  it('Given the next-word countdown, Then it sits in a full-width button-shaped slot with a lip on phones', () => {
    render(<VocabQuizRevealBanner correct answer="fragile" word="brittle" sweep={false} nextInMs={3000} t={t} />);
    const pill = screen.getByTestId('vocab-quiz-next-pill');
    expect(pill.className).toContain('w-full');
    expect(pill.className).toMatch(/border-b-\[?[46]/);
    expect(pill.className).toMatch(/uppercase/);
  });
});
