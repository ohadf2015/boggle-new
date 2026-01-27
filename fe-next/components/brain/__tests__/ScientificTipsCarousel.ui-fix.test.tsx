/**
 * Test: ScientificTipsCarousel UI Improvements
 *
 * Verifies:
 * 1. Navigation arrows positioned outside content area (not overlapping)
 * 2. Progress indicators use subtle sizing without aggressive scaling
 * 3. Header remains visible and descriptive
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScientificTipsCarousel from '../ScientificTipsCarousel';
import { ThemeProvider } from '@/utils/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

const renderCarousel = () => {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <ScientificTipsCarousel />
      </LanguageProvider>
    </ThemeProvider>
  );
};

describe('ScientificTipsCarousel UI Improvements', () => {
  describe('Navigation Arrows', () => {
    it('should position navigation arrows outside the content area', () => {
      const { container } = renderCarousel();

      // Find the main card container
      const cardContainer = container.querySelector('.relative.rounded-neo.border-3');
      expect(cardContainer).toBeInTheDocument();

      // Find navigation buttons
      const prevButton = screen.getByLabelText(/previous/i);
      const nextButton = screen.getByLabelText(/next/i);

      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();

      // Navigation buttons should be in a separate footer section
      // that doesn't overlap with tip content (min-h-[180px])
      const footer = container.querySelector('.border-t-2.border-neo-black');
      expect(footer).toBeInTheDocument();
      expect(footer).toContainElement(prevButton);
      expect(footer).toContainElement(nextButton);
    });

    it('should have navigation arrows outside the tip content container', () => {
      const { container } = renderCarousel();

      // Tip content has min-h-[180px] and p-5
      const tipContent = container.querySelector('.p-5.min-h-\\[180px\\]');
      expect(tipContent).toBeInTheDocument();

      // Navigation should NOT be inside tip content
      const prevButton = screen.getByLabelText(/previous/i);
      expect(tipContent).not.toContainElement(prevButton);
    });
  });

  describe('Progress Indicators', () => {
    it('should use subtle progress indicator sizing', () => {
      const { container } = renderCarousel();

      // Find all progress dots
      const dots = container.querySelectorAll('[aria-label*="Go to tip"]');
      expect(dots.length).toBeGreaterThan(0);

      // Active dot should NOT use scale-125 (aggressive)
      // It should use w-6 h-3 (pill shape) vs w-3 h-3 (circle)
      // This is subtle width expansion, not scale transform
      const activeDot = Array.from(dots).find(dot =>
        dot.className.includes('w-6')
      );
      expect(activeDot).toBeInTheDocument();
      expect(activeDot?.className).not.toContain('scale-125');
    });

    it('should not have aggressive shadows on active or inactive dots', () => {
      const { container } = renderCarousel();

      const dots = container.querySelectorAll('[aria-label*="Go to tip"]');

      dots.forEach(dot => {
        // Should NOT have shadow-hard-sm (aggressive)
        // Clean pill/circle shapes without heavy shadows
        expect(dot.className).not.toContain('shadow-hard-sm');
        expect(dot.className).not.toContain('shadow-[2px_2px_0px');
        expect(dot.className).not.toContain('shadow-hard-lg');
      });
    });
  });

  describe('Header', () => {
    it('should display scientific tips header with icon', () => {
      renderCarousel();

      // Header text comes from t('brain.scientificTips') = "Did You Know?"
      const header = screen.getByRole('heading', { name: /did you know/i });
      expect(header).toBeInTheDocument();
    });

    it('should display research-backed badge', () => {
      renderCarousel();

      // Badge text comes from t('brain.researchBacked') = "Research-Backed"
      const badge = screen.getByText(/research.backed/i);
      expect(badge).toBeInTheDocument();
    });
  });
});
