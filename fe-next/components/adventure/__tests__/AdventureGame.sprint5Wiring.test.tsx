/**
 * Sprint 5 — Adventure mode incomplete feature wiring tests.
 *
 * Fix 1: freeRetriesPerWorld gating
 * Fix 2: lootDrops sent in completion API payload
 * Fix 3: retainedScore sent in completion API payload
 * Fix 4: ChapterQuestProgress UI rendered in GameSidebar
 */

import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';

// ─── Shared mocks ────────────────────────────────────────────────
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    coins: 100,
    spendCoins: vi.fn(),
    refreshCoins: vi.fn(),
    awardGameCompletion: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock('@/components/ads/RewardedAdGoldButton', () => ({
  __esModule: true,
  default: () => <div data-testid="rewarded-ad-gold-button">Ad</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    language: 'en',
  }),
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: (_target: unknown, prop: string) => {
      return React.forwardRef(function MotionComponent(props: Record<string, unknown>, ref: React.Ref<unknown>) {
        const { children, initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _wh, whileTap: _wt, ...rest } = props;
        return React.createElement(prop, { ...rest, ref }, children as React.ReactNode);
      });
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Fix 1: LevelCompleteModal shows canRetryFree ────────────────
vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => true,
}));
vi.mock('@/hooks/useParticleBudget', () => ({
  useParticleBudget: () => ({ combo: 0 }),
}));
vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: () => null,
}));
vi.mock('@/lib/adventure/constants', () => ({
  OBJECTIVE_TRANSLATION_KEYS: {},
}));
vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: vi.fn(),
}));
vi.mock('../ui/RollingNumber', () => ({
  RollingNumber: ({ value }: { value: number }) => <span>{value}</span>,
}));
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return actual;
});

import LevelCompleteModal from '../LevelCompleteModal';

describe('Fix 1: LevelCompleteModal canRetryFree prop', () => {
  it('shows free retry label when canRetryFree is true', () => {
    render(
      <LevelCompleteModal
        isOpen={true}
        stars={0}
        score={100}
        objectives={[]}
        levelNumber={1}
        worldNumber={1}
        onContinue={vi.fn()}
        onRetry={vi.fn()}
        onExit={vi.fn()}
        canRetryFree={true}
      />
    );
    expect(screen.getByText(/adventure\.freeRetry/)).toBeTruthy();
  });

  it('shows default retry label when canRetryFree is false', () => {
    render(
      <LevelCompleteModal
        isOpen={true}
        stars={0}
        score={100}
        objectives={[]}
        levelNumber={1}
        worldNumber={1}
        onContinue={vi.fn()}
        onRetry={vi.fn()}
        onExit={vi.fn()}
        canRetryFree={false}
      />
    );
    expect(screen.getByText('adventure.retryLevel')).toBeTruthy();
    expect(screen.queryByText(/adventure\.freeRetry/)).toBeNull();
  });
});

// ─── Fix 2 & 3: useAdventureLevelCompletion sends loot + retainedScore ──
import { useAdventureLevelCompletion } from '../hooks/useAdventureLevelCompletion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
};

vi.mock('@/shared/utils/adventureXpUtils', () => ({
  calculateAdventureXp: () => 100,
}));
vi.mock('@/lib/adventure/lootGenerator', () => ({
  generateLevelLoot: () => [{ type: 'gold_shard', rarity: 'common' }],
}));

describe('Fix 2 & 3: completion payload includes lootDrops and retainedScore', () => {
  it('includes lootDrops and retainedScore in recordCompletion call', () => {
    const recordCompletion = vi.fn();
    const props = {
      gameState: { isComplete: true, stars: 2, score: 500, wordsFound: ['cat', 'hat'], comboCount: 3 },
      timeRemaining: 30,
      timerSeconds: 120,
      levelConfig: { world: 1, level: 2 },
      objectives: [],
      currentLevel: 5,
      upgradeBonuses: { xpBonus: 1, timeBonus: 0, scoreBonus: 1 },
      upgradeEffects: { goldMultiplier: 1, doubleFirstCompletionGold: false, failureGold: 0, longWordGoldBonus: 0 },
      bonusGoldMultiplier: 1,
      awardXp: vi.fn(() => ({ leveledUp: false })),
      addGold: vi.fn(),
      recordAttempt: vi.fn(),
      recordCompletion,
      saveCompletion: vi.fn().mockResolvedValue(true),
      endAIDirector: vi.fn(),
      handleEarnAchievement: vi.fn(() => false),
      pauseGame: vi.fn(),
      showVictory: vi.fn(),
      showDefeat: vi.fn(),
      showLevelComplete: false,
      showVictoryCinematic: false,
      showDefeatCinematic: false,
      isBossLevel: false,
      isBossActive: false,
      bossHealthPhase: 'idle',
      playerIsDead: false,
      endBossBattle: vi.fn(),
      triggerBossTaunt: vi.fn(),
      completeLevel: vi.fn(),
      isFirstCompletion: true,
      retainedScore: 50,
    };

    renderHook(() => useAdventureLevelCompletion(props));

    // recordCompletion should be called with lootDrops and retainedScore
    expect(recordCompletion).toHaveBeenCalled();
    const call = recordCompletion.mock.calls[0][0];
    expect(call).toHaveProperty('lootDrops');
    expect(call).toHaveProperty('retainedScore');
    expect(call.retainedScore).toBe(50);
    expect(Array.isArray(call.lootDrops)).toBe(true);
  });
});

// ─── Fix 4: ChapterQuestProgress component renders in sidebar ───
describe('Fix 4: ChapterQuestProgress component', () => {
  it('renders quest names and progress bars', async () => {
    const { ChapterQuestProgress: QuestProgress } = await import('../ui/ChapterQuestProgress');
    const quests = [
      { id: 'q1', chapterNumber: 1, worldId: 1, type: 'wordCountChapter' as const, titleKey: 'adventure.quest.wordCount', descriptionKey: '', target: 20, reward: { coins: 50, xp: 25 } },
      { id: 'q2', chapterNumber: 1, worldId: 1, type: 'perfectLevels' as const, titleKey: 'adventure.quest.perfectLevels', descriptionKey: '', target: 3, reward: { coins: 100, xp: 50 } },
    ];
    const progress = [
      { questId: 'q1', current: 12, isComplete: false, rewardClaimed: false },
      { questId: 'q2', current: 3, isComplete: true, rewardClaimed: false },
    ];

    render(<QuestProgress quests={quests} progress={progress} />);

    expect(screen.getByTestId('chapter-quest-progress')).toBeTruthy();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
    // Completed quest should show check
    expect(screen.getByTestId('quest-complete-q2')).toBeTruthy();
  });
});
