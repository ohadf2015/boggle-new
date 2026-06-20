import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NearRankIndicator from '../NearRankIndicator';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// Translate keys to themselves so we can target copy.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (!params) return key;
      let out = key;
      for (const [k, v] of Object.entries(params)) out = out.replace(`{${k}}`, String(v));
      return out;
    },
    language: 'en',
  }),
}));

// Expose the props Avatar actually receives so we can assert the rival's REAL
// avatar config (and a deterministic userId seed) reach it.
vi.mock('@/components/Avatar', () => ({
  default: (props: { customAvatar?: CustomAvatarConfig | null; userId?: string }) => (
    <div
      data-testid="avatar"
      data-custom-base={props.customAvatar?.base ?? 'none'}
      data-user-id={props.userId ?? 'none'}
    />
  ),
}));

const rivalConfig = { base: 'RIVAL_BASE' } as unknown as CustomAvatarConfig;

// rank 1 (top), rank 2 = the rival directly above me, rank 3 = me.
const leaderboard = [
  { player_id: 'p1', display_name: 'Top', total_score: 1300, avatar_config: null, avatar_image: undefined },
  { player_id: 'p2', display_name: 'Rival', total_score: 1100, avatar_config: rivalConfig, avatar_image: undefined },
  { player_id: 'me', display_name: 'You', total_score: 1000, avatar_config: null, avatar_image: undefined },
];

const userRank = { rank_position: 3, total_score: 1000, player_id: 'me' };

describe('NearRankIndicator — points-to-beat shows the RIGHT rival avatar', () => {
  it('passes the rival’s real avatar_config to the Avatar (not undefined)', () => {
    render(
      <NearRankIndicator leaderboard={leaderboard} userRank={userRank} userId="me" totalPlayers={3} />
    );
    const avatars = screen.getAllByTestId('avatar');
    // At least one avatar must render the rival's real config — proving the
    // component reads `avatar_config`, not the wrong `custom_avatar` key.
    const withRealConfig = avatars.filter((a) => a.getAttribute('data-custom-base') === 'RIVAL_BASE');
    expect(withRealConfig.length).toBeGreaterThan(0);
  });

  it('passes a userId seed so a config-less rival never collapses to one default face', () => {
    render(
      <NearRankIndicator leaderboard={leaderboard} userRank={userRank} userId="me" totalPlayers={3} />
    );
    const avatars = screen.getAllByTestId('avatar');
    // Every rendered rival avatar must carry a per-player userId seed.
    const seeded = avatars.filter((a) => a.getAttribute('data-user-id') !== 'none');
    expect(seeded.length).toBe(avatars.length);
    expect(avatars.some((a) => a.getAttribute('data-user-id') === 'p2')).toBe(true);
  });
});
