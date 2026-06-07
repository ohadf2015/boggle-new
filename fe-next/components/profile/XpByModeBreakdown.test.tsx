import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { XpByModeBreakdown } from './XpByModeBreakdown';
import type { ModeXpSlice } from '@/lib/xp/xpByMode';

// t echoes the key so we can assert on it; mode labels resolve via getModeLabel.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const slices: ModeXpSlice[] = [
  { mode: 'classic', xp: 3000, share: 0.6 },
  { mode: 'blast', xp: 2000, share: 0.4 },
];

describe('XpByModeBreakdown', () => {
  it('renders the section title', () => {
    render(<XpByModeBreakdown xpByMode={slices} />);
    expect(screen.getByText('profile.xpByMode.title')).toBeInTheDocument();
  });

  it('renders a row per mode with its localized label', () => {
    render(<XpByModeBreakdown xpByMode={slices} />);
    expect(screen.getByText('leaderboard.gameModes.classic')).toBeInTheDocument();
    expect(screen.getByText('leaderboard.gameModes.blast')).toBeInTheDocument();
  });

  it('shows each mode percentage', () => {
    render(<XpByModeBreakdown xpByMode={slices} />);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders the Other bucket label when present', () => {
    const withOther = [...slices, { mode: '__other__', xp: 1000, share: 0.2 }];
    render(<XpByModeBreakdown xpByMode={withOther} />);
    expect(screen.getByText('profile.xpByMode.other')).toBeInTheDocument();
  });

  it('renders nothing when there is no data', () => {
    const { container } = render(<XpByModeBreakdown xpByMode={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when xpByMode is undefined', () => {
    const { container } = render(<XpByModeBreakdown xpByMode={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
