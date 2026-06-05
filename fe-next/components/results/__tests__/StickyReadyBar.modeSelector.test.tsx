/**
 * StickyReadyBar Mode Selector Tests
 *
 * Verifies that ALL selectable game modes (including wheel-rush) render
 * as buttons when the host has the mode selector visible.
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr' as const,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    button: React.forwardRef(function MotionButton({ children, style, ...props }: any, ref: any) {
      return <button ref={ref} style={style} {...props}>{children}</button>;
    }),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Avatar
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ userId }: { userId?: string }) => <div data-testid={`avatar-${userId}`} />,
}));

// Mock GameModeSelector exports — include ALL modes
vi.mock('@/components/GameModeSelector', () => ({
  MODE_ICONS: {
    random: <span>🔀</span>,
    classic: <span>📄</span>,
    blast: <span>💣</span>,
    'word-hunt': <span>🎯</span>,
    'wheel-rush': <span>🎡</span>,
  },
  MODE_ACTIVE_COLORS: {
    random: 'text-neo-purple',
    classic: 'text-neo-cyan',
    blast: 'text-neo-orange',
    'word-hunt': 'text-neo-pink',
    'wheel-rush': 'text-neo-lime',
  },
  getModeLabel: (mode: string) => `label-${mode}`,
  getModeDescription: (mode: string) => `desc-${mode}`,
}));

import StickyReadyBar from '../StickyReadyBar';

describe('StickyReadyBar mode selector', () => {
  const hostWithModeSelectorProps = {
    isHost: true,
    isCurrentPlayerReady: false,
    currentPlayerRank: 1,
    readyCount: 0,
    totalPlayers: 2,
    onStartGame: vi.fn(),
    onMarkReady: vi.fn(),
    selectedGameMode: 'classic' as const,
    onSelectGameMode: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    try { sessionStorage.removeItem('mp-auto-advance-cancelled'); } catch {}
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a button for wheel-rush mode', () => {
    render(<StickyReadyBar {...hostWithModeSelectorProps} />);
    // The mode selector renders each mode's label via getModeLabel
    // wheel-rush should produce a button with aria-label containing its label + description
    expect(
      screen.getByRole('button', { name: /label-wheel-rush/i })
    ).toBeInTheDocument();
  });

  it('renders buttons for all selectable modes (classic, word-hunt, wheel-rush, blast, random)', () => {
    render(<StickyReadyBar {...hostWithModeSelectorProps} />);
    for (const mode of ['classic', 'word-hunt', 'wheel-rush', 'blast', 'random']) {
      expect(
        screen.getByRole('button', { name: new RegExp(`label-${mode}`, 'i') })
      ).toBeInTheDocument();
    }
  });
});
