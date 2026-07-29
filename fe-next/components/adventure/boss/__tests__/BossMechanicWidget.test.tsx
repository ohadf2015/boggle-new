/**
 * BossMechanicWidget Component Tests
 *
 * Tests for the persistent widget showing current boss mechanic requirement.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MockMotionDiv({ children, ...rest }: any, ref: any) {
      return <div ref={ref} {...rest}>{children}</div>;
    }),
  },
}));

// Mock the theme context
const mockUseBossFightTheme = vi.fn().mockReturnValue({
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
});
vi.mock('@/contexts/AdventureThemeContext', () => ({
  useBossFightTheme: () => mockUseBossFightTheme(),
}));

import BossMechanicWidget from '../BossMechanicWidget';

// ==============================================
// HELPERS
// ==============================================

const defaultProps = {
  mechanicName: 'adventure.bosses.mechanics.letterFreeze',
  progress: 0.5,
  target: 3,
  current: 1,
  bonusMultiplier: 1.5,
  isActive: true,
};

function renderWidget(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(
    <LanguageProvider initialLanguage="en">
      <BossMechanicWidget {...props} />
    </LanguageProvider>
  );
}

// ==============================================
// TESTS
// ==============================================

describe('BossMechanicWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the widget when active', () => {
      renderWidget();
      expect(screen.getByTestId('boss-mechanic-widget')).toBeInTheDocument();
    });

    it('should not render when not active', () => {
      renderWidget({ isActive: false });
      expect(screen.queryByTestId('boss-mechanic-widget')).not.toBeInTheDocument();
    });
  });

  describe('Progress', () => {
    it('should render a progress bar', () => {
      renderWidget();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show progress value', () => {
      renderWidget({ progress: 0.75 });
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('should display current/target count', () => {
      renderWidget({ current: 2, target: 5 });
      expect(screen.getByText('2 / 5')).toBeInTheDocument();
    });
  });

  describe('Bonus Multiplier', () => {
    it('should show bonus multiplier preview', () => {
      renderWidget({ bonusMultiplier: 2.0 });
      expect(screen.getByTestId('bonus-multiplier')).toBeInTheDocument();
      expect(screen.getByText('2x')).toBeInTheDocument();
    });

    it('should not show multiplier when it is 1', () => {
      renderWidget({ bonusMultiplier: 1.0 });
      expect(screen.queryByTestId('bonus-multiplier')).not.toBeInTheDocument();
    });
  });

  describe('Theming', () => {
    it('should use theme dialogueBg class', () => {
      renderWidget();
      const widget = screen.getByTestId('boss-mechanic-widget');
      expect(widget).toHaveClass('bg-neo-navy/95');
    });

    it('should use theme dialogueBorder class', () => {
      renderWidget();
      const widget = screen.getByTestId('boss-mechanic-widget');
      expect(widget).toHaveClass('border-neo-white/20');
    });
  });

  describe('Neo-brutalist Styling', () => {
    it('should have border-3 and rounded-neo', () => {
      renderWidget();
      const widget = screen.getByTestId('boss-mechanic-widget');
      expect(widget).toHaveClass('border-3');
      expect(widget).toHaveClass('rounded-neo');
    });
  });
});
