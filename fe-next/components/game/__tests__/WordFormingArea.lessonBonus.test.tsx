import { render, screen } from '@testing-library/react';
import WordFormingArea, { type WordFeedback } from '../WordFormingArea';

/**
 * TDD RED: the lesson-word badge must show what the word was WORTH.
 *
 * A 📚 with no number is the state this shipped in for months: the server
 * computed `fromLesson`, sent it, and the client drew a book. A student could
 * not tell that finding their teacher's word had paid more than any other word,
 * so the mechanic taught nothing even once the server started paying for it.
 *
 * The number is the whole point. If a student cannot see that `CELL` scored
 * more than `SELL`, there is no reason for them to hunt the lesson words, and
 * the bonus is just an invisible nudge to the leaderboard.
 *
 * The client NEVER computes this figure — it renders the `lessonBonus` the
 * server sent. Two sides computing the same number independently drift, and
 * this repo already carries one such divergence.
 */

const MOTION_PROPS = new Set([
  'initial', 'animate', 'exit', 'transition', 'layout',
  'whileHover', 'whileTap', 'whileInView', 'variants', 'custom',
]);
function stripMotion(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!MOTION_PROPS.has(k)) out[k] = v;
  }
  return out;
}

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...stripMotion(props)}>{children}</div>
    ),
    span: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <span {...stripMotion(props)}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useCosyMode: () => false,
}));

function lessonFeedback(overrides: Partial<WordFeedback> = {}): WordFeedback {
  return {
    id: `accepted-${Date.now()}`,
    type: 'accepted',
    word: 'CELL',
    score: 3,
    fromLesson: true,
    lessonBonus: 5,
    timestamp: Date.now(),
    ...overrides,
  };
}

function renderArea(feedback: WordFeedback | null) {
  return render(
    <WordFormingArea word="CELL" letterCount={4} feedback={feedback} />
  );
}

describe('WordFormingArea — lesson word bonus is visible', () => {
  it('shows the bonus the server awarded next to the lesson badge', () => {
    renderArea(lessonFeedback({ lessonBonus: 5 }));

    // The number the server sent, rendered where the student is already looking.
    expect(screen.getByText(/\+5/)).toBeInTheDocument();
  });

  it('renders the number the SERVER sent, not a hardcoded 5', () => {
    // If the client ever hardcodes the constant instead of reading the payload,
    // a server-side change to the rule silently stops matching the HUD.
    renderArea(lessonFeedback({ lessonBonus: 8 }));

    expect(screen.getByText(/\+8/)).toBeInTheDocument();
    expect(screen.queryByText(/\+5/)).not.toBeInTheDocument();
  });

  it('keeps the 📚 marker so the cue is not colour/number alone', () => {
    // Accessibility: never encode meaning by one channel. The book stays.
    const { container } = renderArea(lessonFeedback());
    expect(container.textContent).toContain('📚');
  });

  it('shows no bonus chip for an ordinary accepted word', () => {
    renderArea(lessonFeedback({ fromLesson: false, lessonBonus: undefined }));

    expect(screen.queryByText(/\+5/)).not.toBeInTheDocument();
  });

  it('still renders the badge when an older server sends no lessonBonus', () => {
    // Graceful degrade: a server that predates the bonus sends fromLesson only.
    // The badge must not vanish and must not print "+undefined".
    const { container } = renderArea(lessonFeedback({ lessonBonus: undefined }));

    expect(container.textContent).toContain('📚');
    expect(container.textContent).not.toContain('undefined');
    expect(container.textContent).not.toContain('NaN');
  });
});
