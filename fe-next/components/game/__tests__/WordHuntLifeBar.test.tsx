/**
 * WordHuntLifeBar Tests
 * Tests for life bar rendering with correct colors based on life percentage
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
  const MotionDiv = React.forwardRef(({ children, className, style, ...rest }: any, ref: any) => (
    <div ref={ref} className={className} style={style} {...rest}>{children}</div>
  ));
  MotionDiv.displayName = 'MotionDiv';
  return {
    motion: { div: MotionDiv },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Heart: (props: any) => <svg data-testid="heart-icon" {...props} />,
}));

describe('WordHuntLifeBar', () => {
  it('should render the life bar', () => {
    render(<WordHuntLifeBar life={100} maxLife={100} />);
    const bar = screen.getByTestId('word-hunt-life-bar');
    expect(bar).toBeInTheDocument();
  });

  it('should show correct percentage width', () => {
    render(<WordHuntLifeBar life={50} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill).toHaveStyle({ width: '50%' });
  });

  it('should show green gradient when life is high (>60%)', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill.className).toContain('green');
  });

  it('should show yellow/orange gradient when life is medium (30-60%)', () => {
    render(<WordHuntLifeBar life={45} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill.className).toMatch(/yellow|orange/);
  });

  it('should show red gradient when life is low (<30%)', () => {
    render(<WordHuntLifeBar life={20} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill.className).toContain('red');
  });

  it('should handle zero life with minimum visible width', () => {
    render(<WordHuntLifeBar life={0} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill).toHaveStyle({ width: '8%' });
  });

  it('should handle life exceeding maxLife gracefully', () => {
    render(<WordHuntLifeBar life={120} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill).toHaveStyle({ width: '100%' });
  });
});
