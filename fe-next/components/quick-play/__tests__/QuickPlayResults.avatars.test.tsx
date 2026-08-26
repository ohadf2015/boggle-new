import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QuickPlayResults } from '../QuickPlayResults';
import type { QuickRoundResult, QuickSubmitOutcome } from '../types';
import type { QuickGhostRival } from '@/lib/quickPlay/ghostRivals';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// --- Mocks ---
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

// Track the auth state so tests can override it
let mockAuthState: any = {
  user: { id: 'test-user-1' },
  profile: { username: 'TestPlayer', avatar_config: null },
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/utils/haptics/HapticsManager', () => ({ haptics: { success: vi.fn() } }));
vi.mock('@/components/daily/RivalCompareCard', () => ({
  default: ({ rivalAvatar, myAvatar }: any) => (
    <div
      data-testid="mock-rival-card"
      data-rival-avatar-user={rivalAvatar?.userId}
      data-my-avatar-user={myAvatar?.userId}
    />
  ),
}));
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

// Mock AvatarRenderer to capture and expose the config received, so we can verify
// whether the avatar is using a real config or a seeded one.
vi.mock('@/components/avatar/AvatarRenderer', () => ({
  __esModule: true,
  default: ({ config }: any) => (
    <div data-testid="mock-avatar-renderer" data-config-id={config?.id} />
  ),
}));

const mockAvatarConfig: CustomAvatarConfig = {
  id: 'test-avatar-1',
  head: 'head-1',
  eyes: 'eyes-1',
  eyebrows: 'eyebrows-1',
  mouth: 'mouth-1',
  accessory: 'accessory-1',
  skinColor: '#ffc0a0',
};

const result: QuickRoundResult = {
  mode: 'classic',
  seed: 's-1',
  score: 340,
  perfectScore: 500,
  scorePct: 68,
  wordsFound: 7,
  totalWords: 12,
  durationMs: 60000,
  words: [
    { word: 'test', score: 10 },
    { word: 'play', score: 15 },
  ],
};

const outcome: QuickSubmitOutcome = {
  scorePct: 68,
  coins: 93,
  xp: 74,
  percentileToday: 73,
  history: [68, 50, 40],
  totalPoints: 900,
};

describe('QuickPlayResults avatars — provenance (real config vs generated)', () => {
  beforeEach(() => {
    // Mock leaderboard fetch with entries that have and don't have avatars
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/api/quick-play/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            entries: [
              {
                userId: 'user-with-avatar',
                name: 'Player With Avatar',
                bestScorePct: 95,
                rank: 1,
                customAvatar: mockAvatarConfig,
              },
              {
                userId: 'user-without-avatar',
                name: 'Player Without Avatar',
                bestScorePct: 85,
                rank: 2,
                customAvatar: null,
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));
  });

  it('renders signed-in player with their real avatar config on the standings row', async () => {
    const realPlayerConfig: CustomAvatarConfig = {
      id: 'PLAYER_REAL_FACE',
      head: 'head-real',
      eyes: 'eyes-real',
      eyebrows: 'eyebrows-real',
      mouth: 'mouth-real',
      accessory: 'accessory-real',
      skinColor: '#ffc0a0',
    };

    // Set up auth mock with real avatar
    mockAuthState = {
      user: { id: 'test-user-1' },
      profile: { username: 'TestPlayer', avatar_config: realPlayerConfig },
    };

    const rivals: QuickGhostRival[] = [
      {
        userId: 'ghost-1',
        name: 'Ghost Player',
        customAvatar: null, // Ghost without config — should be generated
        scorePct: 60,
      },
    ];

    render(
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={null}
        rivals={rivals}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );

    // Wait for standings to render
    await screen.findByTestId('quick-rivals-passed');

    // Find the "me" row in standings
    const meRow = screen.getByTestId('quick-rival-row-me');
    expect(meRow).toBeInTheDocument();

    // The player's avatar must carry their REAL config id, not a seeded one
    const playerRenderer = meRow.querySelector('[data-testid="mock-avatar-renderer"]');
    expect(playerRenderer).toHaveAttribute('data-config-id', 'PLAYER_REAL_FACE');

    // Reset auth state for other tests
    mockAuthState = {
      user: { id: 'test-user-1' },
      profile: { username: 'TestPlayer', avatar_config: null },
    };
  });

  it('renders ghost rival without config as generated avatar (seeded from userId)', async () => {
    const ghostWithoutConfig: QuickGhostRival = {
      userId: 'ghost-seeded-id',
      name: 'Ghost Without Config',
      customAvatar: null,
      scorePct: 55,
    };

    render(
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={null}
        rivals={[ghostWithoutConfig]}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );

    await screen.findByTestId('quick-rivals-passed');

    // Ghost row should be present
    const ghostRow = within(screen.getByTestId('quick-rivals-passed')).getByText('Ghost Without Config');
    expect(ghostRow).toBeInTheDocument();

    // Ghost must have a generated avatar (data-avatar-type="generated")
    // not a custom one with a pre-seeded config
    const standings = screen.getByTestId('quick-rivals-passed');
    const generatedAvatars = standings.querySelectorAll('[data-avatar-type="generated"]');
    expect(generatedAvatars.length).toBeGreaterThan(0);
  });

  it('renders ghost rival with real config using that config', async () => {
    const realRivalConfig: CustomAvatarConfig = {
      id: 'RIVAL_REAL_FACE',
      head: 'head-rival',
      eyes: 'eyes-rival',
      eyebrows: 'eyebrows-rival',
      mouth: 'mouth-rival',
      accessory: 'accessory-rival',
      skinColor: '#e8a080',
    };

    const ghostWithConfig: QuickGhostRival = {
      userId: 'rival-with-config',
      name: 'Real Ghost Rival',
      customAvatar: realRivalConfig,
      scorePct: 85,
    };

    render(
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={null}
        rivals={[ghostWithConfig]}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );

    await screen.findByTestId('quick-rivals-passed');

    // Find the rival's row and verify its config
    const standings = screen.getByTestId('quick-rivals-passed');
    const rivalRow = within(standings).getByText('Real Ghost Rival');
    const rivalRenderer = rivalRow.closest('li')?.querySelector('[data-testid="mock-avatar-renderer"]');
    expect(rivalRenderer).toHaveAttribute('data-config-id', 'RIVAL_REAL_FACE');
  });

  it('does not render skeleton avatars anywhere on the results screen', async () => {
    render(
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={null}
        rivals={[
          {
            userId: 'rival-1',
            name: 'Rival One',
            customAvatar: mockAvatarConfig,
            scorePct: 50,
          },
          {
            userId: 'rival-2',
            name: 'Rival Two',
            customAvatar: null,
            scorePct: 40,
          },
        ]}
        onNextRound={vi.fn()}
        onChallenge={vi.fn()}
      />
    );

    await screen.findByTestId('quick-rivals-passed');

    // Verify zero skeleton avatars (Avatar renders a skeleton when both
    // customAvatar and userId are falsy, which should never happen here)
    const skeletons = document.querySelectorAll('[data-testid*="skeleton"]');
    expect(skeletons.length).toBe(0);
  });
});
