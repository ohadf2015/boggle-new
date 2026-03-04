/**
 * BlastChainCounter — Tests for the cascade chain counter UI component.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock AdaptiveMotion so tests run without device/animation context
jest.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: React.forwardRef(function MockDiv(
      { children, ...rest }: React.PropsWithChildren<Record<string, unknown>>,
      ref: React.Ref<HTMLDivElement>
    ) {
      // Strip framer-motion-specific props before passing to div
      const { initial, animate, exit, transition, ...htmlProps } = rest as Record<string, unknown>;
      void initial; void animate; void exit; void transition;
      return <div ref={ref} {...htmlProps}>{children}</div>;
    }),
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(function MockDiv(
      { children, ...rest }: React.PropsWithChildren<Record<string, unknown>>,
      ref: React.Ref<HTMLDivElement>
    ) {
      const { initial, animate, exit, transition, ...htmlProps } = rest as Record<string, unknown>;
      void initial; void animate; void exit; void transition;
      return <div ref={ref} {...htmlProps}>{children}</div>;
    }),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import { BlastChainCounter } from '../BlastChainCounter';

describe('BlastChainCounter', () => {
  it('renders nothing when chainLevel is 0', () => {
    const { container } = render(<BlastChainCounter chainLevel={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when chainLevel is negative', () => {
    const { container } = render(<BlastChainCounter chainLevel={-1} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders with data-testid="blast-chain-counter" when chainLevel >= 1', () => {
    render(<BlastChainCounter chainLevel={1} />);
    expect(screen.getByTestId('blast-chain-counter')).toBeInTheDocument();
  });

  it('displays "CHAIN x1" text at chain level 1', () => {
    render(<BlastChainCounter chainLevel={1} />);
    expect(screen.getByText('CHAIN x1')).toBeInTheDocument();
  });

  it('displays "CHAIN x2" text at chain level 2', () => {
    render(<BlastChainCounter chainLevel={2} />);
    expect(screen.getByText('CHAIN x2')).toBeInTheDocument();
  });

  it('displays "CHAIN x5" text at chain level 5', () => {
    render(<BlastChainCounter chainLevel={5} />);
    expect(screen.getByText('CHAIN x5')).toBeInTheDocument();
  });

  it('applies white color at chain level 1 (via data-chain-color)', () => {
    render(<BlastChainCounter chainLevel={1} />);
    const el = screen.getByTestId('blast-chain-counter');
    expect(el.getAttribute('data-chain-color')).toBe('#FFFFFF');
  });

  it('applies gold color at chain level 2 (via data-chain-color)', () => {
    render(<BlastChainCounter chainLevel={2} />);
    const el = screen.getByTestId('blast-chain-counter');
    expect(el.getAttribute('data-chain-color')).toBe('#FFD700');
  });

  it('applies orange color at chain level 3 (via data-chain-color)', () => {
    render(<BlastChainCounter chainLevel={3} />);
    const el = screen.getByTestId('blast-chain-counter');
    expect(el.getAttribute('data-chain-color')).toBe('#FF6B35');
  });

  it('applies rainbow color indicator at chain level 4+ (via data-chain-color)', () => {
    render(<BlastChainCounter chainLevel={4} />);
    const el = screen.getByTestId('blast-chain-counter');
    expect(el.getAttribute('data-chain-color')).toBe('rainbow');
  });

  it('updates label when chainLevel changes', () => {
    const { rerender } = render(<BlastChainCounter chainLevel={1} />);
    expect(screen.getByText('CHAIN x1')).toBeInTheDocument();

    rerender(<BlastChainCounter chainLevel={3} />);
    expect(screen.getByText('CHAIN x3')).toBeInTheDocument();
  });

  it('hides when chainLevel returns to 0', () => {
    const { rerender } = render(<BlastChainCounter chainLevel={2} />);
    expect(screen.getByTestId('blast-chain-counter')).toBeInTheDocument();

    rerender(<BlastChainCounter chainLevel={0} />);
    expect(screen.queryByTestId('blast-chain-counter')).not.toBeInTheDocument();
  });
});
