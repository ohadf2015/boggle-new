/**
 * ResultsPlayerCard Text Contrast Tests
 *
 * Tests that text elements have appropriate contrast against
 * card backgrounds that vary by rank (amber-400, slate-200, amber-500, neo-cream).
 *
 * Issue: Text with light colors (text-white) has poor contrast on light backgrounds.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock contexts
const mockLanguageContext = {
  t: (key: string) => key,
  language: 'en',
  setLanguage: jest.fn(),
  dir: 'ltr',
};

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => mockLanguageContext,
}));

jest.mock('../../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: jest.fn(),
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...domProps } = props as Record<string, unknown>;
      return <span {...domProps}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

import ResultsPlayerCard from '../ResultsPlayerCard';

// Sample player data with a title (which previously had contrast issues)
const createPlayerWithTitle = (username: string) => ({
  username,
  score: 100,
  allWords: [
    { word: 'test', score: 10, validated: true, isDuplicate: false },
  ],
  avatar: { emoji: '😀', color: '#FF0000' },
  title: {
    icon: '🏆',
    name: 'Champion',
    description: 'Test title description',
  },
  achievements: [],
});

const defaultProps = {
  allPlayerWords: {},
  currentUsername: 'other',
  isWinner: false,
  xpGainedData: null,
  levelUpData: null,
  duplicateRuleDisabled: false,
  archetype: null,
};

describe('ResultsPlayerCard Text Contrast', () => {
  describe('Title badge has solid dark background for contrast on any card', () => {
    it('should have dark background for title badge on 1st place card', () => {
      const player = createPlayerWithTitle('Winner');
      render(
        <ResultsPlayerCard
          player={player}
          index={0}
          {...defaultProps}
        />
      );

      // Find the title badge container (parent of the text)
      const titleBadge = screen.getByText('Champion');
      const container = titleBadge.parentElement;

      // The title badge container should have a dark background (bg-neo-black)
      // This ensures text has good contrast regardless of card background color
      expect(container?.className).toContain('bg-neo-black');
      // Should NOT use transparent/semi-transparent backgrounds that depend on card color
      expect(container?.className).not.toContain('bg-neo-pink/10');
    });

    it('should have dark background for title badge on 2nd place card', () => {
      const player = createPlayerWithTitle('Second');
      render(
        <ResultsPlayerCard
          player={player}
          index={1}
          {...defaultProps}
        />
      );

      const titleBadge = screen.getByText('Champion');
      const container = titleBadge.parentElement;
      expect(container?.className).toContain('bg-neo-black');
    });

    it('should have dark background for title badge on 3rd place card', () => {
      const player = createPlayerWithTitle('Third');
      render(
        <ResultsPlayerCard
          player={player}
          index={2}
          {...defaultProps}
        />
      );

      const titleBadge = screen.getByText('Champion');
      const container = titleBadge.parentElement;
      expect(container?.className).toContain('bg-neo-black');
    });

    it('should have dark background for title badge on 4th+ place card', () => {
      const player = createPlayerWithTitle('Fourth');
      render(
        <ResultsPlayerCard
          player={player}
          index={3}
          {...defaultProps}
        />
      );

      const titleBadge = screen.getByText('Champion');
      const container = titleBadge.parentElement;
      expect(container?.className).toContain('bg-neo-black');
    });
  });
});
