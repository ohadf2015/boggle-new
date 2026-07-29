import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModeCardSkeleton } from '../ModeCardSkeleton';

// Mock hooks used by ModeCardSkeleton
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    dir: 'ltr',
  }),
}));

describe('ModeCardSkeleton', () => {
  describe('layout matching', () => {
    it('should render with proper card structure matching ModeCard', () => {
      render(<ModeCardSkeleton variant="cyan" />);

      // Should have the card container with proper neo-brutalist styling
      const skeleton = screen.getByTestId('mode-card-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('rounded-neo-lg');
      expect(skeleton).toHaveClass('border-neo-black');
    });

    it('should render icon placeholder matching ModeCard icon size', () => {
      render(<ModeCardSkeleton variant="pink" />);

      // Should have icon placeholder
      const iconPlaceholder = screen.getByTestId('skeleton-icon');
      expect(iconPlaceholder).toBeInTheDocument();
    });

    it('should render title placeholder', () => {
      render(<ModeCardSkeleton variant="purple" />);

      const titlePlaceholder = screen.getByTestId('skeleton-title');
      expect(titlePlaceholder).toBeInTheDocument();
    });

    it('should render description placeholder for primary cards', () => {
      render(<ModeCardSkeleton variant="cyan" secondary={false} />);

      const descPlaceholder = screen.getByTestId('skeleton-description');
      expect(descPlaceholder).toBeInTheDocument();
    });

    it('should NOT render description placeholder for secondary cards', () => {
      render(<ModeCardSkeleton variant="lime" secondary={true} />);

      expect(screen.queryByTestId('skeleton-description')).not.toBeInTheDocument();
    });

    it('should render arrow placeholder', () => {
      render(<ModeCardSkeleton variant="orange" />);

      const arrowPlaceholder = screen.getByTestId('skeleton-arrow');
      expect(arrowPlaceholder).toBeInTheDocument();
    });
  });

  describe('variant styles', () => {
    it('should apply cyan variant solid background', () => {
      render(<ModeCardSkeleton variant="cyan" />);

      const skeleton = screen.getByTestId('mode-card-skeleton');
      expect(skeleton).toHaveClass('bg-neo-cyan');
    });

    it('should apply pink variant solid background', () => {
      render(<ModeCardSkeleton variant="pink" />);

      const skeleton = screen.getByTestId('mode-card-skeleton');
      expect(skeleton).toHaveClass('bg-neo-pink');
    });

    it('should apply purple variant solid background', () => {
      render(<ModeCardSkeleton variant="purple" />);

      const skeleton = screen.getByTestId('mode-card-skeleton');
      expect(skeleton).toHaveClass('bg-neo-purple');
    });

    it('should apply lime variant solid background', () => {
      render(<ModeCardSkeleton variant="lime" />);

      const skeleton = screen.getByTestId('mode-card-skeleton');
      expect(skeleton).toHaveClass('bg-neo-lime');
    });

    it('should apply orange variant solid background', () => {
      render(<ModeCardSkeleton variant="orange" />);

      const skeleton = screen.getByTestId('mode-card-skeleton');
      expect(skeleton).toHaveClass('bg-neo-orange');
    });
  });

  describe('secondary vs primary sizing', () => {
    it('should use smaller border for secondary cards', () => {
      render(<ModeCardSkeleton variant="cyan" secondary={true} />);

      const skeleton = screen.getByTestId('mode-card-skeleton');
      expect(skeleton).toHaveClass('border-2');
    });

    it('should use larger border for primary cards', () => {
      render(<ModeCardSkeleton variant="cyan" secondary={false} />);

      const skeleton = screen.getByTestId('mode-card-skeleton');
      expect(skeleton).toHaveClass('border-3');
    });
  });

  describe('animation', () => {
    it('should NOT have pulse animation (removed for performance)', () => {
      render(<ModeCardSkeleton variant="cyan" />);

      const skeleton = screen.getByTestId('mode-card-skeleton');
      // Pulse animation removed to prevent constant repaints
      expect(skeleton).not.toHaveClass('animate-pulse');
    });
  });

  describe('accessibility', () => {
    it('should have aria-hidden for decorative skeleton', () => {
      render(<ModeCardSkeleton variant="cyan" />);

      const skeleton = screen.getByTestId('mode-card-skeleton');
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
