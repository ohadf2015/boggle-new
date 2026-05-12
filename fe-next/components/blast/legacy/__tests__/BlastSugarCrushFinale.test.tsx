/**
 * Tests for BlastSugarCrushFinale — hype mascot overlay during the end-of-run cascade.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastSugarCrushFinale } from '../BlastSugarCrushFinale';

jest.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: (props: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) => <div {...props} />,
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'blast.sugarCrush.title': 'SUGAR CRUSH!',
    'blast.mascot.hyped': 'Hyped mascot',
  };
  return map[key];
};

describe('BlastSugarCrushFinale', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(<BlastSugarCrushFinale active={false} t={mockT} />);
    expect(container.textContent).toBe('');
  });

  it('renders hyped mascot when active', () => {
    render(<BlastSugarCrushFinale active t={mockT} />);
    const img = screen.getByTestId('blast-sugar-crush-mascot') as HTMLImageElement;
    expect(img.src).toContain('mascot-new-onfire');
    expect(img.getAttribute('data-mascot-key')).toBe('hyped');
  });

  it('renders translated title when active', () => {
    render(<BlastSugarCrushFinale active t={mockT} />);
    expect(screen.getByText('SUGAR CRUSH!')).toBeInTheDocument();
  });
});
