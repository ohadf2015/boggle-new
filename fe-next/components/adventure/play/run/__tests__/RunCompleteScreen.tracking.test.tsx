import { render } from '@testing-library/react';
import RunCompleteScreen from '../RunCompleteScreen';
import type { RunResult } from '../../useAdventureRun';
import type { PublicRun } from '@/lib/adventure/play/runToken';

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (event: string, data: unknown) => mockTrackGrowthEvent(event, data),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playBossDefeatSound: vi.fn() }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: vi.fn(),
}));

vi.mock('../../SkinSwatch', () => ({ default: () => null }));
vi.mock('../RunStats', () => ({ default: () => null }));
vi.mock('../RunLedger', () => ({ default: () => null }));
vi.mock('../EcosystemRewards', () => ({ default: () => null }));
vi.mock('../BossShareButton', () => ({ default: () => null }));
vi.mock('../RewardChips', () => ({ default: () => null }));
vi.mock('@/components/celebration/BossDefeatFireworks', () => ({ default: () => null }));

const mockRun: PublicRun = {
  node: 'boss',
  path: ['n1', 'boss'],
  words: [],
  score: 100,
  phrase: [],
  hp: 3,
  pockets: { coins: 500 },
};

const mockResult: RunResult = {
  won: true,
  stars: 3,
  bestStars: 3,
  totalStars: 3,
  purseCoins: 500,
  rewards: [],
  validWords: [],
  points: [],
  runComplete: true,
  runOver: false,
};

describe('RunCompleteScreen growth tracking', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
  });

  it('fires adventure_run_ended once per mount with outcome=won', () => {
    render(
      <RunCompleteScreen
        world={1}
        result={mockResult}
        run={mockRun}
        hasNext={false}
        onNext={vi.fn()}
        onMap={vi.fn()}
        onEquipSkin={vi.fn()}
      />
    );

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('adventure_run_ended', expect.objectContaining({
      world: 1,
      outcome: 'won',
      nodesCleared: expect.any(Number),
      purseCoins: 500,
    }));
  });

  it('fires adventure_run_ended exactly once even after rerender', () => {
    const { rerender } = render(
      <RunCompleteScreen
        world={1}
        result={mockResult}
        run={mockRun}
        hasNext={false}
        onNext={vi.fn()}
        onMap={vi.fn()}
        onEquipSkin={vi.fn()}
      />
    );

    const callCountBefore = mockTrackGrowthEvent.mock.calls.length;

    rerender(
      <RunCompleteScreen
        world={1}
        result={mockResult}
        run={mockRun}
        hasNext={false}
        onNext={vi.fn()}
        onMap={vi.fn()}
        onEquipSkin={vi.fn()}
      />
    );

    const callCountAfter = mockTrackGrowthEvent.mock.calls.length;
    expect(callCountAfter).toBe(callCountBefore); // No new calls
  });
});
