import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastReactiveBackground } from '../BlastReactiveBackground';

// Mock useReducedMotion
const mockUseReducedMotion = jest.fn(() => false);
jest.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

describe('BlastReactiveBackground', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('renders nebula layer at all intensities', () => {
    const { rerender } = render(<BlastReactiveBackground intensity={0} />);
    expect(screen.getByTestId('blast-nebula')).toBeInTheDocument();

    rerender(<BlastReactiveBackground intensity={3} />);
    expect(screen.getByTestId('blast-nebula')).toBeInTheDocument();

    rerender(<BlastReactiveBackground intensity={5} />);
    expect(screen.getByTestId('blast-nebula')).toBeInTheDocument();
  });

  it('no grid lines at intensity 0', () => {
    render(<BlastReactiveBackground intensity={0} />);
    expect(screen.queryByTestId('blast-grid')).not.toBeInTheDocument();
  });

  it('shows grid lines at intensity 1+', () => {
    const { rerender } = render(<BlastReactiveBackground intensity={1} />);
    expect(screen.getByTestId('blast-grid')).toBeInTheDocument();

    rerender(<BlastReactiveBackground intensity={3} />);
    expect(screen.getByTestId('blast-grid')).toBeInTheDocument();
  });

  it('no particles at intensity 0 or 1', () => {
    const { rerender } = render(<BlastReactiveBackground intensity={0} />);
    expect(screen.queryByTestId('blast-particles')).not.toBeInTheDocument();

    rerender(<BlastReactiveBackground intensity={1} />);
    expect(screen.queryByTestId('blast-particles')).not.toBeInTheDocument();
  });

  it('shows particles at intensity 2+', () => {
    const { rerender } = render(<BlastReactiveBackground intensity={2} />);
    const container = screen.getByTestId('blast-particles');
    expect(container).toBeInTheDocument();
    // 8 particles at intensity 2
    expect(container.children).toHaveLength(8);

    rerender(<BlastReactiveBackground intensity={3} />);
    expect(screen.getByTestId('blast-particles').children).toHaveLength(12);

    rerender(<BlastReactiveBackground intensity={5} />);
    expect(screen.getByTestId('blast-particles').children).toHaveLength(15);
  });

  it('no energy waves at intensity below 4', () => {
    const { rerender } = render(<BlastReactiveBackground intensity={0} />);
    expect(screen.queryByTestId('blast-waves')).not.toBeInTheDocument();

    rerender(<BlastReactiveBackground intensity={3} />);
    expect(screen.queryByTestId('blast-waves')).not.toBeInTheDocument();
  });

  it('shows energy waves at intensity 4+', () => {
    const { rerender } = render(<BlastReactiveBackground intensity={4} />);
    expect(screen.getByTestId('blast-waves')).toBeInTheDocument();

    rerender(<BlastReactiveBackground intensity={5} />);
    expect(screen.getByTestId('blast-waves')).toBeInTheDocument();
  });

  it('respects reduced motion — only static nebula, no animations', () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<BlastReactiveBackground intensity={5} />);

    // Nebula still renders
    expect(screen.getByTestId('blast-nebula')).toBeInTheDocument();

    // No animated layers
    expect(screen.queryByTestId('blast-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('blast-particles')).not.toBeInTheDocument();
    expect(screen.queryByTestId('blast-waves')).not.toBeInTheDocument();
  });

  it('all layers have aria-hidden', () => {
    render(<BlastReactiveBackground intensity={5} />);
    const container = screen.getByTestId('blast-reactive-bg');
    expect(container).toHaveAttribute('aria-hidden', 'true');
  });
});
