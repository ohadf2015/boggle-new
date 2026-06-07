/**
 * Tests for AccessLevelsInfo — the access-level explainer. Verifies it stays
 * collapsed until opened, then surfaces all three orthogonal roles plus the
 * curator capability tiers and prestige rewards (driven by curatorScope data).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { AccessLevelsInfo } from '../AccessLevelsInfo';
import { CURATOR_TIER_CAPABILITIES } from '@/lib/curator/curatorScope';

describe('AccessLevelsInfo', () => {
  it('is collapsed by default — body hidden behind the toggle', () => {
    render(<AccessLevelsInfo />);
    expect(screen.getByRole('button', { name: 'curator.levels.toggle' })).toBeInTheDocument();
    expect(screen.queryByText('curator.levels.admin.title')).not.toBeInTheDocument();
  });

  it('opens to show all three orthogonal roles', () => {
    render(<AccessLevelsInfo />);
    fireEvent.click(screen.getByRole('button', { name: 'curator.levels.toggle' }));
    expect(screen.getByText('curator.levels.admin.title')).toBeInTheDocument();
    expect(screen.getByText('curator.levels.teacher.title')).toBeInTheDocument();
    expect(screen.getByText('curator.levels.curator.title')).toBeInTheDocument();
  });

  it('lists one capability row per defined tier', () => {
    render(<AccessLevelsInfo defaultOpen />);
    for (const cap of CURATOR_TIER_CAPABILITIES) {
      expect(screen.getByText(`curator.tier.${cap.tier}.desc`)).toBeInTheDocument();
    }
  });
});
