/**
 * BossActiveBattleUI Component Tests (Simplified)
 *
 * Tests for the simplified active boss battle UI.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MockMotionDiv({ children, animate, ...rest }: any, ref: any) {
      return <div ref={ref} data-animate={JSON.stringify(animate)} {...rest}>{children}</div>;
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock BossDialogue
vi.mock('../../BossDialogue', () => {
  const MockBossDialogue = (props: any) => {
    return <div data-testid="boss-dialogue" data-visible={props.isVisible} />;
  };
  return { default: MockBossDialogue };
});

import BossActiveBattleUI, { type BossActiveBattleUIProps } from '../BossActiveBattleUI';
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
  phase: 'normal' as BossActiveBattleUIProps['phase'],
  currentTaunt: null as string | null,
};

function renderBattleUI(overrides: Partial<BossActiveBattleUIProps> = {}) {
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
    vi.clearAllMocks();
  });

  describe('Structure', () => {
    it('should render the boss avatar', () => {
      renderBattleUI();
      expect(screen.getByTestId('boss-avatar')).toBeInTheDocument();
    });

    it('should render the HP bar container', () => {
      renderBattleUI();
      expect(screen.getByTestId('boss-hp-bar-container')).toBeInTheDocument();
    });

    it('should render the HP bar fill', () => {
      renderBattleUI();
      expect(screen.getByTestId('boss-hp-bar-fill')).toBeInTheDocument();
    });

    it('should show HP text as current/max', () => {
      renderBattleUI({ currentHP: 80, maxHP: 100 });
      expect(screen.getByText('80/100')).toBeInTheDocument();
    });
  });

  describe('Boss Avatar', () => {
    it('should render boss image when imagePath exists', () => {
      renderBattleUI();
      const avatar = screen.getByTestId('boss-avatar');
      const img = avatar.querySelector('img');
      expect(img).toBeInTheDocument();
    });

    it('should show desperate glow when phase is desperate', () => {
      renderBattleUI({ phase: 'desperate' });
      expect(screen.getByTestId('boss-avatar-desperate-glow')).toBeInTheDocument();
    });

    it('should not show desperate glow during normal phase', () => {
      renderBattleUI({ phase: 'normal' });
      expect(screen.queryByTestId('boss-avatar-desperate-glow')).not.toBeInTheDocument();
    });

    it('should not show desperate glow during angry phase', () => {
      renderBattleUI({ phase: 'angry' });
      expect(screen.queryByTestId('boss-avatar-desperate-glow')).not.toBeInTheDocument();
    });
  });

  describe('HP Bar', () => {
    it('should animate HP bar fill width based on HP percentage', () => {
      renderBattleUI({ currentHP: 50, maxHP: 100 });
      const fill = screen.getByTestId('boss-hp-bar-fill');
      const animate = JSON.parse(fill.getAttribute('data-animate') || '{}');
      expect(animate.width).toBe('50%');
    });

    it('should show 0% when HP is 0', () => {
      renderBattleUI({ currentHP: 0, maxHP: 100 });
      const fill = screen.getByTestId('boss-hp-bar-fill');
      const animate = JSON.parse(fill.getAttribute('data-animate') || '{}');
      expect(animate.width).toBe('0%');
    });

    it('should show 100% when HP is full', () => {
      renderBattleUI({ currentHP: 100, maxHP: 100 });
      const fill = screen.getByTestId('boss-hp-bar-fill');
      const animate = JSON.parse(fill.getAttribute('data-animate') || '{}');
      expect(animate.width).toBe('100%');
    });
  });

  describe('Dialogue', () => {
    it('should render BossDialogue when currentTaunt is set', () => {
      renderBattleUI({ currentTaunt: 'some.taunt.key' });
      expect(screen.getByTestId('boss-dialogue')).toBeInTheDocument();
    });

    it('should not render BossDialogue when currentTaunt is null', () => {
      renderBattleUI({ currentTaunt: null });
      expect(screen.queryByTestId('boss-dialogue')).not.toBeInTheDocument();
    });
  });
});

describe('BossActiveBattleUI neo-brutalist hard chrome (no blur)', () => {
  it('boss HP fill uses hard shadow, not a soft 0 0 glow (desperate phase)', () => {
    const { container } = renderBattleUI({ phase: 'desperate' });
    expect(container.innerHTML).not.toContain('shadow-[0_0');
  });

  it('angry phase HP fill avoids soft glow', () => {
    const { container } = renderBattleUI({ phase: 'angry' });
    expect(container.innerHTML).not.toContain('shadow-[0_0');
  });
});
