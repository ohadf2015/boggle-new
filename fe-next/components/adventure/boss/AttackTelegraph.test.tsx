/**
 * AttackTelegraph Component Tests
 *
 * Tests for the simplified edge-glow attack warning component.
 * The countdown ring has been moved to BossOverlay HUD strip.
 */

import { render, screen } from '@testing-library/react';
import { AttackTelegraph } from './AttackTelegraph';
import { LanguageProvider } from '../../../contexts/LanguageContext';

// Mock hooks
const { mockUsePrefersReducedMotion } = vi.hoisted(() => ({
  mockUsePrefersReducedMotion: vi.fn(() => false),
}));
vi.mock('../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: mockUsePrefersReducedMotion,
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe('AttackTelegraph', () => {
  const defaultProps = {
    isActive: true,
    progress: 0.5,
    targetTiles: [0, 1, 2],
    abilityId: 'scramble',
    timeRemaining: 1000,
  };

  describe('Visibility', () => {
    it('should render when active', () => {
      renderWithProviders(<AttackTelegraph {...defaultProps} />);
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should not render when inactive', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} isActive={false} />
      );
      expect(screen.queryByTestId('attack-telegraph')).not.toBeInTheDocument();
    });
  });

  describe('Edge Glow', () => {
    it('should render edge glow overlay when active', () => {
      renderWithProviders(<AttackTelegraph {...defaultProps} />);
      const telegraph = screen.getByTestId('attack-telegraph');
      expect(telegraph).toBeInTheDocument();
      // Edge glow is a child div with boxShadow style
      const glowDiv = telegraph.querySelector('[aria-hidden="true"]');
      expect(glowDiv).toBeInTheDocument();
    });

    it('should intensify edge glow as progress increases', () => {
      const { rerender } = renderWithProviders(
        <AttackTelegraph {...defaultProps} progress={0.1} />
      );
      const telegraph1 = screen.getByTestId('attack-telegraph');
      const glow1 = telegraph1.querySelector('[aria-hidden="true"]');
      const shadow1 = (glow1 as HTMLElement)?.style.boxShadow || '';

      rerender(
        <LanguageProvider>
          <AttackTelegraph {...defaultProps} progress={0.9} />
        </LanguageProvider>
      );
      const telegraph2 = screen.getByTestId('attack-telegraph');
      const glow2 = telegraph2.querySelector('[aria-hidden="true"]');
      const shadow2 = (glow2 as HTMLElement)?.style.boxShadow || '';

      // Higher progress = larger spread value in box-shadow
      expect(shadow1).not.toBe(shadow2);
    });
  });

  describe('Reduced Motion', () => {
    it('should show static fallback when reduced motion preferred', () => {
      mockUsePrefersReducedMotion.mockReturnValue(true);

      renderWithProviders(<AttackTelegraph {...defaultProps} />);
      const telegraph = screen.getByTestId('attack-telegraph');
      // Should have a static glow div
      const fallback = telegraph.querySelector('[aria-hidden="true"]');
      expect(fallback).toBeInTheDocument();

      mockUsePrefersReducedMotion.mockReturnValue(false);
    });
  });

  describe('Target Tiles', () => {
    it('should receive target tiles array', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} targetTiles={[5, 6, 7, 8, 9]} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should work with empty target tiles', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} targetTiles={[]} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });
  });

  describe('Ability ID', () => {
    it('should accept null ability ID', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} abilityId={null} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should accept different ability IDs', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} abilityId="tile-swap" />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });
  });

  describe('Progress States', () => {
    it('should render at 0% progress', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} progress={0} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should render at 100% progress', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} progress={1} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should render at mid progress', () => {
      renderWithProviders(
        <AttackTelegraph {...defaultProps} progress={0.75} />
      );
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have alert role', () => {
      renderWithProviders(<AttackTelegraph {...defaultProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-label for screen readers', () => {
      renderWithProviders(<AttackTelegraph {...defaultProps} />);
      const telegraph = screen.getByTestId('attack-telegraph');
      expect(telegraph).toHaveAttribute('aria-label');
    });
  });
});
