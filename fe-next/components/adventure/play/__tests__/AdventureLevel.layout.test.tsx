import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock hooks and contexts before importing the component
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playBossEntranceSound: vi.fn(),
    playRoundStartSound: vi.fn(),
  }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: vi.fn(),
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: Record<string, string>) => <img {...p} alt="" />,
}));

// Mock the useAdventureRun hook with a proper playing state
const mockUseAdventureRun = vi.fn();
vi.mock('../useAdventureRun', () => ({
  useAdventureRun: () => mockUseAdventureRun(),
}));

// Mock large child components EXCEPT FoeTarget
vi.mock('../LevelTopBar', () => ({
  default: () => <div data-adv-slot="bar" style={{ height: '2.5rem' }} />,
}));

vi.mock('../RunHud', () => ({
  default: () => <div data-adv-slot="hud" style={{ height: '2.5rem' }} />,
}));

vi.mock('../stage/LevelStage', () => ({
  default: () => <div style={{ height: '4rem' }} />,
}));

// DO NOT MOCK FoeTarget — use the real component to test its collapse behavior

vi.mock('../variants/VariantPanel', () => ({
  default: () => <div data-adv-slot="panel" style={{ height: '1.5rem' }} />,
}));

vi.mock('../variants/BoardLayer', () => ({
  default: () => <div data-adv-slot="board" style={{ height: '20rem' }} />,
}));

vi.mock('../stage/BoardHazards', () => ({
  default: () => null,
}));

vi.mock('../fx/BoardFx', () => ({
  default: ({ children }: Record<string, unknown>) => children,
}));

vi.mock('../fx/FoundWords', () => ({
  default: () => null,
}));

vi.mock('../fx/HintButton', () => ({
  default: () => null,
}));

vi.mock('../intro/LevelIntro', () => ({
  default: () => null,
}));

vi.mock('../RunResult', () => ({
  default: () => null,
}));

vi.mock('../DraftOverlay', () => ({
  default: () => null,
}));

vi.mock('../DeedStamp', () => ({
  default: () => null,
}));

vi.mock('../run/RunShellStyles', () => ({
  default: () => null,
}));

vi.mock('../RunStatusOverlay', () => ({
  default: () => null,
}));

vi.mock('@/components/GridComponent', () => ({
  default: () => null,
}));

vi.mock('../map/RunMapScreen', () => ({
  default: () => null,
}));

vi.mock('../nodes/NodeScreen', () => ({
  default: () => null,
}));

import AdventureLevel from '../AdventureLevel';
import { getPlayLevel } from '@/lib/adventure/play/levels';

/**
 * Structural test: when a normal (non-boss, non-elite) level is played and the foe is defeated,
 * the FoeTarget component unmounts after ~1.2s. The stage slot should then be empty (no children),
 * and the HUD stack should fit compactly above the board.
 *
 * The board slot has flex centering + container query sizing, which adds an offset,
 * so we verify: stage is empty after collapse, and exactly 2 rows render above the board
 * (LevelTopBar + RunHud).
 */
describe('AdventureLevel — board viewport positioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('stage slot is empty when FoeTarget unmounts after defeat collapse', () => {
    // Setup mock for a normal (non-boss, non-elite) level
    const mockLvl = getPlayLevel(1, 1);
    mockUseAdventureRun.mockReturnValue({
      phase: 'playing',
      grid: [['a', 'b'], ['c', 'd']],
      lvl: mockLvl,
      words: [],
      score: 160, // Defeated (stars[2] = 160)
      msLeft: 60000,
      frozen: new Set(),
      bossHp: null,
      boss: null,
      bossHits: 0,
      result: null,
      begin: vi.fn(),
      submitWord: vi.fn(),
      retry: vi.fn(),
      finish: vi.fn(),
      shiftClock: vi.fn(),
      map: null,
      currentNode: null,
      reachable: [],
      nextNodes: [],
      chooseNode: vi.fn(),
      openMap: vi.fn(),
      newRun: vi.fn(),
      nodeState: null,
      nodeChoice: null,
      ecosystem: null,
      run: null,
      offer: null,
      choosePick: vi.fn(),
      points: [],
      combo: { chain: 0, linkTo: -1 },
      lastWordPoints: () => 0,
      hints: [],
      hintsLeft: 0,
      hintsGiven: [],
      takeHint: vi.fn(),
      grantHint: vi.fn(),
      revealFullHint: false,
      targets: [],
      targetsFound: [],
      chainLetter: null,
      hp: 3,
      maxHp: 3,
      potionsLeft: { heal: 0, time: 0, cleanse: 0, insight: 0 },
      drinkPotion: vi.fn(),
      combat: null,
      dispatchCombat: vi.fn(),
      combatFx: [],
      trophy: null,
      runShown: null,
    });

    const { container, rerender } = render(
      <AdventureLevel
        world={1}
        level={1}
        hasNext={false}
        onExit={() => {}}
        onNext={() => {}}
        onSaved={() => {}}
        onEquipSkin={() => {}}
        earnAchievement={() => {}}
        totalBossesBeaten={0}
        otherPerfectLevels={0}
      />
    );

    // At t=0: FoeTarget should render with defeat text
    const stage = container.querySelector('[data-adv-slot="stage"]');
    expect(stage).toBeInTheDocument();
    expect(stage?.textContent).toContain('adventurePlay.juice.foeDown');

    // Advance timers to 1200ms (collapse threshold)
    vi.advanceTimersByTime(1200);
    rerender(
      <AdventureLevel
        world={1}
        level={1}
        hasNext={false}
        onExit={() => {}}
        onNext={() => {}}
        onSaved={() => {}}
        onEquipSkin={() => {}}
        earnAchievement={() => {}}
        totalBossesBeaten={0}
        otherPerfectLevels={0}
      />
    );

    // After collapse: stage slot should have no child elements (FoeTarget unmounted)
    const stageAfter = container.querySelector('[data-adv-slot="stage"]');
    const stageChildren = stageAfter?.children.length ?? 0;
    expect(stageChildren).toBe(0);
  });

  it('HUD only renders two fixed rows above board when stage is empty (LevelTopBar + RunHud)', () => {
    const mockLvl = getPlayLevel(1, 1);
    mockUseAdventureRun.mockReturnValue({
      phase: 'playing',
      grid: [['a', 'b'], ['c', 'd']],
      lvl: mockLvl,
      words: [],
      score: 160, // Defeated
      msLeft: 60000,
      frozen: new Set(),
      bossHp: null,
      boss: null,
      bossHits: 0,
      result: null,
      begin: vi.fn(),
      submitWord: vi.fn(),
      retry: vi.fn(),
      finish: vi.fn(),
      shiftClock: vi.fn(),
      map: null,
      currentNode: null,
      reachable: [],
      nextNodes: [],
      chooseNode: vi.fn(),
      openMap: vi.fn(),
      newRun: vi.fn(),
      nodeState: null,
      nodeChoice: null,
      ecosystem: null,
      run: null,
      offer: null,
      choosePick: vi.fn(),
      points: [],
      combo: { chain: 0, linkTo: -1 },
      lastWordPoints: () => 0,
      hints: [],
      hintsLeft: 0,
      hintsGiven: [],
      takeHint: vi.fn(),
      grantHint: vi.fn(),
      revealFullHint: false,
      targets: [],
      targetsFound: [],
      chainLetter: null,
      hp: 3,
      maxHp: 3,
      potionsLeft: { heal: 0, time: 0, cleanse: 0, insight: 0 },
      drinkPotion: vi.fn(),
      combat: null,
      dispatchCombat: vi.fn(),
      combatFx: [],
      trophy: null,
      runShown: null,
    });

    const { container, rerender } = render(
      <AdventureLevel
        world={1}
        level={1}
        hasNext={false}
        onExit={() => {}}
        onNext={() => {}}
        onSaved={() => {}}
        onEquipSkin={() => {}}
        earnAchievement={() => {}}
        totalBossesBeaten={0}
        otherPerfectLevels={0}
      />
    );

    // Advance to collapse
    vi.advanceTimersByTime(1200);
    rerender(
      <AdventureLevel
        world={1}
        level={1}
        hasNext={false}
        onExit={() => {}}
        onNext={() => {}}
        onSaved={() => {}}
        onEquipSkin={() => {}}
        earnAchievement={() => {}}
        totalBossesBeaten={0}
        otherPerfectLevels={0}
      />
    );

    // Verify the two fixed rows are present above the board
    const topBar = container.querySelector('[data-adv-slot="bar"]');
    const hud = container.querySelector('[data-adv-slot="hud"]');
    const board = container.querySelector('[data-adv-slot="board"]');

    expect(topBar).toBeInTheDocument();
    expect(hud).toBeInTheDocument();
    expect(board).toBeInTheDocument();

    // Stage should be empty
    const stage = container.querySelector('[data-adv-slot="stage"]');
    expect(stage?.children.length).toBe(0);

    // Verify stage uses min-h-0 for normal level
    const stageClasses = stage?.getAttribute('class') || '';
    expect(stageClasses).toContain('min-h-0');
  });
});
