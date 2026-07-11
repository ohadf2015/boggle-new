/**
 * QrWelcomeBanner — witty "you scanned in" welcome shown at the top of the daily
 * landing when a player is warped here by scanning a printed QR / barcode
 * (homepage redirect appends `?from=qr`). Renders nothing unless `show` is true.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QrWelcomeBanner } from '../QrWelcomeBanner';

const t = (key: string) => {
  const map: Record<string, string> = {
    'daily.qrWelcome.badge': 'Scanned in',
    'daily.qrWelcome.line': 'Nice scan — we warped you straight to today\'s challenge.',
  };
  return map[key] ?? key;
};

describe('QrWelcomeBanner', () => {
  it('renders nothing when show is false', () => {
    const { container } = render(<QrWelcomeBanner show={false} t={t} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the witty QR welcome when show is true', () => {
    render(<QrWelcomeBanner show t={t} />);
    expect(screen.getByTestId('qr-welcome-banner')).toBeInTheDocument();
    expect(screen.getByText('Scanned in')).toBeInTheDocument();
    expect(screen.getByText(/warped you straight to today/i)).toBeInTheDocument();
  });
});
