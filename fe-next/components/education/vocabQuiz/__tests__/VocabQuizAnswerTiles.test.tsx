import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt} />,
}));

import { VocabQuizView } from '../VocabQuizView';
import { VocabQuizAnswerGrid } from '../VocabQuizAnswerGrid';
import { VocabQuizRevealBanner } from '../VocabQuizRevealBanner';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const CHOICES = ['fragile', 'enormous', 'quiet', 'ancient'];
const FAMILIES = ['lime', 'pink', 'cyan', 'purple'] as const;

function tiles(selectedIndex: number | null = null, correctIndex: number | null = null) {
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
        choices: CHOICES, limitMs: 20_000, remainingMs: 20_000, serverNow: Date.now(),
      });
    }
  });
}

describe('Answer tiles read as game buttons, not a quiz form', () => {
  it('Given a tile, When it renders, Then the label sits at the start edge beside a large in-flow shape chip', () => {
    tiles().forEach((tile, i) => {
      expect(tile.className).toContain('text-start');
      expect(tile.className).toContain('sm:justify-start');
      expect(tile.className).not.toMatch(/(^|\s)text-center(\s|$)/);
      const chip = tile.querySelector('[data-testid="vocab-quiz-choice-badge"]')!;
      expect(chip.className).not.toContain('absolute');
      expect(chip.className).toMatch(/(^|\s)size-1[2-6](\s|$)/);
      expect(chip.className).toContain(`bg-neo-${FAMILIES[i]}`);
    });
  });

  it('Given a keyboard, Then the key hint rides the end of the row instead of floating over the word', () => {
    tiles().forEach((tile) => {
      const hint = tile.querySelector('[data-testid="vocab-quiz-key-hint"]')!;
      expect(hint.className).not.toContain('absolute');
      expect(hint.className).toContain('ms-auto');
    });
  });

  it('Given a wide screen, Then tiles are about a third shorter than the old 12rem slabs', () => {
    tiles().forEach((tile) => {
      expect(tile.className).toContain('sm:min-h-[clamp(4rem,calc(32dvh_-_8rem),9rem)]');
      expect(tile.className).not.toContain('12rem');
    });
  });

  it('Given a phone, Then the chip stacks over the label and the tiles split the free height evenly', () => {
    const all = tiles();
    const group = screen.getByRole('group');
    expect(group.className).toContain('max-sm:flex-1');
    expect(group.className).toContain('max-sm:auto-rows-fr');
    all.forEach((tile) => {
      expect(tile.className).toContain('max-sm:flex-col');
      expect(tile.className).toContain('max-sm:min-h-[5.5rem]');
    });
  });

  it('Given a phone, When a question is live, Then the answer slot grows into the space above the footer', () => {
    mountQuestion();
    const group = screen.getByRole('group', { name: 'vocabQuiz.answers.label' });
    expect(group.parentElement!.className).toContain('max-sm:flex-1');
    expect(group.parentElement!.className).toContain('max-sm:min-h-0');
  });
});

describe('The feedback band ends on one lime action slot', () => {
  it.each([true, false, null])('Given verdict %s, Then the next-word slot is a lime face with a black edge and a 6px lip', (correct) => {
    render(<VocabQuizRevealBanner correct={correct} answer="fragile" word="brittle" sweep={false} points={140} nextInMs={3000} t={t} />);
    const pill = screen.getByTestId('vocab-quiz-next-pill');
    expect(pill.className).toMatch(/(^|\s)bg-neo-lime(\s|$)/);
    expect(pill.className).not.toMatch(/(^|\s)bg-neo-white(\s|$)/);
    expect(pill.className).toContain('border-neo-black');
    expect(pill.className).toContain('border-b-[6px]');
  });
});
