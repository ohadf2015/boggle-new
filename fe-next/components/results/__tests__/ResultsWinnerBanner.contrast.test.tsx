/**
 * ResultsWinnerBanner Text Contrast Tests
 *
 * Tests that text elements have appropriate contrast against
 * banner backgrounds that vary by rank.
 *
 * Issue: Username and announcement text with dark colors had poor contrast
 * on the dark navy background used for 2nd place banners.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock contexts
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div className={className as string} style={style as React.CSSProperties} onClick={onClick as React.MouseEventHandler} {...rest}>
        {children}
      </div>
    ),
    span: ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span className={className as string} {...rest}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: () => {},
    on: () => () => {},
  }),
  useTransform: (_val: unknown, fn: (v: number) => number) => ({
    get: () => fn(0),
    on: (_event: string, cb: (v: number) => void) => { cb(0); return () => {}; },
  }),
  animate: () => ({ stop: () => {} }),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

// Mock confetti utility
vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
}));

// Mock Avatar component
vi.mock('../../Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar">Avatar</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Crown: () => <span data-testid="crown-icon">Crown</span>,
  Trophy: () => <span data-testid="trophy-icon">Trophy</span>,
  Medal: () => <span data-testid="medal-icon">Medal</span>,
  Hand: () => <span data-testid="hand-icon">Hand</span>,
}));

// Mock Mascot component
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: () => <div data-testid="mascot">Mascot</div>,
  MascotVariant: {},
}));

vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: () => <div data-testid="mascot">CelebrationMascot</div>,
}));

import ResultsWinnerBanner from '../ResultsWinnerBanner';

const createWinner = (username: string, score: number) => ({
  username,
  score,
  avatar: { emoji: '😀', color: '#FF0000' },
});

describe('ResultsWinnerBanner Text Contrast', () => {
  describe('Username text has appropriate contrast for each rank', () => {
    it('should use dark text on 1st place banner (amber/yellow background)', () => {
      render(
        <ResultsWinnerBanner
          winner={createWinner('Winner', 100)}
          isCurrentUserWinner={true}
          rank={1}
        />
      );

      const username = screen.getByText('Winner');
      // 1st place has light amber background, so text should be dark
      expect(username.className).toContain('text-neo-black');
    });

    it('should use light text on 2nd place banner (dark navy background)', () => {
      render(
        <ResultsWinnerBanner
          winner={createWinner('Second', 90)}
          isCurrentUserWinner={true}
          rank={2}
        />
      );

      const username = screen.getByText('Second');
      // 2nd place has dark navy background, so text should be light
      expect(username.className).toContain('text-white');
    });

    it('should use dark text on 3rd place banner (pink/orange background)', () => {
      render(
        <ResultsWinnerBanner
          winner={createWinner('Third', 80)}
          isCurrentUserWinner={true}
          rank={3}
        />
      );

      const username = screen.getByText('Third');
      // 3rd place has dark bronze background, so text should be light
      expect(username.className).toContain('text-neo-cream');
    });

    it('should use light text on 4th+ place banner (dark purple background)', () => {
      render(
        <ResultsWinnerBanner
          winner={createWinner('Fourth', 70)}
          isCurrentUserWinner={true}
          rank={4}
        />
      );

      const username = screen.getByText('Fourth');
      // 4th+ place has dark purple background, so text should be light
      expect(username.className).toContain('text-white');
    });
  });

  describe('Announcement text follows same contrast rules as username', () => {
    it('should use dark text for announcement on 1st place banner', () => {
      render(
        <ResultsWinnerBanner
          winner={createWinner('Winner', 100)}
          isCurrentUserWinner={true}
          rank={1}
        />
      );

      const announcement = screen.getByText('results.winnerAnnouncement');
      expect(announcement.className).toContain('text-neo-black');
    });

    it('should use light text for announcement on 2nd place banner', () => {
      render(
        <ResultsWinnerBanner
          winner={createWinner('Second', 90)}
          isCurrentUserWinner={true}
          rank={2}
        />
      );

      const announcement = screen.getByText('results.silverMedalist');
      expect(announcement.className).toContain('text-white');
    });
  });
});
