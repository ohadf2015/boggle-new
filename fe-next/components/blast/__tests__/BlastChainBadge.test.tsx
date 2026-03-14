/**
 * BlastChainBadge — Tests for the cascade chain badge overlay.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(function MockDiv(
      { children, ...rest },
  m: {
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
  useReducedMotion: () => false,
}));

import { BlastChainBadge } from '../BlastChainBadge';

describe('BlastChainBadge', () => {
  it('renders nothing when chainLevel is 0', () => {
    const { container } = render(<BlastChainBadge chainLevel={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "CHAIN x1" when chainLevel is 1', () => {
    render(<BlastChainBadge chainLevel={1} />);
    expect(screen.getByText(/CHAIN/)).toBeInTheDocument();
    expect(screen.getByText(/x1/)).toBeInTheDocument();
  });

  it('renders "CHAIN x3" when chainLevel is 3', () => {
    render(<BlastChainBadge chainLevel={3} />);
    expect(screen.getByText(/x3/)).toBeInTheDocument();
  });

  it('applies cyan background for tier 1', () => {
    render(<BlastChainBadge chainLevel={1} />);
    const el = screen.getByTestId('blast-chain-badge');
    expect(el.getAttribute('data-tier')).toBe('cyan');
  });

  it('applies yellow background for tier 2', () => {
    render(<BlastChainBadge chainLevel={2} />);
    const el = screen.getByTestId('blast-chain-badge');
    expect(el.getAttribute('data-tier')).toBe('yellow');
  });

  it('applies orange background for tier 3', () => {
    render(<BlastChainBadge chainLevel={3} />);
    const el = screen.getByTestId('blast-chain-badge');
    expect(el.getAttribute('data-tier')).toBe('orange');
  });

  it('applies rainbow background for tier 4+', () => {
    render(<BlastChainBadge chainLevel={4} />);
    const el = screen.getByTestId('blast-chain-badge');
    expect(el.getAttribute('data-tier')).toBe('rainbow');
  });

  it('applies rainbow background for tier 7', () => {
    render(<BlastChainBadge chainLevel={7} />);
    const el = screen.getByTestId('blast-chain-badge');
    expect(el.getAttribute('data-tier')).toBe('rainbow');
  });

  it('has data-testid blast-chain-badge', () => {
    render(<BlastChainBadge chainLevel={2} />);
    expect(screen.getByTestId('blast-chain-badge')).toBeInTheDocument();
  });
});
