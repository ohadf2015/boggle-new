/**
 * Tests for WordWheelWordsModal — sofit letters + top-5 cap behaviour.
 *
 * Why this exists separately from the modal's basic render tests:
 *   - Hebrew sofit conversion is a display-boundary rule (storage stays regular).
 *     A regression here surfaces as a "user-visible word looks wrong" — silent
 *     and hard to spot in QA. Lock it down with explicit assertions.
 *   - The top-5 cap is the new "you missed" intel UX: too few words = useless,
 *     too many = overwhelming. The cap-and-expand contract is load-bearing.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange?: (o: boolean) => void; children: React.ReactNode }) =>
    open ? (
      <div data-testid="dialog">
        {children}
        <button type="button" aria-label="Close" onClick={() => onOpenChange?.(false)}>×</button>
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@radix-ui/react-visually-hidden', () => ({
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { WordWheelWordsModal } from '../WordWheelWordsModal';

const t = (k: string, fb?: string) => fb || k;

function mockFetchResponse(payload: object) {
  // jsdom doesn't ship fetch — install a stub the modal will await.
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => payload,
  }) as unknown as typeof fetch;
}

const longerFirst = (arr: string[]) => [...arr].sort((a, b) => b.length - a.length || a.localeCompare(b));

describe('WordWheelWordsModal — sofit letters', () => {
  it('renders Hebrew words ending in regular forms with final (sofit) letters', async () => {
    // Backend stores words with REGULAR letter at end (ם → מ etc., see
    // wordNormalization.HEBREW_BASE_LETTERS). Display layer is responsible for
    // converting back to sofit. These three cover all five sofit pairs at the
    // end + one already-final + one non-sofit.
    mockFetchResponse({
      // ends in regular מ — should display as ם
      // ends in regular נ — should display as ן
      // ends in ק (no sofit form) — should stay
      wordsFound: ['חושבימ', 'בוחנ', 'משחק'],
      wordCount: 3,
      score: 100,
      longestWord: 'חושבימ',
      displayName: 'RON',
    });

    render(
      <WordWheelWordsModal
        isOpen
        onClose={vi.fn()}
        puzzleDate="2026-05-18"
        language="he"
        playerId="ron-id"
        playerName="RON"
        t={t}
      />,
    );

    // Regular mem → sofit mem: 'חושבימ' → 'חושבים'
    expect(await screen.findByText('חושבים')).toBeInTheDocument();
    // Regular nun → sofit nun: 'בוחנ' → 'בוחן'
    expect(screen.getByText('בוחן')).toBeInTheDocument();
    // 'משחק' has no sofit-eligible final letter; stays as-is
    expect(screen.getByText('משחק')).toBeInTheDocument();
  });
});

describe('WordWheelWordsModal — top-5 cap', () => {
  const tenHebrewWords = longerFirst([
    'חושבים', 'בוחנים', 'נובחים', 'חובשים', 'בוחשים',
    'מחשוב', 'חושב', 'בונים', 'נוחים', 'חוש',
  ]);

  it('shows only the top 5 longest missed words by default in diff mode', async () => {
    mockFetchResponse({
      wordsFound: tenHebrewWords,
      wordCount: tenHebrewWords.length,
      score: 600,
      longestWord: tenHebrewWords[0],
      displayName: 'RON',
    });

    render(
      <WordWheelWordsModal
        isOpen
        onClose={vi.fn()}
        puzzleDate="2026-05-18"
        language="he"
        playerId="ron-id"
        playerName="RON"
        myWordsFound={[]}
        t={t}
      />,
    );

    // wait for the first chip
    await screen.findAllByTestId('missed-word-chip');
    const chips = screen.getAllByTestId('missed-word-chip');
    expect(chips).toHaveLength(5);
  });

  it('expands to all missed words when "show all" pressed, and collapses back', async () => {
    mockFetchResponse({
      wordsFound: tenHebrewWords,
      wordCount: tenHebrewWords.length,
      score: 600,
      longestWord: tenHebrewWords[0],
      displayName: 'RON',
    });

    render(
      <WordWheelWordsModal
        isOpen
        onClose={vi.fn()}
        puzzleDate="2026-05-18"
        language="he"
        playerId="ron-id"
        playerName="RON"
        myWordsFound={[]}
        t={t}
      />,
    );

    await screen.findAllByTestId('missed-word-chip');
    const toggle = screen.getByTestId('missed-words-toggle');
    await userEvent.click(toggle);
    expect(screen.getAllByTestId('missed-word-chip')).toHaveLength(tenHebrewWords.length);
    await userEvent.click(toggle);
    expect(screen.getAllByTestId('missed-word-chip')).toHaveLength(5);
  });

  it('no toggle button shown when missed words count ≤ 5', async () => {
    mockFetchResponse({
      wordsFound: ['חושבים', 'בוחנים', 'משחק'],
      wordCount: 3,
      score: 100,
      longestWord: 'חושבים',
      displayName: 'RON',
    });

    render(
      <WordWheelWordsModal
        isOpen
        onClose={vi.fn()}
        puzzleDate="2026-05-18"
        language="he"
        playerId="ron-id"
        playerName="RON"
        myWordsFound={[]}
        t={t}
      />,
    );

    await screen.findAllByTestId('missed-word-chip');
    expect(screen.queryByTestId('missed-words-toggle')).toBeNull();
  });
});
