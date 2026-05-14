/**
 * Test: Enhanced WordHuntLifeBar with gradient, heart icon, pulse, shimmer
 *
 * TDD RED phase — verifies enhanced features
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordHuntLifeBar } from '../WordHuntLifeBar';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MotionDiv = React.forwardRef(({ children, className, style, animate, transition, ...rest }: any, ref: any) => (
    <div ref={ref} className={className} style={style} data-animate={JSON.stringify(animate)} {...rest}>{children}</div>
  ));
  MotionDiv.displayName = 'MotionDiv';
  return {
    m: { div: MotionDiv },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock lucide-react Heart
vi.mock('lucide-react', () => ({
  Heart: (props: any) => <svg data-testid="heart-icon" {...props} />,
}));

describe('WordHuntLifeBar enhanced features', () => {
  it('should render a heart icon', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
  });

  it('should use gradient class for fill bar', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    // Component uses Tailwind v4 bg-linear-to-r (equivalent to gradient)
    expect(fill.className).toContain('bg-linear-to-r');
  });

  it('should show green gradient when life > 60%', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill.className).toContain('green');
  });

  it('should show yellow/orange gradient when life is 30-60%', () => {
    render(<WordHuntLifeBar life={45} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill.className).toMatch(/yellow|orange/);
  });

  it('should show red gradient when life < 30%', () => {
    render(<WordHuntLifeBar life={20} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill.className).toContain('red');
  });

  it('should show shimmer overlay', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    expect(screen.getByTestId('word-hunt-life-bar-shimmer')).toBeInTheDocument();
  });

  it('should show life text (e.g., 80/100)', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    expect(screen.getByText('80/100')).toBeInTheDocument();
  });

  it('should pulse heart when life is low (<= 20%)', () => {
    render(<WordHuntLifeBar life={15} maxLife={100} />);
    const heart = screen.getByTestId('heart-icon').parentElement;
    // At low life, should have pulse animation data
    const animateAttr = heart?.getAttribute('data-animate');
    expect(animateAttr).toBeTruthy();
    expect(animateAttr).toContain('scale');
  });
});
