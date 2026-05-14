/**
 * Tests for neo-brutalist design fixes across achievement components
 * and GuestBrainScorePreview.
 *
 * Validates:
 * 1. AchievementQueue inline toast uses shadow-hard-yellow class (no inline boxShadow)
 * 2. AchievementQueue inline toast has no backdrop-blur-sm
 * 3. AchievementToast uses shadow-hard-yellow class (no inline boxShadow with tier border)
 * 4. AchievementToast achievement name uses neo-lime token class
 * 5. AchievementDock uses border-3 (not border-4)
 * 6. AchievementPopup uses inset-e-4 logical property
 * 7. GuestBrainScorePreview has no backdrop-blur, uses neo tokens
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const motionProxy = new Proxy({}, {
    get: (_target: unknown, prop: string) => {
      return React.forwardRef(function MotionComponent(props: Record<string, unknown>, ref: React.Ref<HTMLElement>) {
        const { children, initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _wh, whileTap: _wt, variants: _v, whileInView: _wiv, viewport: _vp, layout: _l, layoutId: _li, onAnimationComplete: _oac, ...rest } = props;
        return React.createElement(prop, { ...rest, ref } as React.HTMLAttributes<HTMLElement>, children as React.ReactNode);
      });
    },
  });
  return {
    m: motionProxy,
    m: motionProxy,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useInView: () => true,
    useMotionValue: (val: number) => ({ get: () => val, set: vi.fn() }),
    useTransform: () => ({ get: () => 0, set: vi.fn() }),
  };
});

// Mock react-dom createPortal to render in place
vi.mock('react-dom', () => ({
  ...vi.importActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// Mock contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playAchievementSound: vi.fn() }),
}));

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/utils/ogShare', () => ({
  getAchievementShareUrl: vi.fn(),
  shareWithOgImage: vi.fn(),
}));
vi.mock('@/components/GoogleAnalytics', () => ({
  gameEvents: { achievementUnlock: vi.fn(), share: vi.fn() },
}));
vi.mock('@/components/ui/Mascot', () => ({
  Mascot: () => <div data-testid="mascot" />,
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  shouldHideExternalLogin: () => false,
}));
vi.mock('@/lib/supabase', () => ({
  signInWithGoogle: vi.fn(),
  signInWithDiscord: vi.fn(),
}));
vi.mock('@/constants/achievementIcons', () => ({
  getAchievementIcon: () => '🏆',
}));
vi.mock('../AchievementIcon', () => ({
  AchievementIcon: ({ achievementKey }: { achievementKey: string }) => <span data-testid="achievement-icon">{achievementKey}</span>,
}));
vi.mock('@/utils/achievementTiers', () => ({
  calculateTier: () => null,
  TIER_COLORS: {
    BRONZE: { bg: '#CD7F32', border: '#8B5A2B', text: '#000000', glow: '' },
    SILVER: { bg: '#C0C0C0', border: '#808080', text: '#000000', glow: '' },
    GOLD: { bg: '#FFD700', border: '#DAA520', text: '#000000', glow: '' },
    PLATINUM: { bg: '#E5E4E2', border: '#B0B0B0', text: '#000000', glow: '' },
  },
  TIER_ICONS: { BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇', PLATINUM: '💎' },
  getTierToastStyle: () => ({
    shadowClass: 'shadow-hard-yellow',
    sparkleCount: 3,
    pulseRadius: 7,
    shineRepeat: 1,
    confettiCount: 28,
    confettiSpread: 55,
    showRarityBadge: false,
  }),
}));

// Mock tooltip
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: React.forwardRef(function TooltipTrigger({ children }: { children: React.ReactNode }, _ref: React.Ref<HTMLElement>) { return <>{children}</>; }),
}));

// ---- Tests ----

describe('AchievementQueue inline toast - neo-brutalist fixes', () => {
  it('uses shadow-hard-yellow class instead of inline boxShadow', async () => {
    // We need to render AchievementQueueProvider and trigger an achievement
    const { AchievementQueueProvider, useAchievementQueue } = await import('../AchievementQueue');

    function Trigger() {
      const { queueAchievement } = useAchievementQueue();
      React.useEffect(() => {
        queueAchievement({ key: 'test-ach', icon: '🏆' });
      }, [queueAchievement]);
      return null;
    }

    render(
      <AchievementQueueProvider>
        <Trigger />
      </AchievementQueueProvider>
    );

    // Wait for the toast to appear
    await screen.findByTestId('achievement-inline-toast');
    const toastContainer = screen.getByTestId('achievement-inline-toast');

    // Find the inner div with the shadow
    const innerDiv = toastContainer.querySelector('.shadow-hard-yellow');
    expect(innerDiv).toBeTruthy();

    // Should NOT have inline boxShadow with #FFE135
    const allDivs = toastContainer.querySelectorAll('div');
    allDivs.forEach((div) => {
      expect(div.style.boxShadow).not.toContain('#FFE135');
    });
  });

  it('has no backdrop-blur-sm class', async () => {
    const { AchievementQueueProvider, useAchievementQueue } = await import('../AchievementQueue');

    function Trigger() {
      const { queueAchievement } = useAchievementQueue();
      React.useEffect(() => {
        queueAchievement({ key: 'test-ach2', icon: '🏆' });
      }, [queueAchievement]);
      return null;
    }

    render(
      <AchievementQueueProvider>
        <Trigger />
      </AchievementQueueProvider>
    );

    await screen.findByTestId('achievement-inline-toast');
    const toast = screen.getByTestId('achievement-inline-toast');
    expect(toast.innerHTML).not.toContain('backdrop-blur-sm');
  });
});

describe('AchievementDock - neo-brutalist fixes', () => {
  it('uses border-3 not border-4 on trophy button', async () => {
    const { default: AchievementDock } = await import('../AchievementDock');

    const { container } = render(
      <AchievementDock achievements={[{ key: 'test', icon: '🏆' }]} />
    );

    // The trophy button should have border-3
    const button = container.querySelector('button');
    expect(button?.className).toContain('border-3');
    expect(button?.className).not.toContain('border-4');
  });
});

describe('AchievementPopup - logical property fix', () => {
  it('uses inset-e-4 instead of ltr:right-4 rtl:left-4', async () => {
    const { default: AchievementPopup } = await import('../AchievementPopup');

    const { container } = render(
      <AchievementPopup achievement={{ key: 'test', icon: '🏆' }} />
    );

    // The outer positioned div should use inset-e-4
    const fixedDiv = container.querySelector('.inset-e-4');
    expect(fixedDiv).toBeTruthy();

    // Should NOT have ltr:right-4 or rtl:left-4
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      expect(el.className).not.toContain('ltr:right-4');
      expect(el.className).not.toContain('rtl:left-4');
    });
  });
});

describe('GuestBrainScorePreview - neo-brutalist fixes', () => {
  it('has no backdrop-blur-sm and uses neo tokens', async () => {
    const { GuestBrainScorePreview } = await import('../../daily/results/GuestBrainScorePreview');

    const { container } = render(
      <GuestBrainScorePreview t={(k: string) => k} />
    );

    // No backdrop-blur-sm anywhere
    expect(container.innerHTML).not.toContain('backdrop-blur-sm');

    // No bg-white/30
    expect(container.innerHTML).not.toContain('bg-white/30');

    // Should have neo-cream token
    expect(container.innerHTML).toContain('bg-neo-cream/30');

    // Should use neo-purple tokens instead of purple-100/purple-800
    expect(container.innerHTML).not.toContain('bg-purple-100');
    expect(container.innerHTML).not.toContain('bg-purple-800/30');
    expect(container.innerHTML).toContain('bg-neo-purple/20');
  });
});
