import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { VocabQuizView } from '../VocabQuizView';
import { VocabQuizStakesMeter, stakesPoints } from '../VocabQuizStakesMeter';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';
import { useClassroomPressureStore } from '@/hooks/gameState/classroomPressureStore';
import { DEFAULT_CLASSROOM_PRESSURE } from '@/shared/utils/classroomPressure';

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt} />,
}));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const CLOCK = { secondsLeft: 14, fractionLeft: 0.7, urgent: false, ticking: false };
const POINTS = { now: 135, floor: 100 };

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
  gameCode: 'ABC123', index: 2, total: 8, focus: 'synonym' as const,
  prompt: 'brittle', choices: ['fragile', 'enormous', 'quiet', 'ancient'],
  limitMs: 20_000, remainingMs: 14_000, serverNow: Date.now(),
};

function mount(question: Partial<typeof QUESTION> = {}) {
  const s = makeSocket();
  render(<VocabQuizView socket={s.socket} username="ana" t={t} />);
  s.server(VOCAB_QUIZ_EVENTS.question, { ...QUESTION, serverNow: Date.now(), ...question });
  s.server(VOCAB_QUIZ_EVENTS.lockIn, { gameCode: 'ABC123', index: 2, locked: 2, total: 4, distribution: [1, 1, 0, 0] });
  return s;
}

describe('stakesPoints: the shared scoring, read at the current clock', () => {
  it('Given 70% of the clock left and no streak, Then +135 now and +100 once the clock runs out', () => {
    expect(stakesPoints({ fractionLeft: 0.7, limitMs: 20_000, streak: 0, speedScoring: true })).toEqual({ now: 135, floor: 100 });
  });

  it('Given a streak of 3, Then the streak bonus lifts both ends', () => {
    expect(stakesPoints({ fractionLeft: 1, limitMs: 20_000, streak: 3, speedScoring: true })).toEqual({ now: 180, floor: 130 });
  });

  it('Given speed scoring off, Then nothing drains: now equals floor', () => {
    expect(stakesPoints({ fractionLeft: 0.7, limitMs: 20_000, streak: 0, speedScoring: false })).toEqual({ now: 100, floor: 100 });
  });
});

describe('The clock is one countdown ring with quiet points text, never a second bar', () => {
  it('Given a running clock, Then a lime ring drains with the seconds and the points are plain small text', () => {
    render(<VocabQuizStakesMeter clock={CLOCK} points={POINTS} t={t} />);
    const timer = screen.getByRole('timer');
    expect(timer.className).toContain('text-neo-lime');
    expect(timer.dataset.urgent).toBe('false');
    const fill = screen.getByTestId('vocab-quiz-stakes-fill');
    expect(fill.tagName.toLowerCase()).toBe('circle');
    expect(fill.dataset.left).toBe('70');
    expect(fill.getAttribute('class')).toContain('motion-reduce:transition-none');
    expect(timer.outerHTML).not.toMatch(/rounded-full bg-neo-white\/15/);
    const chip = screen.getByTestId('vocab-quiz-stakes-now');
    expect(chip).toHaveTextContent('+135');
    expect(chip.className).toMatch(/(^|\s)text-(xs|sm)(\s|$)/);
    expect(chip.className).not.toMatch(/(^|\s)border-/);
    expect(screen.queryByTestId('vocab-quiz-stakes-floor')).toBeNull();
    expect(screen.queryByTestId('vocab-quiz-stakes-label')).toBeNull();
    expect(screen.getByTestId('vocab-quiz-stakes-seconds')).toHaveTextContent('14');
    expect(screen.getByTestId('vocab-quiz-stakes-seconds').className).not.toMatch(/text-(2xl|3xl|4xl)/);
  });

  it('Given the last seconds, Then the bar turns orange and never pulses its opacity', () => {
    render(<VocabQuizStakesMeter clock={{ ...CLOCK, secondsLeft: 3, fractionLeft: 0.15, urgent: true, ticking: true }} points={POINTS} t={t} />);
    const timer = screen.getByRole('timer');
    expect(timer.dataset.urgent).toBe('true');
    expect(timer.className).toContain('text-neo-orange');
    expect(timer.outerHTML).not.toContain('animate-pulse');
  });

  it('Given a locked answer, Then the chip goes away and the clock keeps running for the room', () => {
    render(<VocabQuizStakesMeter clock={CLOCK} points={null} t={t} />);
    expect(screen.queryByTestId('vocab-quiz-stakes-now')).toBeNull();
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('Given the clock ran out, Then the seconds give way to a short time-up label', () => {
    render(<VocabQuizStakesMeter clock={{ ...CLOCK, secondsLeft: 0, fractionLeft: 0, urgent: true }} points={null} timeUp t={t} />);
    expect(screen.getByTestId('vocab-quiz-stakes-timeup')).toHaveTextContent('vocabQuiz.stakes.timeUp');
    expect(screen.queryByTestId('vocab-quiz-stakes-seconds')).toBeNull();
  });
});

describe('The student screen: the clock lives inside the question card', () => {
  beforeEach(() => {
    useClassroomPressureStore.getState().setClassroomPressure(null);
  });

  it('Given a question, Then the timer is part of the question card, comes before the answers, and is not in the footer', () => {
    mount();
    const timer = screen.getByRole('timer');
    const block = screen.getByTestId('vocab-quiz-question-block');
    const answers = screen.getByRole('group', { name: 'vocabQuiz.answers.label' });
    expect(screen.getByTestId('vocab-quiz-column').contains(timer)).toBe(true);
    expect(block.contains(timer)).toBe(true);
    expect(timer.compareDocumentPosition(answers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('vocab-quiz-footer').contains(timer)).toBe(false);
    expect(screen.getByTestId('vocab-quiz-hud-cluster').contains(timer)).toBe(false);
  });

  it('Given a question, Then the footer slot is not a lit slab competing with the answers', () => {
    mount();
    const footer = screen.getByTestId('vocab-quiz-footer');
    expect(footer.className).not.toContain('bg-neo-navy-elevated');
    expect(footer.textContent).not.toContain('vocabQuiz.stakes.label');
  });

  it('Given 14s of 20 left and no streak, Then the chip offers +135 from the shared scoring', () => {
    mount();
    expect(screen.getByTestId('vocab-quiz-stakes-now')).toHaveTextContent('+135');
  });

  it('Given the teacher turned speed scoring off, Then the chip offers flat points', () => {
    useClassroomPressureStore.getState().setClassroomPressure({ ...DEFAULT_CLASSROOM_PRESSURE, speedScoring: false });
    mount();
    expect(screen.getByTestId('vocab-quiz-stakes-now')).toHaveTextContent('+100');
  });

  it('Given a pick, Then the offer disappears once the answer is locked', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /fragile/ }));
    expect(screen.queryByTestId('vocab-quiz-stakes-now')).toBeNull();
  });

  it('Given the clock ran out before the reveal, Then every tile is locked and dimmed and the keys do nothing', () => {
    const s = mount({ remainingMs: 0 });
    const emit = vi.fn();
    (s.socket as unknown as { emit: typeof emit }).emit = emit;
    const tiles = screen.getAllByRole('button').filter((b) => QUESTION.choices.some((c) => b.textContent?.includes(c)));
    expect(tiles).toHaveLength(4);
    tiles.forEach((tile) => {
      expect(tile).toBeDisabled();
      expect(tile.dataset.dim).toBe('true');
    });
    fireEvent.keyDown(window, { key: '2' });
    expect(tiles[1].getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('vocab-quiz-stakes-timeup')).toBeInTheDocument();
  });

  it('Given a question, Then the ask line is at least 20px so the big word does not dwarf it', () => {
    mount();
    expect(screen.getByTestId('vocab-quiz-ask').className).toMatch(/\btext-(xl|2xl)\b/);
    expect(screen.getByTestId('vocab-quiz-ask').className).not.toMatch(/\btext-base\b/);
  });
});
