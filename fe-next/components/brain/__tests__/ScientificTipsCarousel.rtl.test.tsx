/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock dependencies BEFORE imports
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

// Mock framer-motion to avoid matchMedia issues
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => {
      // Filter out framer-motion specific props
      const { custom, variants, initial, animate, exit, transition, layoutId, ...htmlProps } = props;
      return <div {...htmlProps}>{children}</div>;
    },
    span: ({ children, ...props }: any) => {
      const { layoutId, transition, ...htmlProps } = props;
      return <span {...htmlProps}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockDir = { current: 'ltr' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: mockDir.current,
    language: mockDir.current === 'rtl' ? 'he' : 'en',
    setLanguage: vi.fn(),
    currentFlag: '🇺🇸',
  }),
}));

import ScientificTipsCarousel from '../ScientificTipsCarousel';

describe('ScientificTipsCarousel - RTL Arrow Direction', () => {
  beforeEach(() => {
    mockDir.current = 'ltr';
  });

  it('should navigate to previous tip when left arrow is clicked in LTR', () => {
    mockDir.current = 'ltr';
    render(<ScientificTipsCarousel />);

    // Get navigation buttons
    const buttons = screen.getAllByRole('button');
    const leftButton = buttons[0]; // First button should be "previous"

    // Initially on tip1, navigate to last tip using previous (should wrap)
    fireEvent.click(leftButton);

    // After clicking previous from index 0, should be at index 4 (wrap around)
    const dots = screen.getAllByLabelText(/Go to tip/i);
    // The 5th dot (index 4) should be active (w-6 for active state)
    expect(dots[4]).toHaveClass('w-6');
  });

  it('should navigate to previous tip when LEFT arrow is clicked in RTL (arrows flip visually, not semantically)', () => {
    mockDir.current = 'rtl';
    render(<ScientificTipsCarousel />);

    // In RTL, the visual LEFT button should STILL go to previous
    // (the icon flips, but the semantic meaning stays the same)
    const buttons = screen.getAllByRole('button');
    const leftVisualButton = buttons[0]; // Visually left in RTL layout

    // Click the left button - should go to previous (index 4)
    fireEvent.click(leftVisualButton);

    const dots = screen.getAllByLabelText(/Go to tip/i);
    // Should wrap to index 4 (w-6 for active state)
    expect(dots[4]).toHaveClass('w-6');
  });

  it('should navigate to next tip when RIGHT arrow is clicked in RTL', () => {
    mockDir.current = 'rtl';
    render(<ScientificTipsCarousel />);

    const buttons = screen.getAllByRole('button');
    const rightVisualButton = buttons[buttons.length - 1]; // Visually right in RTL layout

    // Click the right button - should go to next (index 1)
    fireEvent.click(rightVisualButton);

    const dots = screen.getAllByLabelText(/Go to tip/i);
    // Active dot has w-6 class
    expect(dots[1]).toHaveClass('w-6');
  });

  it('should have consistent navigation behavior in LTR and RTL', () => {
    // Test LTR - separate render to avoid state carryover
    mockDir.current = 'ltr';
    const { unmount: unmount1 } = render(<ScientificTipsCarousel />);
    let buttons = screen.getAllByRole('button');
    let leftButton = buttons[0];

    fireEvent.click(leftButton);
    let dots = screen.getAllByLabelText(/Go to tip/i);
    // Active dot has w-6 class instead of scale-150
    const ltrPreviousIndex = dots.findIndex(dot => dot.classList.contains('w-6'));
    unmount1();

    // Test RTL - fresh render
    mockDir.current = 'rtl';
    render(<ScientificTipsCarousel />);
    buttons = screen.getAllByRole('button');
    leftButton = buttons[0]; // Same visual position

    fireEvent.click(leftButton);
    dots = screen.getAllByLabelText(/Go to tip/i);
    const rtlPreviousIndex = dots.findIndex(dot => dot.classList.contains('w-6'));

    // Both should navigate to the same semantic position (previous)
    expect(ltrPreviousIndex).toBe(rtlPreviousIndex);
  });
});
