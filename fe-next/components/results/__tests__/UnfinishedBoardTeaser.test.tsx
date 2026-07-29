/**
 * UnfinishedBoardTeaser Tests
 *
 * Tests for the results page teaser showing missed words with masked letters.
 * TDD RED phase — written before implementation.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import UnfinishedBoardTeaser from '../UnfinishedBoardTeaser';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'unfinishedBoard.teaser': '3 words are waiting for you tomorrow',
        'unfinishedBoard.wordsWaiting': 'words waiting',
      };
      let val = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(`{{${k}}}`, String(v));
        });
      }
      return val;
    },
    dir: 'ltr',
  }),
}));

describe('UnfinishedBoardTeaser', () => {
  const defaultProps = {
    missedWords: ['QUARTZ', 'JUMBLE', 'FROZEN'],
  };

  it('should render the teaser message', () => {
    render(<UnfinishedBoardTeaser {...defaultProps} />);

    expect(screen.getByText('3 words are waiting for you tomorrow')).toBeInTheDocument();
  });

  it('should display masked versions of missed words', () => {
    render(<UnfinishedBoardTeaser {...defaultProps} />);

    // First and last letters visible, middle masked
    // QUARTZ -> Q _ _ _ T Z
    expect(screen.getByTestId('masked-word-0')).toBeInTheDocument();
    expect(screen.getByTestId('masked-word-1')).toBeInTheDocument();
    expect(screen.getByTestId('masked-word-2')).toBeInTheDocument();
  });

  it('should show first and last letters of each word', () => {
    render(<UnfinishedBoardTeaser missedWords={['QUARTZ']} />);

    const maskedWord = screen.getByTestId('masked-word-0');
    const text = maskedWord.textContent || '';
    // Should start with Q and end with Z
    expect(text.charAt(0)).toBe('Q');
    expect(text.charAt(text.length - 1)).toBe('Z');
  });

  it('should not render when no missed words', () => {
    const { container } = render(<UnfinishedBoardTeaser missedWords={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('should have neo-brutalist styling', () => {
    const { container } = render(<UnfinishedBoardTeaser {...defaultProps} />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-');
    expect(card.className).toContain('shadow-hard');
  });
});
