/**
 * Tests for LetterTileWord component
 * Verifies feedback indicators, animations, and visual states
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LetterTileWord } from '../LetterTileWord';
import type { WordFeedback } from '@/components/game/WordFormingArea';

// Mock AdaptiveMotion to render plain divs/spans for testability
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('LetterTileWord', () => {
  // Helper to create feedback objects
  const createFeedback = (
    type: WordFeedback['type'],
    word: string,
    overrides?: Partial<WordFeedback>
  ): WordFeedback => ({
    id: `${type}-${Date.now()}`,
    type,
    word,
    timestamp: Date.now(),
    ...overrides,
  });

  describe('empty state', () => {
    it('renders placeholder when word is empty', () => {
      const { container } = render(
        <LetterTileWord word="" feedback={null} />
      );
      // Should render the empty state container
      expect(container.querySelector('.h-12')).toBeInTheDocument();
    });
  });

  describe('letter tiles', () => {
    it('renders individual letter tiles for each character', () => {
      render(<LetterTileWord word="CAT" feedback={null} />);
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('converts letters to uppercase', () => {
      render(<LetterTileWord word="cat" feedback={null} />);
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('limits tiles to maxTiles prop', () => {
      render(<LetterTileWord word="ABCDEFGHIJ" feedback={null} maxTiles={5} />);
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('E')).toBeInTheDocument();
      expect(screen.queryByText('F')).not.toBeInTheDocument();
    });
  });

  describe('accepted feedback', () => {
    it('shows checkmark icon for accepted words', () => {
      const feedback = createFeedback('accepted', 'CAT', { score: 5 });
      const { container } = render(
        <LetterTileWord word="CAT" feedback={feedback} />
      );
      // Should have a checkmark indicator
      expect(container.querySelector('[data-testid="feedback-icon-accepted"]')).toBeInTheDocument();
    });

    it('shows score badge for accepted words', () => {
      const feedback = createFeedback('accepted', 'CAT', { score: 5 });
      render(<LetterTileWord word="CAT" feedback={feedback} />);
      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('applies green tile styling for accepted words', () => {
      const feedback = createFeedback('accepted', 'CAT', { score: 2 });
      const { container } = render(
        <LetterTileWord word="CAT" feedback={feedback} />
      );
      // Check that accepted tiles have green-related class
      const tiles = container.querySelectorAll('[class*="bg-neo-lime"]');
      expect(tiles.length).toBeGreaterThan(0);
    });
  });

  describe('rejected feedback', () => {
    it('shows X icon for rejected words', () => {
      const feedback = createFeedback('rejected', 'XYZ', { message: 'Invalid' });
      const { container } = render(
        <LetterTileWord word="XYZ" feedback={feedback} />
      );
      expect(container.querySelector('[data-testid="feedback-icon-rejected"]')).toBeInTheDocument();
    });

    it('shows error message for rejected words', () => {
      const feedback = createFeedback('rejected', 'XYZ', { message: 'Invalid word' });
      render(<LetterTileWord word="XYZ" feedback={feedback} />);
      expect(screen.getByText('Invalid word')).toBeInTheDocument();
    });

    it('applies red tile styling for rejected words', () => {
      const feedback = createFeedback('rejected', 'XYZ', { message: 'Invalid' });
      const { container } = render(
        <LetterTileWord word="XYZ" feedback={feedback} />
      );
      const tiles = container.querySelectorAll('[class*="bg-neo-red"]');
      expect(tiles.length).toBeGreaterThan(0);
    });
  });

  describe('duplicate feedback', () => {
    it('shows loop icon for duplicate words', () => {
      const feedback = createFeedback('duplicate', 'CAT', { message: 'Already found' });
      const { container } = render(
        <LetterTileWord word="CAT" feedback={feedback} />
      );
      expect(container.querySelector('[data-testid="feedback-icon-duplicate"]')).toBeInTheDocument();
    });

    it('shows duplicate message', () => {
      const feedback = createFeedback('duplicate', 'CAT', { message: 'Already found' });
      render(<LetterTileWord word="CAT" feedback={feedback} />);
      expect(screen.getByText('Already found')).toBeInTheDocument();
    });

    it('applies pink tile styling for duplicate words', () => {
      const feedback = createFeedback('duplicate', 'CAT', { message: 'Already found' });
      const { container } = render(
        <LetterTileWord word="CAT" feedback={feedback} />
      );
      const tiles = container.querySelectorAll('[class*="bg-pink"]');
      expect(tiles.length).toBeGreaterThan(0);
    });
  });

  describe('feedback row', () => {
    it('renders inline feedback when feedback present', () => {
      const feedback = createFeedback('accepted', 'CAT', { score: 5 });
      const { container } = render(
        <LetterTileWord word="CAT" feedback={feedback} />
      );
      expect(container.querySelector('[data-testid="feedback-row"]')).toBeInTheDocument();
    });

    it('does not render feedback row when no feedback', () => {
      const { container } = render(
        <LetterTileWord word="CAT" feedback={null} />
      );
      expect(container.querySelector('[data-testid="feedback-row"]')).not.toBeInTheDocument();
    });
  });

  describe('shake animation', () => {
    it('applies shake class for rejected feedback', () => {
      const feedback = createFeedback('rejected', 'XYZ', { message: 'Invalid' });
      const { container } = render(
        <LetterTileWord word="XYZ" feedback={feedback} />
      );
      const tileContainer = container.querySelector('[data-testid="tile-container"]');
      expect(tileContainer?.className).toContain('animate-neo-shake');
    });

    it('applies shake class for duplicate feedback', () => {
      const feedback = createFeedback('duplicate', 'CAT', { message: 'Already found' });
      const { container } = render(
        <LetterTileWord word="CAT" feedback={feedback} />
      );
      const tileContainer = container.querySelector('[data-testid="tile-container"]');
      expect(tileContainer?.className).toContain('animate-neo-shake');
    });

    it('does not apply shake for accepted feedback', () => {
      const feedback = createFeedback('accepted', 'CAT', { score: 5 });
      const { container } = render(
        <LetterTileWord word="CAT" feedback={feedback} />
      );
      const tileContainer = container.querySelector('[data-testid="tile-container"]');
      expect(tileContainer?.className).not.toContain('animate-neo-shake');
    });
  });
});
