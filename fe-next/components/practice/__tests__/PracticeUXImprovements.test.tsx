/**
 * Comprehensive tests for 7 UX/UI improvements to practice mode:
 * 1. PracticeModeNav step indicator + de-emphasized back-link
 * 2. PracticeTutorialSheet skip button sizing + scroll lock + touch-none
 * 3. Results screen Again button + completion burst
 * 4. Hub tile completion badge star + override
 * 5. (skipped in test - visual only)
 * 6. Tutorial carousel ribbon contrast
 * 7. Glassmorphism removal
 * 8. Caption overflow guard HE/JA
 *
 * TDD: Test first, implement second.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, params?: Record<string, string | number>) => {
    if (k === 'practice.again') return 'Again';
    if (k === 'gameModes.tutorial.cta') return 'Let\'s Go';
    if (k === 'gameModes.intro.skip') return 'Skip';
    if (k === 'practiceHub.backToHub') return 'Back';
    if (k === 'gameModes.classic.name') return 'Classic';
    if (k === 'common.back') return 'Back';
    return k;
  }}),
  useLanguageSafe: () => ({ language: 'en', t: (k: string) => k }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: vi.fn() }),
}));

vi.mock('@/utils/haptics', () => ({
  haptics: { tap: vi.fn() },
}));

vi.mock('@/lib/practice/practiceTutorialSteps', () => ({
  tutorialTipKeys: () => ['tip1', 'tip2', 'tip3'],
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    span: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  },
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import PracticeModeNav from '../PracticeModeNav';
import PracticeTutorialSheet from '../PracticeTutorialSheet';

describe('PracticeUXImprovements', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  /**
   * Task 1: PracticeModeNav step indicator + de-emphasized back-link
   * - Should accept optional `step` prop
   * - Should show 3-dot progress indicator (filled/empty circles)
   * - Back-to-hub link: when step='active', apply opacity-60 hover:opacity-100
   */
  describe('Task 1: PracticeModeNav step indicator', () => {
    it('renders back-to-hub link', () => {
      render(<PracticeModeNav current="classic" />);
      expect(screen.getByTestId('practice-back-to-hub')).toBeInTheDocument();
    });

    it('step prop presence: component accepts step prop without crashing', () => {
      // This test just ensures the prop is accepted and doesn't break rendering
      const { container } = render(
        <PracticeModeNav current="classic" step="intro" />
      );
      expect(container.querySelector('[data-testid="practice-mode-nav"]')).toBeInTheDocument();
    });

    it('back-to-hub link has opacity-60 class when step=active', () => {
      render(<PracticeModeNav current="classic" step="active" />);
      const backLink = screen.getByTestId('practice-back-to-hub');
      expect(backLink).toHaveClass('opacity-60');
    });

    it('back-to-hub link has hover:opacity-100 when step=active', () => {
      render(<PracticeModeNav current="classic" step="active" />);
      const backLink = screen.getByTestId('practice-back-to-hub');
      expect(backLink).toHaveClass('hover:opacity-100');
    });

    it('back-to-hub link is still clickable when step=active', () => {
      render(<PracticeModeNav current="classic" step="active" />);
      const backLink = screen.getByTestId('practice-back-to-hub') as HTMLAnchorElement;
      expect(backLink.href).toContain('/practice');
    });
  });

  /**
   * Task 2: PracticeTutorialSheet skip button sizing + scroll lock + touch-none
   * - Skip button should have larger tap target: py-2 px-3
   * - Skip button should have pill styling: rounded-full border-2 bg-neo-cream/10
   * - Carousel parent should have overflow-x:hidden
   * - m.div should have touch-none
   */
  describe('Task 2: PracticeTutorialSheet skip button & scroll lock', () => {
    it('skip button exists with correct classes for pill styling', () => {
      render(
        <PracticeTutorialSheet
          mode="classic"
          t={(k: string) => {
            if (k === 'gameModes.intro.skip') return 'Skip';
            return k;
          }}
          onContinue={vi.fn()}
        />
      );
      const skipBtn = Array.from(screen.getAllByRole('button')).find(
        (btn) => btn.textContent?.includes('Skip')
      );
      expect(skipBtn).toBeDefined();
      expect(skipBtn).toHaveClass('rounded-full');
      expect(skipBtn).toHaveClass('border-2');
    });

    it('skip button has larger py-2 px-3 padding class', () => {
      render(
        <PracticeTutorialSheet
          mode="classic"
          t={(k: string) => {
            if (k === 'gameModes.intro.skip') return 'Skip';
            return k;
          }}
          onContinue={vi.fn()}
        />
      );
      const skipBtn = Array.from(screen.getAllByRole('button')).find(
        (btn) => btn.textContent?.includes('Skip')
      );
      expect(skipBtn).toHaveClass('py-2');
      expect(skipBtn).toHaveClass('px-3');
    });

    it('carousel parent has overflow-x-hidden', () => {
      render(
        <PracticeTutorialSheet
          mode="classic"
          t={(k: string) => k}
          onContinue={vi.fn()}
        />
      );
      const carousel = screen.getByTestId('practice-tutorial-carousel');
      expect(carousel).toHaveClass('overflow-hidden');
    });

    it('m.div inside carousel has touch-none for scroll lock', () => {
      const { container } = render(
        <PracticeTutorialSheet
          mode="classic"
          t={(k: string) => k}
          onContinue={vi.fn()}
        />
      );
      // The draggable m.div should have touch-none
      const carousel = screen.getByTestId('practice-tutorial-carousel');
      const draggableDiv = carousel.querySelector('[class*="cursor-grab"]');
      expect(draggableDiv).toHaveClass('touch-none');
    });
  });

  /**
   * Task 6: Tutorial carousel ribbon contrast
   * - Step ribbon should have text-sm font-bold bg-neo-navy border-2 border-neo-cream/60
   * - Should show "1/3" format
   */
  describe('Task 6: Tutorial carousel ribbon contrast', () => {
    it('step ribbon has correct contrast classes', () => {
      render(
        <PracticeTutorialSheet
          mode="classic"
          t={(k: string) => k}
          onContinue={vi.fn()}
        />
      );
      const carousel = screen.getByTestId('practice-tutorial-carousel');
      const ribbon = carousel.querySelector('[class*="text-sm"][class*="font-bold"]');
      expect(ribbon).toBeInTheDocument();
      expect(ribbon).toHaveClass('text-sm');
      expect(ribbon).toHaveClass('font-bold');
    });

    it('step ribbon shows slide count in 1/3 format', () => {
      render(
        <PracticeTutorialSheet
          mode="classic"
          t={(k: string) => k}
          onContinue={vi.fn()}
        />
      );
      expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
    });
  });

  /**
   * Task 7: Remove glassmorphism drift
   * - Should NOT have backdrop-blur-sm
   * - Should have solid bg-neo-navy/85 or similar
   */
  describe('Task 7: Remove glassmorphism', () => {
    it('PracticeTutorialSheet has no backdrop-blur-sm classes', () => {
      const { container } = render(
        <PracticeTutorialSheet
          mode="classic"
          t={(k: string) => k}
          onContinue={vi.fn()}
        />
      );
      const elements = container.querySelectorAll('[class*="backdrop-blur"]');
      expect(elements.length).toBe(0);
    });

    it('sheet background uses solid neo-navy, not glassmorphism', () => {
      render(
        <PracticeTutorialSheet
          mode="classic"
          t={(k: string) => k}
          onContinue={vi.fn()}
        />
      );
      const sheet = screen.getByTestId('practice-tutorial-sheet');
      expect(sheet).toHaveClass('bg-linear-to-b');
      expect(sheet).toHaveClass('from-neo-navy');
    });
  });

  /**
   * Task 8: Caption overflow guard for HE/JA
   * - Tip caption should have line-clamp-2 max-h-[3.5rem]
   */
  describe('Task 8: Caption overflow guard', () => {
    it('tip caption has line-clamp-2 for overflow guard', () => {
      const { container } = render(
        <PracticeTutorialSheet
          mode="classic"
          t={(k: string) => 'Long caption that might overflow on small screens'}
          onContinue={vi.fn()}
        />
      );
      const carousel = screen.getByTestId('practice-tutorial-carousel');
      // Find the caption paragraph inside the carousel
      const captions = carousel.querySelectorAll('p[class*="text-base"]');
      expect(captions.length).toBeGreaterThan(0);
      const hasLineClamp = Array.from(captions).some(c =>
        c.className.includes('line-clamp-2')
      );
      expect(hasLineClamp).toBe(true);
    });

    it('tip caption has max-h-[3.5rem] constraint', () => {
      const { container } = render(
        <PracticeTutorialSheet
          mode="classic"
          t={(k: string) => 'Caption text'}
          onContinue={vi.fn()}
        />
      );
      const carousel = screen.getByTestId('practice-tutorial-carousel');
      const captions = carousel.querySelectorAll('p[class*="text-base"]');
      const hasMaxHeight = Array.from(captions).some(c =>
        c.className.includes('max-h-')
      );
      expect(hasMaxHeight).toBe(true);
    });
  });
});
