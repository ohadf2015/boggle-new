import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt} />,
}));

import { VocabQuizView } from '../VocabQuizView';
import { VocabQuizAnswerGrid } from '../VocabQuizAnswerGrid';
import { VocabQuizPromptPanel } from '../VocabQuizPromptPanel';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const FAMILIES = ['lime', 'pink', 'cyan', 'purple'] as const;
const CHOICES = ['fragile', 'enormous', 'quiet', 'ancient'];

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

function tiles(selectedIndex: number | null = null, correctIndex: number | null = null) {
  render(
    <VocabQuizAnswerGrid choices={CHOICES} selectedIndex={selectedIndex} correctIndex={correctIndex} disabled={false} onSelect={() => {}} t={t} />
  );
  return screen.getAllByRole('button');
}

describe('The prompt is the one focal point, sitting on the navy', () => {
  it('Given a question, When the prompt renders, Then it has no frame, fill or lip of its own', () => {
    render(<VocabQuizPromptPanel focusLabel="Synonyms" ask="Which word means the same?" prompt="brittle" mascot="thinking" revealed={false} t={t} />);
    const block = screen.getByTestId('vocab-quiz-question-block');
    expect(block.className).not.toMatch(/(^|\s)border(-\[|-neo|-\d|\s|$)/);
    expect(block.className).not.toMatch(/(^|\s)bg-neo-/);
    expect(block.className).not.toMatch(/shadow-hard/);
  });
});

describe('Answer tiles are a calm field', () => {
  it('Given no pick, Then all four share one neutral border and lip, and the family colour lives only in the shape chip', () => {
    tiles().forEach((tile, i) => {
      expect(tile.className).toContain('border-neo-white/20');
      expect(tile.className).not.toMatch(new RegExp(`(^|\\s)border-neo-${FAMILIES[i]}(\\s|$)`));
      expect(tile.className).not.toContain(`shadow-neo-${FAMILIES[i]}-muted`);
      expect(tile.querySelector('[data-testid="vocab-quiz-choice-badge"]')!.className).toContain(`bg-neo-${FAMILIES[i]}`);
    });
  });

  it('Given a pointer hovers a tile, Then its family colour shows on the border, never as a full fill', () => {
    tiles().forEach((tile, i) => {
      expect(tile.className).toContain(`[@media(hover:hover)]:hover:border-neo-${FAMILIES[i]}`);
      expect(tile.className).not.toContain(`hover:bg-neo-${FAMILIES[i]} `);
      expect(tile.className).not.toMatch(new RegExp(`hover:bg-neo-${FAMILIES[i]}$`));
    });
  });

  it('Given a pick, Then only that tile takes its family border', () => {
    const all = tiles(1);
    expect(all[1].className).toMatch(/(^|\s)border-neo-pink(\s|$)/);
    expect(all[0].className).not.toMatch(/(^|\s)border-neo-lime(\s|$)/);
  });
});

describe('Height goes to the answers on a phone, and the cluster rides high on desktop', () => {
  it('Given a phone, Then the question keeps its content height and the tiles fill the rest', () => {
    mountQuestion();
    const block = screen.getByTestId('vocab-quiz-question-block');
    expect(block.className).not.toMatch(/flex-1|flex-\[1_0_auto\]/);
    expect(block.parentElement!.className).not.toMatch(/flex-1|flex-\[1_0_auto\]/);
    screen.getAllByRole('button', { name: /fragile|enormous|quiet|ancient/ }).forEach((tile) => {
      expect(tile.className).toContain('max-sm:min-h-[5.5rem]');
    });
    expect(screen.getByRole('group', { name: 'vocabQuiz.answers.label' }).className).toContain('max-sm:flex-1');
  });

  it('Given a wide screen, Then the column starts near the top instead of floating mid-screen', () => {
    mountQuestion();
    expect(screen.getByTestId('vocab-quiz-column').className).toContain('sm:justify-start');
  });
});
