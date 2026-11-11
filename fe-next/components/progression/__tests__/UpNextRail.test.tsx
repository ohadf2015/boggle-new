import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LEVEL_UNLOCK_LADDER } from '@/lib/avatar/unlocks';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/components/avatar/art/PartThumb', () => ({ PartThumb: () => <svg /> }));

import { UpNextRail } from '../UpNextRail';

describe('UpNextRail', () => {
  it('shows the next three unlocks with level and rarity', () => {
    render(<UpNextRail level={1} />);
    const items = screen.getAllByTestId('up-next-item');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(`"level":${LEVEL_UNLOCK_LADDER[0].level}`);
    expect(screen.getAllByTestId('rarity-chip')).toHaveLength(3);
  });

  it('renders nothing past the top of the ladder', () => {
    const { container } = render(<UpNextRail level={999} />);
    expect(container).toBeEmptyDOMElement();
  });
});
