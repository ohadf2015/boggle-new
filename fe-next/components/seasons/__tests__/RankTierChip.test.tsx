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

  it('renders no rank image by default', () => {
    const { container } = render(<RankTierChip tier="diamond" />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders the tier badge image when showImage is set', () => {
    const { container } = render(<RankTierChip tier="diamond" showImage />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toContain('tier-diamond');
    // Label still rendered alongside the image.
    expect(screen.getByText('rank.tier.diamond')).toBeInTheDocument();
  });
});
