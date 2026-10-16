import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const he: Record<string, string> = {
  'leaderboard.tiers.silver': 'כסף',
  'leaderboard.tier.toNextTier': '{{pct}}% לדרגה הבאה',
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) =>
      (he[k] ?? k).replace(/\{\{(\w+)\}\}/g, (_, v) => String(p?.[v] ?? '')),
  }),
}));

import { TierBadge, TierProgressBar } from '../TierBadge';
import { GLOBAL_LEADERBOARD_TIERS } from '@/lib/ranked/leaderboardTiers';

const silver = GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === 'silver')!;

describe('TierBadge localisation', () => {
  it('shouldShowTheTierNameInThePlayersLanguage', () => {
    render(<TierBadge tier={silver} showLabel />);
    expect(screen.getByText('כסף')).toBeInTheDocument();
    expect(screen.queryByText('Silver')).toBeNull();
  });

  it('shouldShowProgressCopyInThePlayersLanguage', () => {
    render(<TierProgressBar tier={silver} progress={0.18} nextThreshold={5000} />);
    expect(screen.getByText('18% לדרגה הבאה')).toBeInTheDocument();
  });
});
