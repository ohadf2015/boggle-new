import { render, screen, fireEvent } from '@testing-library/react';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { ProducePractice } from '../ProducePractice';

/**
 * TDD RED: the produce round as a student actually meets it.
 *
 * The property the whole mode stands on is negative and must be asserted as
 * such: there are NO answer choices on screen. Every other vocabulary surface
 * in this product shows four buttons, and a "produce mode" that quietly renders
 * them is recognition with extra steps.
 *
 * The second property is the exposure beat. A student meeting a word for the
 * first time is shown the word and its meaning before being asked to produce
 * it. Cold retrieval of a word never encountered is not retrieval practice, it
 * is a blank page — the research calls for blocked practice on new material
 * first, and this is that, made concrete at the smallest scale.
 */

/**
 * The real `t` is `t(key, fallback?, params?)` and it INTERPOLATES `{var}` at
 * every return point. A mock that just echoes the key silently swallows any
 * value passed through a translation — the hint count among them — and makes a
 * working component look broken (or, worse, a broken one look fine).
 */
function translate(
  key: string,
  fallbackOrParams?: string | Record<string, string | number>,
  maybeParams?: Record<string, string | number>
): string {
  const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : maybeParams;
  const base = typeof fallbackOrParams === 'string' ? fallbackOrParams : key;
  if (!params) return base;
  return base.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: translate, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: translate, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/education/practice/usePracticeSfx', () => ({
  usePracticeSfx: () => ({ correct: vi.fn(), wrong: vi.fn(), advance: vi.fn() }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../PracticeResultsCard', () => ({
  __esModule: true,
  default: ({ correct, total, hintsUsed }: { correct: number; total: number; hintsUsed?: number }) => (
    <div data-testid="results">
      results {correct}/{total} hints:{hintsUsed ?? 0}
    </div>
  ),
}));

const CELL: VocabularyWord = {
  word: 'cell',
  definition: 'a small room in a prison',
  synonyms: ['chamber'],
  canIntegrate: true,
};

function renderPractice(props: Partial<React.ComponentProps<typeof ProducePractice>> = {}) {
  return render(
    <ProducePractice
      words={[CELL]}
      focus="definition"
      seed={1}
      onComplete={vi.fn()}
      onBack={vi.fn()}
      {...props}
    />
  );
}

/** Clear the exposure beat that precedes a first-exposure word. */
function passExposure() {
  const start = screen.queryByTestId('produce-exposure-continue');
  if (start) fireEvent.click(start);
}

function typeAnswer(value: string) {
  fireEvent.change(screen.getByTestId('produce-input'), { target: { value } });
  fireEvent.click(screen.getByTestId('produce-submit'));
}

describe('ProducePractice — production, not recognition', () => {
  it('shows an exposure card before the first ask of a new word', () => {
    renderPractice();

    // The word itself is on screen, with its meaning, BEFORE any question.
    expect(screen.getByTestId('produce-exposure')).toBeInTheDocument();
    expect(screen.getByTestId('produce-exposure')).toHaveTextContent('cell');
    // And no input yet — this beat is for reading, not answering.
    expect(screen.queryByTestId('produce-input')).not.toBeInTheDocument();
  });

  it('skips the exposure card for a word the student already knows', () => {
    renderPractice({ knownWords: ['cell'] });

    expect(screen.queryByTestId('produce-exposure')).not.toBeInTheDocument();
    expect(screen.getByTestId('produce-input')).toBeInTheDocument();
  });

  it('asks with the cue and gives a text box — never a set of choices', () => {
    renderPractice({ knownWords: ['cell'] });

    expect(screen.getByText(/a small room in a prison/)).toBeInTheDocument();
    expect(screen.getByTestId('produce-input')).toBeInTheDocument();
    // The load-bearing negative: nothing to pick from.
    expect(screen.queryAllByTestId(/produce-choice/)).toHaveLength(0);
  });

  it('does not show the answer anywhere before the student commits', () => {
    // A word sitting in the DOM is a word a student can read off the page.
    const { container } = renderPractice({ knownWords: ['cell'] });
    expect(container.textContent).not.toContain('cell');
  });

  it('accepts the typed word and reports it correct', () => {
    renderPractice({ knownWords: ['cell'] });
    typeAnswer('cell');

    expect(screen.getByTestId('produce-verdict')).toHaveTextContent('correct');
  });

  it('marks a one-letter slip as a near miss and shows the right spelling', () => {
    renderPractice({ knownWords: ['cell'] });
    typeAnswer('cel');

    expect(screen.getByTestId('produce-verdict')).toHaveTextContent('near-miss');
    // The student retrieved it — they must see how it is actually spelled.
    expect(screen.getByTestId('produce-correct-spelling')).toHaveTextContent('cell');
  });

  it('marks an unrelated answer wrong', () => {
    renderPractice({ knownWords: ['cell'] });
    typeAnswer('dog');

    expect(screen.getByTestId('produce-verdict')).toHaveTextContent('wrong');
  });
});

describe('ProducePractice — the hint ladder', () => {
  it('reveals the length first, then opening letters', () => {
    renderPractice({ knownWords: ['cell'] });

    fireEvent.click(screen.getByTestId('produce-hint'));
    expect(screen.getByTestId('produce-hint-display')).toHaveTextContent('4');

    fireEvent.click(screen.getByTestId('produce-hint'));
    expect(screen.getByTestId('produce-hint-display')).toHaveTextContent('c');
  });

  it('still scores a correct answer that used the whole ladder', () => {
    // Scaffolded retrieval is the mechanism, not cheating. If hints could zero
    // the score, the rational move is to guess rather than ask — the opposite
    // of what the mode is for.
    const onComplete = vi.fn();
    renderPractice({ knownWords: ['cell'], onComplete });

    for (let i = 0; i < 5; i++) {
      const button = screen.getByTestId('produce-hint') as HTMLButtonElement;
      if (button.disabled) break;
      fireEvent.click(button);
    }
    typeAnswer('cell');

    expect(screen.getByTestId('produce-verdict')).toHaveTextContent('correct');
    // The round only closes when the student advances past the last question.
    fireEvent.click(screen.getByTestId('produce-next'));
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ correct: 1, points: expect.any(Number) })
    );
    expect(onComplete.mock.calls[0][0].points).toBeGreaterThan(0);
  });

  it('stops offering hints once the ladder is exhausted', () => {
    renderPractice({ knownWords: ['cell'] });

    for (let i = 0; i < 10; i++) {
      const button = screen.queryByTestId('produce-hint');
      if (!button || (button as HTMLButtonElement).disabled) break;
      fireEvent.click(button);
    }

    const button = screen.queryByTestId('produce-hint') as HTMLButtonElement | null;
    expect(button === null || button.disabled).toBe(true);
  });
});

describe('ProducePractice — empty state', () => {
  it('explains rather than rendering an empty round when the lesson has no usable data', () => {
    render(
      <ProducePractice
        words={[{ word: 'bare', canIntegrate: true }]}
        focus="definition"
        seed={1}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.queryByTestId('produce-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('produce-empty')).toBeInTheDocument();
  });
});
