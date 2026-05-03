/**
 * PracticeChainCta routes the player from a finished practice mode to the next
 * mode in the playlist. After the last mode (`wheelRush`) it sends them back to
 * the practice hub instead of dead-ending.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', t: (k: string) => k }),
}));

import PracticeChainCta from '../PracticeChainCta';

describe('PracticeChainCta', () => {
  it('links to the next mode in the playlist when one exists', () => {
    render(<PracticeChainCta currentMode="classic" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/he/practice/wordHunt');
    expect(link.textContent).toMatch(/practice\.continueTo\.wordHunt/);
  });

  it('links from wordHunt to wheelRush', () => {
    render(<PracticeChainCta currentMode="wordHunt" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/he/practice/wheelRush');
  });

  it('routes to the hub with a "all done" label after the last mode', () => {
    render(<PracticeChainCta currentMode="wheelRush" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/he/practice');
    expect(link.textContent).toMatch(/practice\.allDone/);
  });
});
