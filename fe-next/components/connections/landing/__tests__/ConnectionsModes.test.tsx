import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionsModes from '../ConnectionsModes';
import { getConnectionsLandingCopy } from '@/app/[locale]/connections/content';

describe('ConnectionsModes', () => {
  it('links every mode to its own route under the locale', () => {
    const copy = getConnectionsLandingCopy('en').modes;
    render(<ConnectionsModes locale="en" copy={copy} />);
    for (const mode of copy.items) {
      const link = screen.getByRole('link', { name: new RegExp(mode.title) });
      expect(link).toHaveAttribute('href', `/en/connections/${mode.key}`);
    }
  });

  it('has no Pyramid link where the locale has no pyramid pool', () => {
    render(<ConnectionsModes locale="sv" copy={getConnectionsLandingCopy('sv').modes} />);
    expect(screen.queryByRole('link', { name: /pyramid/i })).toBeNull();
    expect(screen.getAllByRole('link').every((a) => !a.getAttribute('href')?.endsWith('/pyramid'))).toBe(true);
  });
});
