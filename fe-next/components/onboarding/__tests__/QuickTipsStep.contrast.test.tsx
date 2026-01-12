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

  it('should use light text on encouragement section for proper contrast on dark backgrounds', () => {
    const { container } = renderWithLanguage(
      <QuickTipsStep
        selectedMode={null}
        onModeSelect={mockOnModeSelect}
        onComplete={mockOnComplete}
      />
    );

    // Find the encouragement section (last motion.div with bg-neo-lime/30)
    const encouragementSection = container.querySelector('.bg-neo-lime\\/30');
    expect(encouragementSection).toBeInTheDocument();

    // Check that text uses light color for proper contrast
    // In dark mode, text should be light (neo-white or similar)
    // Not dark text (neo-black) which would be invisible on dark backgrounds
    const textElement = encouragementSection?.querySelector('p');
    expect(textElement).toBeInTheDocument();

    // Verify the text has proper contrast classes for dark mode
    // Should have dark mode variant for light text on dark backgrounds
    const hasDarkModeText =
      textElement?.className.includes('dark:text-neo-white') ||
      textElement?.className.includes('dark:text-white');

    expect(hasDarkModeText).toBe(true);
  });
});
