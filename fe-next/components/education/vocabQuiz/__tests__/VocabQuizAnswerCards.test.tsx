import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt} />,
}));

import { VocabQuizView } from '../VocabQuizView';
import { VocabQuizAnswerGrid } from '../VocabQuizAnswerGrid';
import { VocabQuizFooterBar } from '../VocabQuizFooterBar';
import { VocabQuizStudentHeader } from '../VocabQuizStudentHeader';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const CHOICES = ['fragile', 'enormous', 'quiet', 'ancient'];
const FAMILIES = ['lime', 'pink', 'cyan', 'purple'];

function grid(selectedIndex: number | null = null, correctIndex: number | null = null) {
  render(
    <VocabQuizAnswerGrid
      choices={CHOICES}
      selectedIndex={selectedIndex}
      correctIndex={correctIndex}
      disabled={correctIndex !== null}
      onSelect={() => {}}
      t={t}
    />
  );
  return screen.getAllByRole('button');
}

describe('Answer cards are dark cards on one neutral edge, not saturated slabs', () => {
  it('Given no pick, Then every card rests on the navy with the same neutral border and white ink', () => {
    grid().forEach((card, i) => {
      expect(card.className).toContain('bg-neo-navy-elevated');
      expect(card.className).toContain('border-neo-white/20');
      expect(card.className).toContain('border-[3px]');
      expect(card.className).toContain('text-neo-white');
      expect(card.className).not.toMatch(new RegExp(`(^|\\s)bg-neo-${FAMILIES[i]}(\\s|$)`));
    });
  });

  it('Given no pick, Then the family colour lives on a filled shape badge', () => {
    grid().forEach((card, i) => {
      const badge = card.querySelector('[data-testid="vocab-quiz-choice-badge"]')!;
      expect(badge.className).toContain(`bg-neo-${FAMILIES[i]}`);
      expect(badge.className).toContain('text-neo-black');
    });
  });

  it('Given a pointer that hovers, Then the family edge appears only on hover, scoped so a tap does not stick it', () => {
    const [first] = grid();
    expect(first.className).toContain('[@media(hover:hover)]:hover:border-neo-lime');
    expect(first.className).not.toContain('hover:text-neo-black');
    expect(first.className).not.toMatch(/(^|\s)hover:(bg|border)-neo-lime/);
  });

  it('Given a pick, Then that card takes a 20% wash of its colour and a pick chip, keeping white ink', () => {
    const cards = grid(1);
    const wash = cards[1].querySelector('[data-testid="vocab-quiz-choice-wash"]')!;
    expect(wash.className).toContain('bg-neo-pink/20');
    expect(cards[1].className).not.toMatch(/(^|\s)bg-neo-pink(\s|$)/);
    expect(cards[1].className).toContain('text-neo-white');
    expect(cards[1].querySelector('[data-testid="vocab-quiz-choice-chip"]')!.getAttribute('data-chip')).toBe('picked');
    expect(cards[0].querySelector('[data-testid="vocab-quiz-choice-wash"]')).toBeNull();
    expect(cards[0].querySelector('[data-testid="vocab-quiz-choice-chip"]')).toBeNull();
  });

  it('Given the reveal, Then the answer fills and the rest stay dark', () => {
    const cards = grid(1, 0);
    expect(cards[0].className).toMatch(/(^|\s)bg-neo-lime(\s|$)/);
    expect(cards[3].getAttribute('data-dim')).toBe('true');
    expect(cards[3].className).not.toMatch(/(^|\s)bg-neo-purple(\s|$)/);
  });

  it('Given a wrong pick at the reveal, Then it turns to a red 20% wash with a cross chip, so only the answer reads as filled', () => {
    const cards = grid(1, 0);
    expect(cards[1].className).not.toMatch(/(^|\s)bg-neo-pink(\s|$)/);
    expect(cards[1].querySelector('[data-testid="vocab-quiz-choice-wash"]')!.className).toContain('bg-neo-red/20');
    expect(cards[1].querySelector('[data-testid="vocab-quiz-choice-chip"]')!.getAttribute('data-chip')).toBe('wrong');
    expect(cards[0].querySelector('[data-testid="vocab-quiz-choice-chip"]')!.getAttribute('data-chip')).toBe('correct');
    expect(cards[1].className).toContain('outline-neo-red');
  });

  it('Given words of different length, Then every card label carries the same size class', () => {
    const labels = grid().map((card) => card.querySelector('[data-testid="vocab-quiz-choice-label"]')!.className);
    expect(new Set(labels).size).toBe(1);
    expect(labels[0]).toContain('text-[clamp(1.5rem,7.4vw,1.75rem)]');
    expect(labels[0]).toContain('sm:text-[2rem]');
  });

  it('Given the slot height, Then only a phone stretches the rows; wider screens keep a bounded button height', () => {
    const cards = grid();
    const group = screen.getByRole('group');
    expect(group.className).not.toMatch(/(^|\s)auto-rows-fr(\s|$)/);
    cards.forEach((card) => {
      expect(card.className).not.toMatch(/(^|\s)h-full(\s|$)/);
      expect(card.className).toContain('max-sm:min-h-[5.5rem]');
      expect(card.className).toContain('sm:min-h-[clamp(4rem,calc(32dvh_-_8rem),9rem)]');
    });
  });
});

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
        gameCode: 'A', index: 2, total: 8, focus: 'synonym', prompt: 'brittle',
        choices: CHOICES, limitMs: 20_000, remainingMs: 14_000, serverNow: Date.now(),
      });
    }
  });
}

describe('The live question gives its height to the prompt, not to stretched cards', () => {
  it('Given a question, Then only a phone grid fills its slot; wider screens keep content-height rows', () => {
    mountQuestion();
    const group = screen.getByRole('group', { name: 'vocabQuiz.answers.label' });
    expect(group.dataset.fill).toBeUndefined();
    expect(group.className).not.toMatch(/(^|\s)auto-rows-fr(\s|$)/);
    expect(group.className).toContain('max-sm:auto-rows-fr');
  });

  it('Given a question, Then the prompt word sits with Lexi directly on the navy', () => {
    mountQuestion();
    const panel = screen.getByTestId('vocab-quiz-question-block');
    expect(panel.className).not.toContain('border-[3px]');
    expect(panel.className).not.toContain('bg-neo-navy-elevated');
    expect(panel.contains(screen.getByTestId('vocab-quiz-question-mascot'))).toBe(true);
    expect(panel.contains(screen.getByTestId('vocab-quiz-prompt'))).toBe(true);
  });

  it('Given a question, Then header, column and band share one width so nothing hangs off one side', () => {
    mountQuestion();
    expect(screen.getByRole('banner').className).toContain('max-w-[720px]');
    expect(screen.getByTestId('vocab-quiz-column').className).toContain('max-w-[720px]');
  });

  it('Given the header outside a question, Then the count and the score each carry a label', () => {
    render(
      <VocabQuizStudentHeader questionNumber={3} totalQuestions={8} streak={0} score={0} pop={null} mascot="thinking" t={t} />
    );
    const header = screen.getByRole('banner');
    expect(within(header).getByTestId('vocab-quiz-hud-question')).toHaveTextContent('vocabQuiz.hud.question');
    expect(within(header).getByTestId('vocab-quiz-hud-score')).toHaveTextContent('vocabQuiz.hud.score');
  });
});

describe('The band speaks to the student before they pick', () => {
  it('Given no streak, Then one line says speed scores', () => {
    render(<VocabQuizFooterBar locked={false} streak={0} t={t} />);
    const footer = screen.getByTestId('vocab-quiz-footer');
    expect(within(footer).getByTestId('vocab-quiz-footer-hint')).toHaveTextContent('vocabQuiz.footer.speedTip');
  });

  it('Given one right in a row, Then the same line counts it', () => {
    render(<VocabQuizFooterBar locked={false} streak={1} t={t} />);
    expect(screen.getByTestId('vocab-quiz-footer-hint')).toHaveTextContent('vocabQuiz.footer.streakRun:1');
  });
});

describe('The score lives in the header cluster while a question runs', () => {
  it('Given a question, Then exactly one score shows and it sits in the header cluster', () => {
    mountQuestion();
    const scores = screen.getAllByTestId('vocab-quiz-hud-score');
    expect(scores).toHaveLength(1);
    expect(screen.getByTestId('vocab-quiz-hud-cluster').contains(scores[0])).toBe(true);
  });
});

describe('The band answers back once you pick', () => {
  it('Given a locked pick, Then the band echoes the word the student chose', () => {
    render(<VocabQuizFooterBar locked picked="enormous" t={t} />);
    expect(screen.getByTestId('vocab-quiz-footer')).toHaveTextContent('vocabQuiz.footer.youPicked:enormous');
  });
});
