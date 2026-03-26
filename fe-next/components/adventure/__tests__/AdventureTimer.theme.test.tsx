/**
 * AdventureTimer Theme Integration Tests
 *
 * Verifies that AdventureTimer uses timer urgency theme values
 * from useTimerTheme() instead of hardcoded urgency styles.
 */

import { render, screen } from '@testing-library/react';
import AdventureTimer from '../AdventureTimer';

const mockTimerTheme = {
  normal: {
    bg: 'bg-emerald-900/80',
    text: 'text-emerald-100',
    shadow: '',
  },
  warning: {
    bg: 'bg-amber-900/40',
    text: 'text-amber-300',
    shadow: 'shadow-[0_0_12px_rgba(217,119,6,0.3)]',
  },
  danger: {
    bg: 'bg-rose-900/40',
    text: 'text-rose-400',
    shadow: 'shadow-[0_0_16px_rgba(244,63,94,0.4)]',
  },
  critical: {
    bg: 'bg-rose-800/50',
    text: 'text-rose-300',
    shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.6)]',
  },
};

vi.mock('@/contexts/AdventureThemeContext', () => ({
  useTimerTheme: () => mockTimerTheme,
  useHUDTheme: () => ({
    headerBg: 'bg-neo-navy/90',
    headerBorder: 'border-neo-black/40',
    sidebarBg: 'bg-neo-black/40',
    scoreAccent: 'text-neo-cyan',
    levelBadgeColor: 'bg-neo-black/40',
    levelBadgeText: 'text-neo-cyan',
    objectiveAccent: 'text-neo-lime',
    hintActiveColor: 'bg-neo-lime',
    hintActiveText: 'text-neo-black',
  }),
  useBossFightTheme: () => ({
    dialogueBg: 'bg-neo-navy/95',
    dialogueBorder: 'border-neo-white/20',
    bossNameColor: 'text-neo-red',
    hpSegmentColors: ['bg-neo-red', 'bg-neo-orange', 'bg-neo-lime'],
    telegraphColor: 'bg-neo-red/20',
    telegraphProgressColor: 'bg-neo-red',
    playerHealthNormal: 'bg-neo-lime',
    playerHealthLow: 'bg-neo-red',
    phaseColors: {
      phase1: { bg: 'bg-neo-lime/20', text: 'text-neo-lime' },
      phase2: { bg: 'bg-neo-orange/20', text: 'text-neo-orange' },
      enraged: { bg: 'bg-neo-red/20', text: 'text-neo-red' },
    },
    avatarGlow: 'rgba(239, 68, 68, 0.4)',
    victoryGlow: 'rgba(163, 230, 53, 0.6)',
    arenaEffect: 'none',
  }),
}));

describe('AdventureTimer — Timer Theme Integration', () => {
  it('should apply theme normal bg when time is adequate', () => {
    const { container } = render(<AdventureTimer timeRemaining={60} />);
    const timer = container.firstChild as HTMLElement;
    expect(timer.className).toContain('bg-emerald-900/80');
    expect(timer.className).not.toContain('bg-neo-navy');
  });

  it('should apply theme normal text when time is adequate', () => {
    const { container } = render(<AdventureTimer timeRemaining={60} />);
    const timer = container.firstChild as HTMLElement;
    expect(timer.className).toContain('text-emerald-100');
  });

  it('should apply theme warning styles when <30 seconds', () => {
    const { container } = render(<AdventureTimer timeRemaining={25} />);
    const timer = container.firstChild as HTMLElement;
    expect(timer.className).toContain('bg-amber-900/40');
    expect(timer.className).toContain('text-amber-300');
  });

  it('should apply theme danger styles when <10 seconds', () => {
    const { container } = render(<AdventureTimer timeRemaining={8} />);
    const timer = container.firstChild as HTMLElement;
    expect(timer.className).toContain('bg-rose-900/40');
    expect(timer.className).toContain('text-rose-400');
  });

  it('should apply theme critical styles when <=5 seconds', () => {
    const { container } = render(<AdventureTimer timeRemaining={3} />);
    const timer = container.firstChild as HTMLElement;
    expect(timer.className).toContain('bg-rose-800/50');
    expect(timer.className).toContain('text-rose-300');
  });

  it('should apply shadow from theme as className', () => {
    const { container } = render(<AdventureTimer timeRemaining={25} />);
    const timer = container.firstChild as HTMLElement;
    expect(timer.className).toContain('shadow-[0_0_12px_rgba(217,119,6,0.3)]');
  });
});
