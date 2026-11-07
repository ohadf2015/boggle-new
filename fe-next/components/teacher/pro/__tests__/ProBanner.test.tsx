import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProBanner, ProCountdownTile, PRO_BANNER_CTA } from '../ProBanner';

describe('ProBanner', () => {
  it('renders a dark card with the Pro sticker, title, body and action', () => {
    render(
      <ProBanner testId="b" title="Your trial ends soon" body="Keep reports" proLabel="Pro" action={<button type="button">Keep Pro</button>} />,
    );
    const card = screen.getByTestId('b');
    expect(card).toHaveClass('shadow-hard-xl');
    expect(card.className).not.toMatch(/border-neo-black|border-black/);
    expect(screen.getByTestId('b-sticker')).toHaveTextContent('Pro');
    expect(screen.getByRole('heading', { name: 'Your trial ends soon' })).toBeInTheDocument();
    expect(screen.getByText('Keep reports')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep Pro' })).toBeInTheDocument();
  });

  it('shows a dismiss button only when onDismiss is passed', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<ProBanner testId="b" title="t" proLabel="Pro" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<ProBanner testId="b" title="t" proLabel="Pro" onDismiss={onDismiss} dismissLabel="Close" dismissTestId="b-x" />);
    fireEvent.click(screen.getByTestId('b-x'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('marks the urgent tone so the countdown and stripe turn pink', () => {
    render(<ProBanner testId="b" title="t" proLabel="Pro" tone="urgent" lead={<ProCountdownTile count={2} unit="days left" tone="urgent" />} />);
    expect(screen.getByTestId('b')).toHaveAttribute('data-tone', 'urgent');
    expect(screen.getByTestId('trial-count')).toHaveTextContent('2');
    expect(screen.getByTestId('trial-unit')).toHaveTextContent('days left');
    expect(screen.getByTestId('trial-count').parentElement).toHaveClass('bg-neo-pink');
  });

  it('gives the CTA the chunky yellow Pro button look', () => {
    expect(PRO_BANNER_CTA).toMatch(/bg-neo-yellow/);
    expect(PRO_BANNER_CTA).toMatch(/border-neo-black/);
  });
});
