import React from 'react';
import { render } from '@testing-library/react';
import QuickTipsStep from '../QuickTipsStep';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('QuickTipsStep - Color Contrast', () => {
  const mockOnModeSelect = jest.fn();
  const mockOnComplete = jest.fn();

  const renderWithLanguage = (component: React.ReactElement) => {
    return render(
      <LanguageProvider>
        {component}
      </LanguageProvider>
    );
  };

  it('should use high-contrast text colors on tip cards and CTA', () => {
    const { container } = renderWithLanguage(
      <QuickTipsStep
        selectedMode={null}
        onModeSelect={mockOnModeSelect}
        onComplete={mockOnComplete}
      />
    );

    // Tip cards use bg-neo-cream with text-neo-black — good contrast
    const tipCards = container.querySelectorAll('.bg-neo-cream');
    expect(tipCards.length).toBeGreaterThan(0);

    // Each tip card should have dark text for contrast on light background
    tipCards.forEach(card => {
      const textElements = card.querySelectorAll('[class*="text-neo-black"]');
      expect(textElements.length).toBeGreaterThan(0);
    });

    // CTA section uses neo-lime gradient with neo-black text — good contrast
    const ctaSection = container.querySelector('[class*="from-neo-lime"]');
    expect(ctaSection).toBeInTheDocument();
  });
});
