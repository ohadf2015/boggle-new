import { render, screen, act } from '@testing-library/react';
import WordFormingArea, { type WordFeedback } from '../WordFormingArea';

// Strip framer-motion-only props so the passthrough doesn't warn / leak them to the DOM.
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

const accepted = (word: string): WordFeedback => ({
  id: `accepted-${Date.now()}`,
  type: 'accepted',
  word,
  score: 12,
  timestamp: Date.now(),
});

describe('WordFormingArea — feedback bridge on submit', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('keeps the just-submitted word visible while awaiting async feedback (no empty flash)', () => {
    const { rerender } = render(<WordFormingArea word="CAT" letterCount={3} feedback={null} compact />);
    expect(screen.getByText('CAT')).toBeInTheDocument();

    // Submit: selection clears synchronously, feedback has NOT arrived yet.
    rerender(<WordFormingArea word="" letterCount={0} feedback={null} compact />);

    // The pill must bridge — the word stays, the empty placeholder must NOT appear.
    expect(screen.getByText('CAT')).toBeInTheDocument();
    expect(screen.queryByText('···')).not.toBeInTheDocument();
  });

  it('shows and holds the feedback note after submit (does not disappear immediately)', () => {
    const { rerender } = render(<WordFormingArea word="CAT" letterCount={3} feedback={null} compact />);
    rerender(<WordFormingArea word="" letterCount={0} feedback={null} compact />);

    // Server feedback arrives shortly after the word cleared.
    rerender(<WordFormingArea word="" letterCount={0} feedback={accepted('CAT')} compact />);

    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('CAT')).toBeInTheDocument();

    // A short time later the feedback must still be on screen, not vanished.
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('CAT')).toBeInTheDocument();
  });

  it('does NOT linger the word forever — clears to empty after the feedback window', () => {
    const { rerender } = render(<WordFormingArea word="CAT" letterCount={3} feedback={null} compact />);
    rerender(<WordFormingArea word="" letterCount={0} feedback={accepted('CAT')} compact />);
    expect(screen.getByText('✓')).toBeInTheDocument();

    // After the feedback display window the pill returns to the empty placeholder.
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
    expect(screen.queryByText('CAT')).not.toBeInTheDocument();
    expect(screen.getByText('···')).toBeInTheDocument();
  });

  it('bounds the bridge — an abandoned word (no feedback ever) clears, not lingers', () => {
    const { rerender } = render(<WordFormingArea word="CAT" letterCount={3} feedback={null} compact />);
    // Player deselects without submitting — word clears, no feedback will ever come.
    rerender(<WordFormingArea word="" letterCount={0} feedback={null} compact />);
    expect(screen.getByText('CAT')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByText('CAT')).not.toBeInTheDocument();
    expect(screen.getByText('···')).toBeInTheDocument();
  });
});
