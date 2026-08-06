/**
 * PatternSwitcher — last-life tension
 *
 * Losing a life was a flat, silent decrement — no escalating tension before
 * the final miss ends the drill. This adds a pulsing "last life" cue.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useDrillMusic', () => ({ useDrillMusic: () => {} }));
vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, dir: 'ltr', language: 'en' }),
  useLanguageSafe: () => ({ t: (key: string) => key, dir: 'ltr', language: 'en' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
}));

vi.mock('@/hooks/useDrillKeyboardSupport', () => ({
  useDrillKeyboardSupport: () => ({
    isTypingMode: false,
    typedWord: '',
    highlightedCells: [],
    isDesktop: false,
    showEnterHint: false,
    showQuickTip: false,
    dismissQuickTip: vi.fn(),
    isValidOnGrid: false,
  }),
}));

vi.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: ({ onWordSubmit }: { onWordSubmit?: (word: string) => void }) => (
    <div data-testid="grid-component">
      <button data-testid="submit-cat" onClick={() => onWordSubmit?.('cat')}>CAT</button>
    </div>
  ),
}));

vi.mock('@/components/keyboard', () => ({
  KeyboardDesktopBadge: () => null,
  EnterKeyHint: () => null,
  KeyboardQuickTip: () => null,
}));

import PatternSwitcher from '../PatternSwitcher';

const mockGrid = [
  ['C', 'A', 'T', 'S', 'D'],
  ['O', 'G', 'H', 'E', 'L'],
  ['W', 'I', 'N', 'D', 'O'],
  ['B', 'A', 'T', 'S', 'W'],
  ['P', 'L', 'A', 'Y', 'S'],
];

const mockAvailableWords = [
  { word: 'CAT', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
  { word: 'DOGS', path: [{ row: 0, col: 4 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
];

const defaultProps = {
  grid: mockGrid,
  availableWords: mockAvailableWords,
  language: 'en' as const,
  onComplete: vi.fn(),
};

describe('PatternSwitcher — last life tension', () => {
  it('does not pulse the life dot while lives remain above 1', () => {
    render(<PatternSwitcher {...defaultProps} level={1} />);
    fireEvent.click(screen.getByText('brain.briefing.letsTrain'));

    const dots = screen.getByTestId('pattern-switcher-lives').children;
    expect(dots[0]).not.toHaveClass('animate-pulse');
  });

  it('pulses the last remaining life dot to signal one-mistake-from-over', () => {
    // Level 5 config is single-life by design — the whole level is a last-life state.
    render(<PatternSwitcher {...defaultProps} level={5} />);
    fireEvent.click(screen.getByText('brain.briefing.letsTrain'));

    const dots = screen.getByTestId('pattern-switcher-lives').children;
    // motion-safe: so the tension pulse respects prefers-reduced-motion.
    expect(dots[0]).toHaveClass('motion-safe:animate-pulse');
    expect(dots[0]).toHaveClass('ring-neo-red');
  });
});
