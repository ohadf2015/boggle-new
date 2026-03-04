/**
 * WordHuntLifeBar Tests
 * Tests for life bar rendering with correct colors based on life percentage
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WordHuntLifeBar } from '../WordHuntLifeBar';

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
  }),
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

  it('should show green color when life is high (>60%)', () => {
    render(<WordHuntLifeBar life={80} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill.className).toContain('bg-green');
  });

  it('should show yellow color when life is medium (30-60%)', () => {
    render(<WordHuntLifeBar life={45} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill.className).toContain('bg-yellow');
  });

  it('should show red color when life is low (<30%)', () => {
    render(<WordHuntLifeBar life={20} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill.className).toContain('bg-red');
  });

  it('should handle zero life', () => {
    render(<WordHuntLifeBar life={0} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill).toHaveStyle({ width: '0%' });
  });

  it('should handle life exceeding maxLife gracefully', () => {
    render(<WordHuntLifeBar life={120} maxLife={100} />);
    const fill = screen.getByTestId('word-hunt-life-bar-fill');
    expect(fill).toHaveStyle({ width: '100%' });
  });
});
