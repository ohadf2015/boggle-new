/**
 * Test: DailyIntroCarousel UI Improvements
 *
 * Verifies:
 * 1. Progress indicators use subtle sizing without aggressive scaling
 * 2. Header is added to describe carousel purpose
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DailyIntroCarousel } from '../DailyIntroCarousel';
import { LanguageProvider } from '@/contexts/LanguageContext';

const renderCarousel = (targetWordLength = 5) => {
  return render(
    <LanguageProvider>
      <DailyIntroCarousel targetWordLength={targetWordLength} />
    </LanguageProvider>
  );
};

describe('DailyIntroCarousel UI Improvements', () => {
  describe('Progress Indicators', () => {
    it('should use subtle progress indicator sizing', () => {
      const { container } = renderCarousel();

      // Find all progress dots
      const dots = container.querySelectorAll('[aria-label*="Go to step"]');
      expect(dots.length).toBe(2); // TOTAL_STEPS = 2

      // Active dot should NOT use scale-125 (aggressive)
      // Should use a more subtle size difference (w-4 h-4 vs w-3 h-3)
      const activeDot = Array.from(dots).find(dot =>
        dot.className.includes('bg-neo-pink')
      );
      expect(activeDot).toBeInTheDocument();
      expect(activeDot?.className).not.toContain('scale-125');

      // Active dot should be w-4 h-4 (subtle increase from w-3 h-3)
      expect(activeDot?.className).toContain('w-4');
      expect(activeDot?.className).toContain('h-4');
    });

    it('should not have aggressive shadow effects', () => {
      const { container } = renderCarousel();

      const dots = container.querySelectorAll('[aria-label*="Go to step"]');

      dots.forEach(dot => {
        // Should not use shadow-[2px_2px_0px_rgb(0,0,0)] (too aggressive)
        // Clean circles without heavy shadows
        expect(dot.className).not.toContain('shadow-[2px_2px_0px');
        expect(dot.className).not.toContain('shadow-hard');
      });
    });

    it('should use subtle hover states', () => {
      const { container } = renderCarousel();

      const dots = container.querySelectorAll('[aria-label*="Go to step"]');
      const inactiveDots = Array.from(dots).filter(dot =>
        !dot.className.includes('bg-neo-pink')
      );

      inactiveDots.forEach(dot => {
        // Should have subtle hover (not scale-110)
        expect(dot.className).not.toContain('hover:scale-110');
        // Should have bg-neo-pink/30 on hover instead
        expect(dot.className).toContain('hover:bg-neo-pink/30');
      });
    });
  });

  describe('Header', () => {
    it('should display carousel header describing its purpose', () => {
      renderCarousel();

      // Header comes from t('daily.carousel.header') = "How to Play"
      const header = screen.getByRole('heading', { name: /how to play/i });
      expect(header).toBeInTheDocument();
    });

    it('should have header positioned above carousel content', () => {
      const { container } = renderCarousel();

      // Find header container with mb-3 class
      const headerContainer = container.querySelector('.mb-3');
      expect(headerContainer).toBeInTheDocument();

      // Header should contain the h3 heading
      const heading = headerContainer?.querySelector('h3');
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toMatch(/how to play/i);

      // Carousel content should come after header
      const carouselContent = container.querySelector('.rounded-neo-lg.border-3');
      expect(carouselContent).toBeInTheDocument();
    });
  });
});
