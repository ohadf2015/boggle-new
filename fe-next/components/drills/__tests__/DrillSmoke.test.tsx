/**
 * Drill smoke tests — locks the four previously-untested drill components.
 *
 * Audit item D1 (2026-04-26): only ComboMaster had direct unit tests; the
 * other 4 drills (LightningRound, MemoryHunt, PatternSwitcher, RareGems)
 * had zero coverage despite handling auth'd score submissions to the
 * brain-score pipeline. This file establishes a regression baseline before
 * the file-size split refactor (P2) so behavior changes get caught.
 *
 * Scope is intentionally narrow — render + basic interactions, not deep
 * gameplay logic. Each drill's deeper rules live in their respective
 * config tables; rule changes get tested separately.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
  useSuppressTimerUrgency: () => false,
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
import MemoryHunt from '../MemoryHunt';
import PatternSwitcher from '../PatternSwitcher';
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
  { word: 'CATS', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }] },
  { word: 'BATS', path: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }] },
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

/** Click the drill's intro "Start" button so the gameplay phase mounts. */
function clickStart() {
  const startBtn = screen.getByText('brain.briefing.letsTrain');
  act(() => {
    fireEvent.click(startBtn);
  });
}

describe('LightningRound (processing speed drill)', () => {
  it('renders the intro screen with start button', () => {
    render(
      <LightningRound
        {...baseProps}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );
    expect(screen.getByText('brain.drills.lightning-round.name')).toBeInTheDocument();
    expect(screen.getByText('brain.briefing.letsTrain')).toBeInTheDocument();
  });

  it('renders the grid after start is clicked and accepts submissions', () => {
    render(
      <LightningRound
        {...baseProps}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );
    clickStart();
    expect(screen.getByTestId('grid-component')).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByTestId('submit-cat'));
    });
  });

  it('calls onComplete after the drill timer expires', () => {
    const onComplete = vi.fn();
    render(
      <LightningRound
        {...baseProps}
        onComplete={onComplete}
        onExit={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );
    clickStart();
    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(onComplete).toHaveBeenCalled();
    const result = onComplete.mock.calls[0][0];
    expect(result).toMatchObject({
      score: expect.any(Number),
      wordsFound: expect.any(Number),
      timeSpent: expect.any(Number),
      level: 1,
    });
  });
});

describe('MemoryHunt (working memory drill)', () => {
  // MemoryHunt now uses the warm DrillBriefing intro (themed CTA) instead of
  // the generic "Start" button the other drills still use.
  const clickBriefingStart = () => {
    const startBtn = screen.getByText('brain.briefing.letsTrain');
    act(() => {
      fireEvent.click(startBtn);
    });
  };

  it('renders the briefing intro with mission + themed start CTA', () => {
    render(
      <MemoryHunt
        {...baseProps}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );
    expect(screen.getByText('brain.drills.memory-hunt.name')).toBeInTheDocument();
    expect(screen.getByText('brain.drills.memory-hunt.mission')).toBeInTheDocument();
    expect(screen.getByText('brain.briefing.letsTrain')).toBeInTheDocument();
  });

  it('mounts gameplay phase after start without throwing', () => {
    render(
      <MemoryHunt
        {...baseProps}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );
    clickBriefingStart();
    // MemoryHunt has memorize → recall flow; we only assert no crash on phase advance.
    expect(document.body.textContent).toBeTruthy();
  });
});

describe('PatternSwitcher (cognitive flexibility drill)', () => {
  it('renders the intro screen', () => {
    render(
      <PatternSwitcher
        {...baseProps}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );
    expect(screen.getByText('brain.drills.pattern-switcher.name')).toBeInTheDocument();
    expect(screen.getByText('brain.briefing.letsTrain')).toBeInTheDocument();
  });

  it('renders the grid after start and reacts to word submission', () => {
    render(
      <PatternSwitcher
        {...baseProps}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );
    clickStart();
    expect(screen.getByTestId('grid-component')).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByTestId('submit-cat'));
    });
  });
});

describe('RareGems (vocabulary depth drill)', () => {
  it('renders the intro screen', () => {
    render(
      <RareGems
        {...baseProps}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );
    expect(screen.getByText('brain.drills.rare-gems.name')).toBeInTheDocument();
    expect(screen.getByText('brain.briefing.letsTrain')).toBeInTheDocument();
  });

  it('renders the grid after start', () => {
    render(
      <RareGems
        {...baseProps}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        onPlayAgain={vi.fn()}
      />,
    );
    clickStart();
    expect(screen.getByTestId('grid-component')).toBeInTheDocument();
  });
});
