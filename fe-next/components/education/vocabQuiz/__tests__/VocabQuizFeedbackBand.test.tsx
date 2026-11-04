import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const pref = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => pref.reduced }));
vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt} />,
}));

import { VocabQuizView } from '../VocabQuizView';
import { VocabQuizFooterBar } from '../VocabQuizFooterBar';
import { VocabQuizAnswerGrid } from '../VocabQuizAnswerGrid';
import { VocabQuizRevealBanner } from '../VocabQuizRevealBanner';
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

describe('Vocab quiz feedback band', () => {
  beforeEach(() => {
    pref.reduced = false;
  });

  it('given no answer yet, the band shows the speed tip and no keyboard text', () => {
    render(<VocabQuizFooterBar locked={false} t={t} />);
    const footer = screen.getByTestId('vocab-quiz-footer');
    expect(footer).toHaveTextContent('vocabQuiz.footer.speedTip');
    expect(footer).not.toHaveTextContent('vocabQuiz.footer.keys');
  });

  it('given a locked answer, the band shows the locked-in headline', () => {
    render(<VocabQuizFooterBar locked lockedIn={{ locked: 2, total: 4 }} t={t} />);
    expect(screen.getByTestId('vocab-quiz-footer-status')).toHaveTextContent('vocabQuiz.footer.locked');
  });

  it('given a question, asks it in words under the prompt, keyed by focus', () => {
    const s = makeSocket();
    render(<VocabQuizView socket={s.socket} username="ana" t={t} />);
    s.server(VOCAB_QUIZ_EVENTS.question, {
      gameCode: 'A', index: 0, total: 4, focus: 'synonym', prompt: 'brittle',
      choices: ['fragile', 'enormous', 'quiet', 'ancient'], limitMs: 20_000, remainingMs: 20_000, serverNow: Date.now(),
    });
    expect(screen.getByTestId('vocab-quiz-ask')).toHaveTextContent('vocabQuiz.ask.synonym');
  });

  it('given a reveal, the next-word countdown sits in a pill at the end of the verdict row', () => {
    render(<VocabQuizRevealBanner correct answer="fragile" word="brittle" sweep={false} points={140} nextInMs={3000} t={t} />);
    const pill = screen.getByTestId('vocab-quiz-next-pill');
    expect(pill.contains(screen.getByTestId('vocab-quiz-next-beat'))).toBe(true);
    expect(screen.getByTestId('vocab-quiz-verdict-row').contains(pill)).toBe(true);
  });
});

describe('Vocab quiz answer tiles', () => {
  const grid = (selectedIndex: number | null, correctIndex: number | null) =>
    render(
      <VocabQuizAnswerGrid
        choices={['fragile', 'enormous', 'quiet', 'ancient']} selectedIndex={selectedIndex} correctIndex={correctIndex}
        disabled={correctIndex !== null} onSelect={() => {}} t={t}
      />
    );

  it('puts the word in its own label slot on every tile', () => {
    grid(null, null);
    expect(screen.getAllByTestId('vocab-quiz-choice-label').map((n) => n.textContent)).toEqual([
      'fragile', 'enormous', 'quiet', 'ancient',
    ]);
  });

  it('given a reveal, dims every tile but the pick and the answer', () => {
    grid(1, 0);
    const dims = screen.getAllByRole('button').map((b) => b.getAttribute('data-dim'));
    expect(dims).toEqual([null, null, 'true', 'true']);
    expect(screen.getAllByRole('button')[2].className).toContain('motion-reduce:transition-none');
  });

  it('given a right pick, sparkles that tile', () => {
    grid(0, 0);
    const [right] = screen.getAllByRole('button');
    expect(right.querySelectorAll('[data-testid="edu-burst-piece"]').length).toBeGreaterThan(0);
  });

  it('given a wrong pick, no tile sparkles', () => {
    grid(1, 0);
    expect(screen.queryAllByTestId('edu-burst-piece')).toHaveLength(0);
  });

  it('given reduced motion, a right pick does not sparkle', () => {
    pref.reduced = true;
    grid(0, 0);
    expect(screen.queryAllByTestId('edu-burst-piece')).toHaveLength(0);
  });
});
