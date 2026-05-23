/**
 * Drill layout-stability regression tests.
 *
 * Founder report (2026-05-23): "the grid is shifting in the layout every word
 * that gets submitted." Root cause: the found/recent-words list was rendered
 * conditionally (`{wordsFound.length > 0 && ...}`) inside a vertically-centered
 * column AND used `max-h-*`, so it appeared at 0px then GREW with each word —
 * re-centering (and visibly jumping) the grid on every submit.
 *
 * Fix invariant locked here: the found-words container must ALWAYS be rendered
 * (even with zero words) at a CONSTANT height, so the column height — and thus
 * the grid position — never changes as words accrue. The box scrolls internally
 * instead of growing.
 *
 * jsdom has no layout engine, so we assert the structural proxy: the container
 * exists with 0 words and carries a fixed-height class (not max-h / not absent).
 */

import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement> & { onClick?: () => void }) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    h2: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className={className} {...props}>{children}</h2>
    ),
    h3: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className={className} {...props}>{children}</h3>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
    p: ({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className={className} {...props}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

const langValue = {
  t: (key: string) => key,
  dir: 'ltr',
  language: 'en',
};
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => langValue,
  useLanguageSafe: () => langValue,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playErrorSound: vi.fn(),
    playDrillStartSound: vi.fn(),
    playDrillCompleteSound: vi.fn(),
    playSuccessSound: vi.fn(),
  }),
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useShouldReduceMotion: () => false,
}));

vi.mock('@/components/grid/performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false, enableComplexAnimations: true }),
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
      <button data-testid="submit-dog" onClick={() => onWordSubmit?.('dog')}>DOG</button>
      <button data-testid="submit-bat" onClick={() => onWordSubmit?.('bat')}>BAT</button>
    </div>
  ),
}));

vi.mock('@/components/keyboard', () => ({
  KeyboardDesktopBadge: () => null,
  EnterKeyHint: () => null,
  KeyboardQuickTip: () => null,
}));

vi.mock('@/utils/utils', () => ({
  isWordOnBoard: () => true,
}));

import LightningRound from '../LightningRound';
import RareGems from '../RareGems';

const mockGrid = [
  ['C', 'A', 'T', 'S', 'D'],
  ['O', 'G', 'H', 'E', 'L'],
  ['W', 'I', 'N', 'D', 'O'],
  ['B', 'A', 'T', 'S', 'W'],
  ['P', 'L', 'A', 'Y', 'S'],
];

const mockAvailableWords = [
  { word: 'CAT', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
  { word: 'DOG', path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 0, col: 4 }] },
  { word: 'BAT', path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }] },
];

const baseProps = {
  grid: mockGrid,
  availableWords: mockAvailableWords,
  level: 1,
  language: 'en' as const,
};

beforeEach(() => {
  vi.useFakeTimers();
});

function clickStart() {
  act(() => {
    fireEvent.click(screen.getByText('brain.drills.start'));
  });
}

describe('LightningRound — found-words box does not grow/shift the grid', () => {
  it('renders the found-words container at a fixed height even with zero words', () => {
    render(
      <LightningRound {...baseProps} onComplete={vi.fn()} onExit={vi.fn()} onPlayAgain={vi.fn()} />,
    );
    clickStart();

    // Container must exist BEFORE any word is found (no conditional appear/grow).
    const box = screen.getByTestId('drill-found-words');
    expect(box).toBeInTheDocument();
    // Fixed height (h-28), NOT max-h-* which lets it grow from 0.
    expect(box.className).toMatch(/\bh-28\b/);
    expect(box.className).not.toMatch(/max-h-/);
  });

  it('keeps the same fixed-height container after words are submitted', () => {
    render(
      <LightningRound {...baseProps} onComplete={vi.fn()} onExit={vi.fn()} onPlayAgain={vi.fn()} />,
    );
    clickStart();
    act(() => {
      fireEvent.click(screen.getByTestId('submit-cat'));
      fireEvent.click(screen.getByTestId('submit-dog'));
    });

    const box = screen.getByTestId('drill-found-words');
    expect(box.className).toMatch(/\bh-28\b/);
    // The submitted word appears as a chip INSIDE the fixed-height box.
    expect(within(box).getByText('CAT')).toBeInTheDocument();
  });
});

describe('RareGems — found-words box does not grow/shift the grid', () => {
  it('renders the found-words container at a fixed height even with zero words', () => {
    render(
      <RareGems {...baseProps} onComplete={vi.fn()} onExit={vi.fn()} onPlayAgain={vi.fn()} />,
    );
    clickStart();

    const box = screen.getByTestId('drill-found-words');
    expect(box).toBeInTheDocument();
    expect(box.className).toMatch(/\bh-32\b/);
    expect(box.className).not.toMatch(/max-h-/);
  });
});
