import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/useDrillMusic', () => ({ useDrillMusic: () => {} }));
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
  // Any sound fn (and setGameActive) resolves to a no-op spy; these tests don't
  // assert audio, they just need drill sound/game-active calls to not throw.
  useSoundEffects: () => new Proxy({}, { get: () => vi.fn() }),
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useSuppressTimerUrgency: () => false,
  useShouldReduceMotion: () => false,
  // WordFormingArea (rendered once a drill starts) reads cosy mode — mock parity.
  useCosyMode: () => false,
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


function clickStart() {
  act(() => {
    fireEvent.click(screen.getByText('brain.briefing.letsTrain'));
  });
}

function renderRound() {
  return render(<LightningRound {...baseProps} onComplete={vi.fn()} onExit={vi.fn()} onPlayAgain={vi.fn()} />);
}

describe('LightningRound — desktop shell', () => {
  it('given the briefing, then no shell frames it yet', () => {
    renderRound();
    expect(screen.queryByTestId('game-shell')).toBeNull();
  });

  it('given play started, then the board sits in the shared shell with clock, round stats and keys beside it', () => {
    renderRound();
    clickStart();
    expect(screen.getByTestId('game-shell').getAttribute('data-game-shell')).toBe('lightning');
    expect(within(screen.getByTestId('game-shell-stage')).getByTestId('grid-component')).toBeInTheDocument();
    const left = within(screen.getByTestId('game-shell-left'));
    expect(left.getByTestId('shell-clock-value').textContent).toBe('1:00');
    expect(left.getByTestId('shell-stats-progress')).toBeInTheDocument();
    expect(left.getByTestId('shell-keys')).toBeInTheDocument();
  });

  it('given a found word, then it slams into the end rail', () => {
    renderRound();
    clickStart();
    act(() => {
      fireEvent.click(screen.getByTestId('submit-cat'));
    });
    const rows = within(screen.getByTestId('game-shell-right')).getAllByTestId(/^shell-word-row-/);
    expect(rows[0].getAttribute('data-word')?.toLowerCase()).toBe('cat');
  });
});
