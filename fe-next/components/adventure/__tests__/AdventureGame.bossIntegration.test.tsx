/**
 * AdventureGame Boss Battle Integration Tests
 *
 * Tests the complete boss battle flow including:
 * - Boss level detection
 * - Boss intro modal
 * - Boss HP bar during battle
 * - Boss dialogue/taunts
 * - Victory/defeat screens
 * - Non-boss levels unaffected
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AdventureGame from '../AdventureGame';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ProgressionProvider } from '@/contexts/ProgressionContext';
import { AdventureThemeProvider } from '@/contexts/AdventureThemeContext';
import type { LevelConfig } from '@/types/adventure';

// Mock hooks
jest.mock('@/hooks/useAdventureGame');
jest.mock('@/hooks/useAdventureWordValidation');
jest.mock('@/hooks/useAdventureSelection');
jest.mock('@/hooks/useLexiReactions');
jest.mock('@/hooks/useAdventureHints');
jest.mock('@/hooks/useBossMechanics');
jest.mock('@/hooks/useBossHealth');

import { useAdventureGame } from '@/hooks/useAdventureGame';
import { useAdventureWordValidation } from '@/hooks/useAdventureWordValidation';
import { useAdventureSelection } from '@/hooks/useAdventureSelection';
import { useLexiReactions } from '@/hooks/useLexiReactions';
import { useAdventureHints } from '@/hooks/useAdventureHints';
import { useBossMechanics } from '@/hooks/useBossMechanics';
import { useBossHealth } from '@/hooks/useBossHealth';

// Type the mocks
const mockUseAdventureGame = useAdventureGame as jest.MockedFunction<typeof useAdventureGame>;
const mockUseAdventureWordValidation = useAdventureWordValidation as jest.MockedFunction<typeof useAdventureWordValidation>;
const mockUseAdventureSelection = useAdventureSelection as jest.MockedFunction<typeof useAdventureSelection>;
const mockUseLexiReactions = useLexiReactions as jest.MockedFunction<typeof useLexiReactions>;
const mockUseAdventureHints = useAdventureHints as jest.MockedFunction<typeof useAdventureHints>;
const mockUseBossMechanics = useBossMechanics as jest.MockedFunction<typeof useBossMechanics>;
const mockUseBossHealth = useBossHealth as jest.MockedFunction<typeof useBossHealth>;

// Helper function to wrap component with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <LanguageProvider>
      <ProgressionProvider>
        <AdventureThemeProvider>{ui}</AdventureThemeProvider>
      </ProgressionProvider>
    </LanguageProvider>
  );
}

// Test data
const createBossLevelConfig = (): LevelConfig => ({
  world: 1,
  level: 7,
  gridSize: 4,
  objectives: [
    { type: 'scoreTarget', target: 500, current: 0, completed: false, required: true },
  ],
  timerSeconds: 120,
  difficulty: 5,
  isBossLevel: true,
  showBossIntro: true,
  specialTiles: [],
  chapterNumber: 1,
  levelInChapter: 7,
});

const createRegularLevelConfig = (): LevelConfig => ({
  world: 1,
  level: 3,
  gridSize: 4,
  objectives: [
    { type: 'scoreTarget', target: 300, current: 0, completed: false, required: true },
  ],
  timerSeconds: 90,
  difficulty: 3,
  isBossLevel: false,
  specialTiles: [],
  chapterNumber: 1,
  levelInChapter: 3,
});

const mockGrid = [
  ['T', 'E', 'S', 'T'],
  ['W', 'O', 'R', 'D'],
  ['G', 'A', 'M', 'E'],
  ['F', 'L', 'O', 'W'],
];

const mockBossConfig = {
  id: 'ms-grammar',
  worldId: 1,
  displayName: 'adventure.bosses.msGrammar.name',
  personality: 'Strict English teacher',
  visualTheme: 'academia',
  imagePath: '/images/bosses/ms-grammar.png',
  twistMechanic: {
    type: 'popQuiz' as const,
    description: 'adventure.bosses.msGrammar.mechanic',
    params: {},
  },
  taunts: {
    onStart: ['adventure.bosses.msGrammar.tauntStart'],
    onGoodWord: ['adventure.bosses.msGrammar.tauntGood'],
    onBadWord: ['adventure.bosses.msGrammar.tauntBad'],
    onMechanic: ['adventure.bosses.msGrammar.tauntMechanic'],
    onLowTime: ['adventure.bosses.msGrammar.tauntLowTime'],
    onVictory: 'adventure.bosses.msGrammar.tauntVictory',
    onDefeat: 'adventure.bosses.msGrammar.tauntDefeat',
  },
};

describe('AdventureGame - Boss Battle Integration', () => {
  let mockDealDamage: jest.Mock;
  let mockStartBattle: jest.Mock;
  let mockEndBattle: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    mockDealDamage = jest.fn().mockReturnValue(10);
    mockStartBattle = jest.fn();
    mockEndBattle = jest.fn();

    // Default game hook mock
    mockUseAdventureGame.mockReturnValue({
      gameState: {
        score: 0,
        wordsFound: [],
        objectives: [],
        isComplete: false,
        stars: 0,
        comboCount: 0,
      },
      tiles: mockGrid.flat().map((letter, idx) => ({
        id: `tile-${idx}`,
        letter,
        isSelected: false,
        isFound: false,
        isHighlighted: false,
        value: 1,
        row: Math.floor(idx / 4),
        col: idx % 4,
      })),
      objectives: [
        { type: 'scoreTarget', target: 500, current: 0, completed: false, required: true },
      ],
      submitWordWithPath: jest.fn(),
      resetGame: jest.fn(),
      clearCombo: jest.fn(),
    });

    // Validation hook mock
    mockUseAdventureWordValidation.mockReturnValue({
      validateWord: jest.fn().mockResolvedValue({ isValid: true, score: 50 }),
      isValidating: false,
    });

    // Selection hook mock
    mockUseAdventureSelection.mockReturnValue({
      selectedIndices: [],
      currentWord: '',
      selectTile: jest.fn(),
      clearSelection: jest.fn(),
      getPath: jest.fn().mockReturnValue([]),
      pathPoints: [],
    });

    // Lexi reactions mock
    mockUseLexiReactions.mockReturnValue({
      reaction: null,
      dismissReaction: jest.fn(),
    });

    // Hints mock
    mockUseAdventureHints.mockReturnValue({
      hasHintsAvailable: false,
      getHint: jest.fn(),
      currentHint: null,
      clearCurrentHint: jest.fn(),
      recordActivity: jest.fn(),
      showAutoHint: false,
      dismissAutoHint: jest.fn(),
    });

    // Boss mechanics mock (inactive by default)
    mockUseBossMechanics.mockReturnValue({
      isActive: false,
      boss: null,
      currentTaunt: null,
      showTaunt: false,
      checkWord: jest.fn().mockReturnValue({
        meetsRequirement: false,
        scoreMultiplier: 1.0,
      }),
      triggerTaunt: jest.fn(),
      advancePhase: jest.fn(),
      bossState: {
        currentTauntIndex: 0,
        lastTauntTime: 0,
        mechanicState: {},
        introShown: false,
        isActive: false,
      },
    });

    // Boss health mock (intro phase by default)
    mockUseBossHealth.mockReturnValue({
      healthState: {
        currentHP: 100,
        maxHP: 100,
        phase: 'intro',
        totalDamageDealt: 0,
        isActive: false,
      },
      dealDamage: mockDealDamage,
      startBattle: mockStartBattle,
      endBattle: mockEndBattle,
      resetHealth: jest.fn(),
      hpPercentage: 100,
      isEnraged: false,
    });
  });

  // ==============================================
  // BOSS LEVEL DETECTION
  // ==============================================

  describe('Boss Level Detection', () => {
    it('should detect boss level from config', () => {
      const levelConfig = createBossLevelConfig();

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // useBossMechanics should be called with worldId
      expect(mockUseBossMechanics).toHaveBeenCalledWith(
        expect.objectContaining({ worldId: 1 })
      );

      // useBossHealth should be called with maxHP
      expect(mockUseBossHealth).toHaveBeenCalledWith(100);
    });

    it('should NOT activate boss mechanics for regular levels', () => {
      const levelConfig = createRegularLevelConfig();

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // useBossMechanics should be called with null worldId
      expect(mockUseBossMechanics).toHaveBeenCalledWith(
        expect.objectContaining({ worldId: null })
      );
    });
  });

  // ==============================================
  // BOSS INTRO FLOW
  // ==============================================

  describe('Boss Intro', () => {
    it('should show BossIntro modal for boss levels', async () => {
      const levelConfig = createBossLevelConfig();

      // Configure boss mechanics to be active with boss config
      mockUseBossMechanics.mockReturnValue({
        isActive: true,
        boss: mockBossConfig,
        currentTaunt: null,
        showTaunt: false,
        checkWord: jest.fn().mockReturnValue({
          meetsRequirement: false,
          scoreMultiplier: 1.0,
        }),
        triggerTaunt: jest.fn(),
        advancePhase: jest.fn(),
        bossState: {
          currentTauntIndex: 0,
          lastTauntTime: 0,
          mechanicState: {},
          introShown: false,
          isActive: true,
        },
      });

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // Wait for intro to render
      await waitFor(() => {
        // BossIntro should be visible
        const introDialog = screen.getByRole('dialog', { name: /boss/i });
        expect(introDialog).toBeInTheDocument();
      });
    });

    it('should start battle when player clicks Ready to Fight', async () => {
      const user = userEvent.setup();
      const levelConfig = createBossLevelConfig();

      mockUseBossMechanics.mockReturnValue({
        isActive: true,
        boss: mockBossConfig,
        currentTaunt: null,
        showTaunt: false,
        checkWord: jest.fn().mockReturnValue({
          meetsRequirement: false,
          scoreMultiplier: 1.0,
        }),
        triggerTaunt: jest.fn(),
        advancePhase: jest.fn(),
        bossState: {
          currentTauntIndex: 0,
          lastTauntTime: 0,
          mechanicState: {},
          introShown: false,
          isActive: true,
        },
      });

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // Wait for intro
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click Ready to Fight button
      const fightButton = screen.getByRole('button', { name: /ready to fight/i });
      await user.click(fightButton);

      // startBattle should be called
      expect(mockStartBattle).toHaveBeenCalled();
    });

    it('should skip intro when player clicks Skip', async () => {
      const user = userEvent.setup();
      const levelConfig = createBossLevelConfig();

      mockUseBossMechanics.mockReturnValue({
        isActive: true,
        boss: mockBossConfig,
        currentTaunt: null,
        showTaunt: false,
        checkWord: jest.fn().mockReturnValue({
          meetsRequirement: false,
          scoreMultiplier: 1.0,
        }),
        triggerTaunt: jest.fn(),
        advancePhase: jest.fn(),
        bossState: {
          currentTauntIndex: 0,
          lastTauntTime: 0,
          mechanicState: {},
          introShown: false,
          isActive: true,
        },
      });

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // Wait for intro
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click Skip button
      const skipButton = screen.getByRole('button', { name: /skip intro/i });
      await user.click(skipButton);

      // startBattle should be called
      expect(mockStartBattle).toHaveBeenCalled();
    });
  });

  // ==============================================
  // BOSS HP BAR
  // ==============================================

  describe('Boss HP Bar', () => {
    it('should show HP bar during active phase', () => {
      const levelConfig = createBossLevelConfig();
      levelConfig.showBossIntro = false; // Skip intro

      mockUseBossMechanics.mockReturnValue({
        isActive: true,
        boss: mockBossConfig,
        currentTaunt: null,
        showTaunt: false,
        checkWord: jest.fn().mockReturnValue({
          meetsRequirement: false,
          scoreMultiplier: 1.0,
        }),
        triggerTaunt: jest.fn(),
        advancePhase: jest.fn(),
        bossState: {
          currentTauntIndex: 0,
          lastTauntTime: 0,
          mechanicState: {},
          introShown: true,
          isActive: true,
        },
      });

      // Active phase
      mockUseBossHealth.mockReturnValue({
        healthState: {
          currentHP: 75,
          maxHP: 100,
          phase: 'active',
          totalDamageDealt: 25,
          isActive: true,
        },
        dealDamage: mockDealDamage,
        startBattle: mockStartBattle,
        endBattle: mockEndBattle,
        resetHealth: jest.fn(),
        hpPercentage: 75,
        isEnraged: false,
      });

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // HP bar should be visible
      const hpBar = screen.getByRole('status', { name: /health/i });
      expect(hpBar).toBeInTheDocument();
      expect(screen.getByText(/75.*100/)).toBeInTheDocument();
    });

    it('should NOT show HP bar during intro phase', () => {
      const levelConfig = createBossLevelConfig();

      mockUseBossMechanics.mockReturnValue({
        isActive: true,
        boss: mockBossConfig,
        currentTaunt: null,
        showTaunt: false,
        checkWord: jest.fn().mockReturnValue({
          meetsRequirement: false,
          scoreMultiplier: 1.0,
        }),
        triggerTaunt: jest.fn(),
        advancePhase: jest.fn(),
        bossState: {
          currentTauntIndex: 0,
          lastTauntTime: 0,
          mechanicState: {},
          introShown: false,
          isActive: true,
        },
      });

      // Intro phase
      mockUseBossHealth.mockReturnValue({
        healthState: {
          currentHP: 100,
          maxHP: 100,
          phase: 'intro',
          totalDamageDealt: 0,
          isActive: false,
        },
        dealDamage: mockDealDamage,
        startBattle: mockStartBattle,
        endBattle: mockEndBattle,
        resetHealth: jest.fn(),
        hpPercentage: 100,
        isEnraged: false,
      });

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // HP bar should NOT be visible (hidden during intro)
      const hpBar = screen.queryByRole('status', { name: /health/i });
      expect(hpBar).not.toBeInTheDocument();
    });
  });

  // ==============================================
  // VICTORY/DEFEAT SCREENS
  // ==============================================

  describe('Boss Victory/Defeat', () => {
    it('should show BossVictory on victory', async () => {
      const levelConfig = createBossLevelConfig();
      levelConfig.showBossIntro = false;

      mockUseBossMechanics.mockReturnValue({
        isActive: true,
        boss: mockBossConfig,
        currentTaunt: null,
        showTaunt: false,
        checkWord: jest.fn().mockReturnValue({
          meetsRequirement: false,
          scoreMultiplier: 1.0,
        }),
        triggerTaunt: jest.fn(),
        advancePhase: jest.fn(),
        bossState: {
          currentTauntIndex: 0,
          lastTauntTime: 0,
          mechanicState: {},
          introShown: true,
          isActive: true,
        },
      });

      // Victory phase
      mockUseBossHealth.mockReturnValue({
        healthState: {
          currentHP: 0,
          maxHP: 100,
          phase: 'victory',
          totalDamageDealt: 100,
          isActive: false,
        },
        dealDamage: mockDealDamage,
        startBattle: mockStartBattle,
        endBattle: mockEndBattle,
        resetHealth: jest.fn(),
        hpPercentage: 0,
        isEnraged: false,
      });

      // Complete game state
      mockUseAdventureGame.mockReturnValue({
        gameState: {
          score: 600,
          wordsFound: ['TEST', 'WORD'],
          objectives: [],
          isComplete: true,
          stars: 3,
          comboCount: 0,
        },
        tiles: mockGrid.flat().map((letter, idx) => ({
          id: `tile-${idx}`,
          letter,
          isSelected: false,
          isFound: false,
          isHighlighted: false,
          value: 1,
          row: Math.floor(idx / 4),
          col: idx % 4,
        })),
        objectives: [
          { type: 'scoreTarget', target: 500, current: 600, completed: true, required: true },
        ],
        submitWordWithPath: jest.fn(),
        resetGame: jest.fn(),
        clearCombo: jest.fn(),
      });

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // BossVictory should be visible
      await waitFor(() => {
        const victoryDialog = screen.getByRole('dialog', { name: /boss defeated/i });
        expect(victoryDialog).toBeInTheDocument();
      });
    });

    it('should show BossVictory on defeat', async () => {
      const levelConfig = createBossLevelConfig();
      levelConfig.showBossIntro = false;

      mockUseBossMechanics.mockReturnValue({
        isActive: true,
        boss: mockBossConfig,
        currentTaunt: null,
        showTaunt: false,
        checkWord: jest.fn().mockReturnValue({
          meetsRequirement: false,
          scoreMultiplier: 1.0,
        }),
        triggerTaunt: jest.fn(),
        advancePhase: jest.fn(),
        bossState: {
          currentTauntIndex: 0,
          lastTauntTime: 0,
          mechanicState: {},
          introShown: true,
          isActive: true,
        },
      });

      // Defeat phase
      mockUseBossHealth.mockReturnValue({
        healthState: {
          currentHP: 50,
          maxHP: 100,
          phase: 'defeat',
          totalDamageDealt: 50,
          isActive: false,
        },
        dealDamage: mockDealDamage,
        startBattle: mockStartBattle,
        endBattle: mockEndBattle,
        resetHealth: jest.fn(),
        hpPercentage: 50,
        isEnraged: false,
      });

      // Failed game state (time expired)
      mockUseAdventureGame.mockReturnValue({
        gameState: {
          score: 200,
          wordsFound: ['TEST'],
          objectives: [],
          isComplete: false,
          stars: 0,
          comboCount: 0,
        },
        tiles: mockGrid.flat().map((letter, idx) => ({
          id: `tile-${idx}`,
          letter,
          isSelected: false,
          isFound: false,
          isHighlighted: false,
          value: 1,
          row: Math.floor(idx / 4),
          col: idx % 4,
        })),
        objectives: [
          { type: 'scoreTarget', target: 500, current: 200, completed: false, required: true },
        ],
        submitWordWithPath: jest.fn(),
        resetGame: jest.fn(),
        clearCombo: jest.fn(),
      });

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // BossVictory should be visible with defeat message
      await waitFor(() => {
        const defeatDialog = screen.getByRole('dialog', { name: /boss wins/i });
        expect(defeatDialog).toBeInTheDocument();
      });
    });
  });

  // ==============================================
  // NON-BOSS LEVELS
  // ==============================================

  describe('Non-Boss Levels', () => {
    it('should NOT show boss components for regular levels', () => {
      const levelConfig = createRegularLevelConfig();

      mockUseBossMechanics.mockReturnValue({
        isActive: false,
        boss: null,
        currentTaunt: null,
        showTaunt: false,
        checkWord: jest.fn().mockReturnValue({
          meetsRequirement: false,
          scoreMultiplier: 1.0,
        }),
        triggerTaunt: jest.fn(),
        advancePhase: jest.fn(),
        bossState: {
          currentTauntIndex: 0,
          lastTauntTime: 0,
          mechanicState: {},
          introShown: false,
          isActive: false,
        },
      });

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // NO boss intro
      expect(screen.queryByRole('dialog', { name: /boss/i })).not.toBeInTheDocument();

      // NO HP bar
      expect(screen.queryByRole('status', { name: /health/i })).not.toBeInTheDocument();
    });

    it('should show LevelCompleteModal for regular levels', async () => {
      const levelConfig = createRegularLevelConfig();

      mockUseBossMechanics.mockReturnValue({
        isActive: false,
        boss: null,
        currentTaunt: null,
        showTaunt: false,
        checkWord: jest.fn().mockReturnValue({
          meetsRequirement: false,
          scoreMultiplier: 1.0,
        }),
        triggerTaunt: jest.fn(),
        advancePhase: jest.fn(),
        bossState: {
          currentTauntIndex: 0,
          lastTauntTime: 0,
          mechanicState: {},
          introShown: false,
          isActive: false,
        },
      });

      // Complete game state
      mockUseAdventureGame.mockReturnValue({
        gameState: {
          score: 400,
          wordsFound: ['TEST', 'WORD'],
          objectives: [],
          isComplete: true,
          stars: 2,
          comboCount: 0,
        },
        tiles: mockGrid.flat().map((letter, idx) => ({
          id: `tile-${idx}`,
          letter,
          isSelected: false,
          isFound: false,
          isHighlighted: false,
          value: 1,
          row: Math.floor(idx / 4),
          col: idx % 4,
        })),
        objectives: [
          { type: 'scoreTarget', target: 300, current: 400, completed: true, required: true },
        ],
        submitWordWithPath: jest.fn(),
        resetGame: jest.fn(),
        clearCombo: jest.fn(),
      });

      renderWithProviders(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={mockGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // LevelCompleteModal should be visible (not BossVictory)
      await waitFor(() => {
        // Look for standard level complete elements
        expect(screen.getByText(/level.*complete/i)).toBeInTheDocument();
      });
    });
  });
});
