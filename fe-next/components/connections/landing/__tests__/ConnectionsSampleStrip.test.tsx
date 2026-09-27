import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConnectionsSampleStrip from '../ConnectionsSampleStrip';
import { getConnectionsLandingCopy } from '@/app/[locale]/connections/content';

const sampleRevealed = vi.fn();

vi.mock('@/lib/connections/landingTelemetry', () => ({
  trackLandingSampleRevealed: (...args: unknown[]) => sampleRevealed(...args),
}));

beforeEach(() => sampleRevealed.mockClear());

describe('ConnectionsSampleStrip', () => {
  it('renders 3 difficulty cards', () => {
    const copy = getConnectionsLandingCopy('en').samples;
    render(<ConnectionsSampleStrip locale="en" copy={copy} />);
    expect(screen.getByTestId('sample-strip-easy')).toBeInTheDocument();
    expect(screen.getByTestId('sample-strip-medium')).toBeInTheDocument();
    expect(screen.getByTestId('sample-strip-hard')).toBeInTheDocument();
  });

  it('hides bridge word before reveal', () => {
    const copy = getConnectionsLandingCopy('en').samples;
    render(<ConnectionsSampleStrip locale="en" copy={copy} />);
    for (const item of copy.items) {
      expect(screen.queryByText(item.bridge)).not.toBeInTheDocument();
    }
  });

  it('reveals and tracks on click', () => {
    const copy = getConnectionsLandingCopy('en').samples;
    render(<ConnectionsSampleStrip locale="en" copy={copy} />);
    fireEvent.click(screen.getByTestId('sample-strip-easy'));
    expect(screen.getByText(copy.items[0]!.bridge)).toBeInTheDocument();
    expect(sampleRevealed).toHaveBeenCalledWith({ locale: 'en', position: 'strip-easy' });
  });
});
