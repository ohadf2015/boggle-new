/**
 * StickyReadyBar Desktop Mode Selector Tests
 *
 * Verifies that on the desktop results page the host's game-mode switcher
 * makes the *active* mode clearly distinguishable from the others, and that
 * the prominent (desktop) variant adds an explanatory heading.
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr' as const,
  }),
}));

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

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ userId }: { userId?: string }) => <div data-testid={`avatar-${userId}`} />,
}));

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

const baseProps = {
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

describe('StickyReadyBar desktop mode selector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    try { sessionStorage.removeItem('mp-auto-advance-cancelled'); } catch {}
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks the selected mode with aria-pressed=true and others false', () => {
    render(<StickyReadyBar {...baseProps} selectedGameMode="wheel-rush" />);

    const active = screen.getByRole('button', { name: /label-wheel-rush/i });
    expect(active).toHaveAttribute('aria-pressed', 'true');

    const inactive = screen.getByRole('button', { name: /label-classic/i });
    expect(inactive).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders the "next round mode" heading in the prominent desktop variant', () => {
    render(<StickyReadyBar {...baseProps} desktopProminent />);
    expect(screen.getByText('results.nextRoundMode')).toBeInTheDocument();
  });

  it('does not render the heading in the default (mobile) variant', () => {
    render(<StickyReadyBar {...baseProps} />);
    expect(screen.queryByText('results.nextRoundMode')).not.toBeInTheDocument();
  });

  it('applies a stronger active treatment (ring) to the selected pill in the prominent variant', () => {
    render(<StickyReadyBar {...baseProps} desktopProminent selectedGameMode="blast" />);
    const active = screen.getByRole('button', { name: /label-blast/i });
    expect(active.className).toMatch(/ring-/);
  });
});
