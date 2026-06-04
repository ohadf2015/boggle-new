import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import { RankTierChip } from '../RankTierChip';

describe('RankTierChip', () => {
  it('renders the localized tier label with its static color class', () => {
    const { container } = render(<RankTierChip tier="gold" />);
    expect(screen.getByText('rank.tier.gold')).toBeInTheDocument();
    // Static literal Tailwind class (no dynamic interpolation).
    expect(container.querySelector('.text-neo-yellow')).toBeTruthy();
  });

  it('renders nothing for a null tier', () => {
    const { container } = render(<RankTierChip tier={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for an unknown tier string', () => {
    const { container } = render(<RankTierChip tier="bogus" />);
    expect(container.firstChild).toBeNull();
  });
});
