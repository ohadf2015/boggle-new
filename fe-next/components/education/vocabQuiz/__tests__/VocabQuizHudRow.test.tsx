import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import { VocabQuizView } from '../VocabQuizView';
import { VocabQuizFooterBar } from '../VocabQuizFooterBar';
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
  gameCode: 'ABC123', index: 2, total: 8, focus: 'synonym' as const,
  prompt: 'brittle', choices: ['fragile', 'enormous', 'quiet', 'ancient'],
  limitMs: 20_000, remainingMs: 14_000, serverNow: Date.now(),
};

const REVEAL = {
  gameCode: 'ABC123', index: 2, total: 8, answerIndex: 0, answer: 'fragile', word: 'brittle',
  definition: 'hard but easily broken', distribution: [2, 1, 1, 0],
  standings: [
    { username: 'maya', score: 820, streak: 4, bestStreak: 4, correctCount: 7 },
    { username: 'ana', score: 640, streak: 3, bestStreak: 3, correctCount: 5 },
  ],
  nextInMs: 3_000, isLast: false,
};

function mount(question: Partial<typeof QUESTION> = {}) {
  const s = makeSocket();
  render(<VocabQuizView socket={s.socket} username="ana" t={t} />);
  s.server(VOCAB_QUIZ_EVENTS.question, { ...QUESTION, serverNow: Date.now(), ...question });
  return s;
}

describe('Student quiz top row: X, one bar, one score-and-clock cluster', () => {
  it('Given a question, Then the bar and the score sit on the header row and the clock sits under the question', () => {
    mount();
    const header = screen.getByRole('banner');
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(header.contains(screen.getByRole('progressbar'))).toBe(true);
    expect(header.contains(screen.getByRole('timer'))).toBe(false);
    expect(screen.getAllByTestId('vocab-quiz-hud-score')).toHaveLength(1);
    expect(header.contains(screen.getByTestId('vocab-quiz-hud-score'))).toBe(true);
  });

  it('Given a question, Then the score sits in one cluster at the end of the row, with no clock in it', () => {
    mount();
    const cluster = screen.getByTestId('vocab-quiz-hud-cluster');
    expect(cluster.contains(screen.getByRole('timer'))).toBe(false);
    expect(cluster.contains(screen.getByTestId('vocab-quiz-hud-score'))).toBe(true);
    expect(screen.getByRole('banner').lastElementChild).toBe(cluster);
  });

  it('Given a question, Then the header drops the separate question count, flame and mascot', () => {
    mount();
    const header = screen.getByRole('banner');
    expect(within(header).queryByTestId('vocab-quiz-hud-question')).toBeNull();
    expect(within(header).queryByTestId('vocab-quiz-progress-count')).toBeNull();
    expect(within(header).queryByRole('img')).toBeNull();
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('vocabQuiz.progress:3,8');
  });

  it('Given a question, Then Lexi reacts beside the question instead of the header', () => {
    mount();
    expect(within(screen.getByTestId('vocab-quiz-column')).getByRole('img')).toBeInTheDocument();
  });

  it('Given the reveal on a wide screen, Then the verdict sheet owns Lexi and the framed panel drops her slot instead of leaving a hole', () => {
    const s = mount();
    s.server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);
    const slot = screen.getByTestId('vocab-quiz-question-mascot');
    expect(slot.className).toContain('sm:hidden');
    expect(slot.className).not.toMatch(/(^|\s)hidden/);
  });
});

describe('The topic is a label above the question, not a chip', () => {
  it('Given a question, Then the topic label sits in the question block before the prompt', () => {
    mount();
    const focus = screen.getByTestId('vocab-quiz-focus');
    const block = screen.getByTestId('vocab-quiz-question-block');
    expect(block.contains(focus)).toBe(true);
    expect(focus.compareDocumentPosition(screen.getByTestId('vocab-quiz-prompt')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(focus.className).not.toContain('rounded-full');
    expect(focus.className).toContain('text-neo-purple');
  });
});

describe('One neutral clock that only turns urgent at the end', () => {
  it('Given plenty of time, Then the clock is neutral: no orange, no cyan', () => {
    mount();
    const timer = screen.getByRole('timer');
    expect(timer.dataset.urgent).toBe('false');
    expect(timer.outerHTML).not.toMatch(/neo-orange|neo-cyan/);
  });

  it('Given the last seconds, Then the clock turns orange', () => {
    mount({ remainingMs: 3_000 });
    const timer = screen.getByRole('timer');
    expect(timer.dataset.urgent).toBe('true');
    expect(timer.className).toContain('text-neo-orange');
  });

  it('Given the clock has run out before the reveal, Then it stays urgent, the clock says time is up and the band says the answer is coming', () => {
    mount({ remainingMs: 0 });
    expect(screen.getByRole('timer').dataset.urgent).toBe('true');
    expect(screen.getByTestId('vocab-quiz-stakes-timeup')).toBeInTheDocument();
    expect(screen.getByTestId('vocab-quiz-footer')).toHaveTextContent('vocabQuiz.footer.timeUp');
  });

  it('Given the reveal, Then the rank takes the clock slot inside the header cluster', () => {
    const s = mount();
    s.server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);
    expect(screen.queryByRole('timer')).toBeNull();
    expect(within(screen.getByTestId('vocab-quiz-hud-cluster')).getByText('vocabQuiz.rank:2,2')).toBeInTheDocument();
  });
});

describe('The freed height goes to the answers', () => {
  it('Given a phone, Then the question keeps its content height and never grows into the space', () => {
    mount();
    const slot = screen.getByRole('group', { name: 'vocabQuiz.answers.label' }).parentElement!;
    expect(slot.className).not.toMatch(/(^|\s)flex-1(\s|$)/);
    const block = screen.getByTestId('vocab-quiz-question-block');
    expect(block.className).not.toContain('shadow-hard');
    expect(block.className).not.toContain('flex-1');
    expect(block.parentElement!.className).not.toContain('flex-[1_0_auto]');
  });
});

describe('The chest picker keeps the free height', () => {
  it('Given a chest on offer, Then the question stops growing so the picker gets the room', () => {
    const s = mount();
    s.server(VOCAB_QUIZ_EVENTS.answerResult, {
      index: 2, correct: true, choiceIndex: 0, points: 148, speedBonus: 0, streakBonus: 0, streak: 1, totalScore: 148, chestPending: true,
    });
    s.server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);
    const block = screen.getByTestId('vocab-quiz-question-block');
    expect(block.parentElement!.className).not.toContain('flex-[1_0_auto]');
  });
});

describe('The bottom band carries something to act on', () => {
  it('Given no streak, Then the band says fast answers score more', () => {
    render(<VocabQuizFooterBar locked={false} streak={0} t={t} />);
    const hint = screen.getByTestId('vocab-quiz-footer-hint');
    expect(hint).toHaveTextContent('vocabQuiz.footer.speedTip');
    expect(hint.dataset.live).toBe('false');
  });

  it('Given a live streak, Then the band counts the run with a lit flame', () => {
    render(<VocabQuizFooterBar locked={false} streak={3} t={t} />);
    const hint = screen.getByTestId('vocab-quiz-footer-hint');
    expect(hint).toHaveTextContent('vocabQuiz.footer.streakRun:3');
    expect(hint.dataset.live).toBe('true');
  });

  it('Given classmates answering, Then the room chip shows one dot per classmate, filled for each answer', () => {
    render(<VocabQuizFooterBar locked={false} lockedIn={{ locked: 2, total: 4 }} t={t} />);
    const dots = screen.getByTestId('vocab-quiz-footer-room').querySelectorAll('[data-dot]');
    expect(dots).toHaveLength(4);
    expect(Array.from(dots).filter((d) => d.getAttribute('data-dot') === 'on')).toHaveLength(2);
  });

  it('Given a big class, Then the room chip shows the count only', () => {
    render(<VocabQuizFooterBar locked={false} lockedIn={{ locked: 9, total: 30 }} t={t} />);
    expect(screen.getByTestId('vocab-quiz-footer-room').querySelectorAll('[data-dot]')).toHaveLength(0);
  });

  it('Given a locked answer, Then the time-up line never replaces the locked line', () => {
    render(<VocabQuizFooterBar locked timeUp picked="fragile" t={t} />);
    const footer = screen.getByTestId('vocab-quiz-footer');
    expect(footer).toHaveTextContent('vocabQuiz.footer.locked');
    expect(footer.textContent).not.toContain('vocabQuiz.footer.timeUp');
  });
});
