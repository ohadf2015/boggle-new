import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import LeaderboardPodium from '../LeaderboardPodium';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/components/Avatar', () => ({
  default: (props: { customAvatar?: CustomAvatarConfig | null; userId?: string }) => (
    <div
      data-testid="avatar"
      data-custom-base={props.customAvatar?.base ?? 'none'}
      data-user-id={props.userId ?? 'none'}
    />
  ),
}));

const goldCfg = { base: 'GOLD' } as unknown as CustomAvatarConfig;

const entries = [
  { player_id: 'a', display_name: 'Ada', total_score: 3000, avatar_config: goldCfg },
  { player_id: 'b', display_name: 'Ben', total_score: 2000, avatar_config: null },
  { player_id: 'c', display_name: 'Cy', total_score: 1000, avatar_config: null },
];

describe('LeaderboardPodium', () => {
  it('renders the top three players', () => {
    render(<LeaderboardPodium entries={entries} language="en" />);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
    expect(screen.getByText('Cy')).toBeInTheDocument();
  });

  it('arranges visually as 2nd · 1st · 3rd (champion centered)', () => {
    render(<LeaderboardPodium entries={entries} language="en" />);
    const steps = screen.getAllByTestId('podium-step');
    expect(steps.map((s) => s.getAttribute('data-rank'))).toEqual(['2', '1', '3']);
  });

  it('passes each player’s real avatar_config and a userId seed to Avatar', () => {
    render(<LeaderboardPodium entries={entries} language="en" />);
    const avatars = screen.getAllByTestId('avatar');
    // Champion's real config flows through.
    expect(avatars.some((a) => a.getAttribute('data-custom-base') === 'GOLD')).toBe(true);
    // Every avatar carries a per-player seed (no shared default face).
    expect(avatars.every((a) => a.getAttribute('data-user-id') !== 'none')).toBe(true);
  });

  it('marks the current user’s step', () => {
    render(<LeaderboardPodium entries={entries} language="en" currentUserId="b" />);
    const steps = screen.getAllByTestId('podium-step');
    const benStep = steps.find((s) => within(s).queryByText('Ben'));
    expect(benStep).toHaveAttribute('data-you', 'true');
  });

  it('does not crash with fewer than three entries', () => {
    render(<LeaderboardPodium entries={entries.slice(0, 2)} language="en" />);
    expect(screen.getAllByTestId('podium-step')).toHaveLength(2);
  });

  it('renders nothing with no entries', () => {
    const { container } = render(<LeaderboardPodium entries={[]} language="en" />);
    expect(container.firstChild).toBeNull();
  });
});
