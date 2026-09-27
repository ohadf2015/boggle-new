import { render, screen } from '@testing-library/react';
import WordFormingArea, { type WordFeedback } from '../WordFormingArea';

/**
 * Cozy / Calm Mode swaps the energetic word-accept effect (8 flying lime
 * sparkles + an expanding burst ring) for ONE soft warm settle on the pill —
 * satisfying without the party burst, right where the eye already is.
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

let cosyOn = false;
vi.mock('@/contexts/AccessibilityContext', () => ({
  useCosyMode: () => cosyOn,
}));

const accepted = (word: string): WordFeedback => ({
  id: `accepted-${Date.now()}`,
  type: 'accepted',
  word,
  score: 12,
  timestamp: Date.now(),
});

const rejected = (word: string): WordFeedback => ({
  id: `rejected-${Date.now()}`,
  type: 'rejected',
  word,
  message: 'Not a word',
  timestamp: Date.now(),
});

const sparkles = (c: HTMLElement) => c.querySelectorAll('.bg-neo-lime.rounded-full');

describe('WordFormingArea — cozy accept cue', () => {
  beforeEach(() => { cosyOn = false; });

  it('loud mode: accepted word fires the sparkle burst, no calm glow', () => {
    cosyOn = false;
    const { container } = render(
      <WordFormingArea word="" letterCount={0} feedback={accepted('CAT')} compact />,
    );
    expect(sparkles(container).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('cosy-accept-glow')).not.toBeInTheDocument();
  });

  it('cozy mode: accepted word shows ONE soft settle, NOT the sparkle burst', () => {
    cosyOn = true;
    const { container } = render(
      <WordFormingArea word="" letterCount={0} feedback={accepted('CAT')} compact />,
    );
    expect(sparkles(container).length).toBe(0);
    expect(screen.getByTestId('cosy-accept-glow')).toBeInTheDocument();
    // The word + checkmark still read as earned.
    expect(screen.getByText('CAT')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('cozy mode: a rejected word gets no calm accept glow (accept-only)', () => {
    cosyOn = true;
    render(<WordFormingArea word="" letterCount={0} feedback={rejected('XQZ')} compact />);
    expect(screen.queryByTestId('cosy-accept-glow')).not.toBeInTheDocument();
  });
});
