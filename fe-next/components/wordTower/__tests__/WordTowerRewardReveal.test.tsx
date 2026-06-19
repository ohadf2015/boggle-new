import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordTowerRewardReveal } from '../WordTowerRewardReveal';

const t = (k: string) => k;

describe('WordTowerRewardReveal', () => {
  it('renders nothing when there is no reward', () => {
    const { container } = render(<WordTowerRewardReveal reward={null} t={t} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the granted coin amount the player actually receives', () => {
    render(
      <WordTowerRewardReveal
        reward={{ coins: 48, tier: 'rare', source: 'zone', key: 1 }}
        t={t}
      />,
    );
    expect(screen.getByText(/48/)).toBeTruthy();
  });

  it('surfaces the tier so a rare/epic drop reads as special', () => {
    render(
      <WordTowerRewardReveal
        reward={{ coins: 120, tier: 'epic', source: 'achievement', key: 2 }}
        t={t}
      />,
    );
    // tier label key is surfaced for i18n (wordTower.reward.tier.epic)
    expect(screen.getByText(/wordTower\.reward\.tier\.epic/)).toBeTruthy();
  });
});
