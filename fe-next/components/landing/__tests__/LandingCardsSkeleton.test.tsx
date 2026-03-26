import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingCardsSkeleton } from '../LandingCardsSkeleton';

// Mock hooks
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    dir: 'ltr',
  }),
}));

describe('LandingCardsSkeleton', () => {
  describe('structure', () => {
    it('should render the main skeleton container', () => {
      render(<LandingCardsSkeleton />);

      expect(screen.getByTestId('landing-cards-skeleton')).toBeInTheDocument();
    });

    it('should render 4 mode card skeletons', () => {
      render(<LandingCardsSkeleton />);

      const skeletons = screen.getAllByTestId('mode-card-skeleton');
      expect(skeletons).toHaveLength(4);
    });

    it('should include daily challenge banner skeleton', () => {
      render(<LandingCardsSkeleton />);

      const container = screen.getByTestId('landing-cards-skeleton');
      // Banner has solid yellow background (performance optimization)
      const banner = container.querySelector('.bg-neo-yellow');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('card variants', () => {
    it('should render correct variant colors for each card', () => {
      render(<LandingCardsSkeleton />);

      const skeletons = screen.getAllByTestId('mode-card-skeleton');

      // Primary cards (solid colors for performance)
      expect(skeletons[0]).toHaveClass('bg-neo-pink'); // Multiplayer
      expect(skeletons[1]).toHaveClass('bg-neo-cyan'); // Single Player

      // Secondary cards
      expect(skeletons[2]).toHaveClass('bg-neo-lime'); // Adventure
      expect(skeletons[3]).toHaveClass('bg-neo-purple'); // Brain Training
    });

    it('should render secondary cards with smaller styling', () => {
      render(<LandingCardsSkeleton />);

      const skeletons = screen.getAllByTestId('mode-card-skeleton');

      // Primary cards have border-3
      expect(skeletons[0]).toHaveClass('border-3');
      expect(skeletons[1]).toHaveClass('border-3');

      // Secondary cards have border-2
      expect(skeletons[2]).toHaveClass('border-2');
      expect(skeletons[3]).toHaveClass('border-2');
    });
  });

  describe('compact mode', () => {
    it('should apply compact styling when compact prop is true', () => {
      render(<LandingCardsSkeleton compact />);

      const container = screen.getByTestId('landing-cards-skeleton');
      expect(container).toHaveClass('space-y-4');
    });

    it('should not apply compact styling when compact is false', () => {
      render(<LandingCardsSkeleton compact={false} />);

      const container = screen.getByTestId('landing-cards-skeleton');
      expect(container).toHaveClass('max-w-4xl');
      expect(container).not.toHaveClass('space-y-4');
    });
  });

  describe('accessibility', () => {
    it('should have aria-hidden for decorative skeleton', () => {
      render(<LandingCardsSkeleton />);

      const container = screen.getByTestId('landing-cards-skeleton');
      expect(container).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('animation', () => {
    it('should NOT have pulse animation (removed for performance)', () => {
      render(<LandingCardsSkeleton />);

      const container = screen.getByTestId('landing-cards-skeleton');
      const banner = container.querySelector('.bg-neo-yellow');
      // Pulse animation removed to prevent constant repaints
      expect(banner).not.toHaveClass('animate-pulse');
    });
  });
});
