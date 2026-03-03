/**
 * BossActiveBattleUI Component Tests
 *
 * Tests for the active boss battle UI extracted from BossOverlay.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(function MockMotionDiv({ children, animate, ...rest }: any, ref: any) {
      return <div ref={ref} data-animate={JSON.stringify(animate)} {...rest}>{children}</div>;
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the theme context
const mockUseBossFightTheme = jest.fn().mockReturnValue({
  dialogueBg: 'bg-neo-navy/95',
  dialogueBorder: 'border-neo-white/20',
  bossNameColor: 'text-neo-red',
  hpSegmentColors: ['bg-neo-red', 'bg-neo-orange', 'bg-neo-lime'],
  telegraphColor: 'bg-neo-red/20',
  telegraphProgressColor: 'bg-neo-red',
  playerHealthNormal: 'bg-neo-lime',
  playerHealthLow: 'bg-neo-red',
  phaseColors: {
    phase1: { bg: 'bg-neo-lime/20', text: 'text-neo-lime' },
    phase2: { bg: 'bg-neo-orange/20', text: 'text-neo-orange' },
    enraged: { bg: 'bg-neo-red/20', text: 'text-neo-red' },
  },
  avatarGlow: 'rgba(239, 68, 68, 0.4)',
  victoryGlow: 'rgba(163, 230, 53, 0.6)',
  arenaEffect: 'none',
});
jest.mock('@/contexts/AdventureThemeContext', () => ({
  useBossFightTheme: () => mockUseBossFightTheme(),
}));

// Mock sub-components
jest.mock('../SegmentedHPBar', () => {
  return function MockSegmentedHPBar(props: any) {
    return <div data-testid="segmented-hp-bar" data-current-hp={props.currentHP} data-phase={props.phase} />;
  };
});

jest.mock('../../BossDialogue', () => {
  return function MockBossDialogue(props: any) {
    return <div data-testid="boss-dialogue" data-visible={props.isVisible} />;
  };
});

jest.mock('../AttackTelegraph', () => ({
  AttackTelegraph: function MockAttackTelegraph(props: any) {
    return <div data-testid="attack-telegraph" data-active={props.isActive} />;
  },
}));

import BossActiveBattleUI from '../BossActiveBattleUI';
import type { BossConfig } from '@/types/boss';

// ==============================================
// FIXTURES
// ==============================================

const mockBoss: Partial<BossConfig> = {
  id: 'ms-grammar',
  displayName: 'adventure.bosses.msGrammar.name',
  imagePath: '/images/bosses/ms-grammar.png',
};

const defaultProps = {
  boss: mockBoss as BossConfig,
  currentHP: 80,
  maxHP: 100,
  phase: 'phase1' as 'phase1' | 'phase2' | 'enraged',
  bossReaction: 'idle' as 'idle' | 'attacking' | 'hit',
  showTaunt: false,
  currentTaunt: null as string | null,
  isTelegraphing: false,
  telegraphState: {
    progress: 0,
    targetTiles: [] as number[],
    abilityId: null as string | null,
    timeRemaining: 0,
  },
  telegraphingAbility: null,
  attackEffect: null,
};

function renderBattleUI(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(
    <LanguageProvider initialLanguage="en">
      <BossActiveBattleUI {...props} />
    </LanguageProvider>
  );
}

// ==============================================
// TESTS
// ==============================================

describe('BossActiveBattleUI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Structure', () => {
    it('should render the boss avatar', () => {
      renderBattleUI();
      expect(screen.getByTestId('boss-avatar')).toBeInTheDocument();
    });

    it('should render the HP bar', () => {
      renderBattleUI();
      expect(screen.getByTestId('segmented-hp-bar')).toBeInTheDocument();
    });

    it('should pass currentHP and phase to HP bar', () => {
      renderBattleUI({ currentHP: 50, phase: 'phase2' });
      const hpBar = screen.getByTestId('segmented-hp-bar');
      expect(hpBar).toHaveAttribute('data-current-hp', '50');
      expect(hpBar).toHaveAttribute('data-phase', 'phase2');
    });
  });

  describe('Boss Avatar', () => {
    it('should render boss image when imagePath exists', () => {
      renderBattleUI();
      const avatar = screen.getByTestId('boss-avatar');
      const img = avatar.querySelector('img');
      expect(img).toBeInTheDocument();
    });

    it('should show enraged glow when phase is enraged', () => {
      renderBattleUI({ phase: 'enraged' });
      expect(screen.getByTestId('boss-avatar-enraged-glow')).toBeInTheDocument();
    });

    it('should not show enraged glow during phase1', () => {
      renderBattleUI({ phase: 'phase1' });
      expect(screen.queryByTestId('boss-avatar-enraged-glow')).not.toBeInTheDocument();
    });
  });

  describe('Dialogue', () => {
    it('should render BossDialogue when showTaunt is true', () => {
      renderBattleUI({ showTaunt: true, currentTaunt: 'some.taunt.key' });
      expect(screen.getByTestId('boss-dialogue')).toBeInTheDocument();
    });

    it('should not render BossDialogue when showTaunt is false', () => {
      renderBattleUI({ showTaunt: false });
      expect(screen.queryByTestId('boss-dialogue')).not.toBeInTheDocument();
    });
  });

  describe('Attack Telegraph', () => {
    it('should render AttackTelegraph', () => {
      renderBattleUI();
      expect(screen.getByTestId('attack-telegraph')).toBeInTheDocument();
    });

    it('should pass isTelegraphing to AttackTelegraph', () => {
      renderBattleUI({ isTelegraphing: true });
      expect(screen.getByTestId('attack-telegraph')).toHaveAttribute('data-active', 'true');
    });
  });

  describe('Attack Effect', () => {
    it('should render attack effect when present', () => {
      renderBattleUI({
        attackEffect: { abilityName: 'Scramble', damage: 15 } as any,
      });
      expect(screen.getByTestId('boss-attack-effect')).toBeInTheDocument();
    });

    it('should show damage number in attack effect', () => {
      renderBattleUI({
        attackEffect: { abilityName: 'Scramble', damage: 25 } as any,
      });
      expect(screen.getByText('-25')).toBeInTheDocument();
    });

    it('should not render attack effect when null', () => {
      renderBattleUI({ attackEffect: null });
      expect(screen.queryByTestId('boss-attack-effect')).not.toBeInTheDocument();
    });
  });
});
