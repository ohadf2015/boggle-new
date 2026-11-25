import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/components/tutorial/ModeCoach', () => ({ ModeCoach: () => null }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/hooks/useStuckCoach', () => ({
  useStuckCoach: () => ({ visible: false, markActivity: vi.fn(), markTap: vi.fn(), markDragStart: vi.fn(), markSubmit: vi.fn() }),
}));
const mockUseAdventureRun = vi.fn();
vi.mock('../useAdventureRun', () => ({ useAdventureRun: () => mockUseAdventureRun() }));
vi.mock('../LevelTopBar', () => ({ default: () => null }));
vi.mock('../RunHud', () => ({ default: () => null }));
vi.mock('../stage/LevelStage', () => ({ default: () => null }));
vi.mock('../fx/FoeTarget', () => ({ default: () => null }));
vi.mock('../variants/VariantPanel', () => ({ default: () => null }));
vi.mock('../variants/BoardLayer', () => ({ default: () => null }));
vi.mock('../stage/BoardHazards', () => ({ default: () => null }));
vi.mock('../fx/FoundWords', () => ({ default: () => null }));
vi.mock('../fx/HintButton', () => ({ default: () => null }));
vi.mock('../RunResult', () => ({ default: () => null }));
vi.mock('../DraftOverlay', () => ({ default: () => null }));
vi.mock('../deed/DeedStamp', () => ({ default: () => null }));
vi.mock('../run/RunShellStyles', () => ({ default: () => null }));
vi.mock('../RunStatusOverlay', () => ({ default: () => null }));
vi.mock('../../map/RunMapScreen', () => ({ default: () => null }));
vi.mock('../nodes/NodeScreen', () => ({ default: () => null }));
vi.mock('../stage/RivalAttack', () => ({ default: () => null }));
vi.mock('../fx/BoardFx', () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock('@/components/GridComponent', () => ({ default: () => null }));
vi.mock('../intro/LevelIntro', () => ({ default: () => <div data-testid="level-intro" /> }));

import AdventureLevel from '../AdventureLevel';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import { clearReplay } from '../intro/introReplay';

const lvl = getPlayLevel(1, 1);
const runState = (over: Record<string, unknown>) => ({
  phase: 'ready', grid: [['a', 'b'], ['c', 'd']], lvl, words: [], score: 0, msLeft: 90000, frozen: new Set(), bossHp: 0, boss: null,
  result: null, begin: vi.fn(), retry: vi.fn(), newRun: vi.fn(), map: null, currentNode: 'r0l0', run: null, runShown: null,
  targets: [], targetsFound: [], hp: 5, maxHp: 5, combat: null, combo: 0, points: [], hintsLeft: 0,
  ...over,
});
const lost = { won: false, stars: 0, bestStars: 0, totalStars: 0, rewards: [] };

const props = {
  world: 1, level: 1, hasNext: false, onExit: vi.fn(), onNext: vi.fn(), onSaved: vi.fn(), onEquipSkin: vi.fn(),
  earnAchievement: vi.fn(), totalBossesBeaten: 0, otherPerfectLevels: 0,
};

describe('AdventureLevel — retrying a lost fight', () => {
  beforeEach(() => { clearReplay(); vi.clearAllMocks(); });

  it('given a fresh fight, when it is dealt, then the intro plays and nothing starts on its own', () => {
    const state = runState({});
    mockUseAdventureRun.mockReturnValue(state);
    render(<AdventureLevel {...props} />);
    expect(screen.getByTestId('level-intro')).toBeInTheDocument();
    expect(state.begin).not.toHaveBeenCalled();
  });

  it('given the fight was just lost, when the same fight is dealt again, then it starts without the intro', () => {
    mockUseAdventureRun.mockReturnValue(runState({ phase: 'done', result: lost }));
    const { rerender } = render(<AdventureLevel {...props} />);
    const again = runState({});
    mockUseAdventureRun.mockReturnValue(again);
    rerender(<AdventureLevel {...props} />);
    expect(screen.queryByTestId('level-intro')).toBeNull();
    expect(again.begin).toHaveBeenCalledTimes(1);
  });

  it('given the fight was lost, when a different fight is dealt, then its intro plays', () => {
    mockUseAdventureRun.mockReturnValue(runState({ phase: 'done', result: lost }));
    const { rerender } = render(<AdventureLevel {...props} />);
    mockUseAdventureRun.mockReturnValue(runState({ currentNode: 'r1l0' }));
    rerender(<AdventureLevel {...props} />);
    expect(screen.getByTestId('level-intro')).toBeInTheDocument();
  });
});
