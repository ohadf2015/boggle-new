/**
 * Parent mount test — RankingPlayEmbed isolation tests passed while
 * AnimatedLanding crashed on first render (prefersReduced is undefined).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnimatedLanding } from '../AnimatedLanding';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : ''} {...rest}>{children}</a>
  ),
}));

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
  allLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  puzzleDate: '2026-09-03',
  language: 'en',
  puzzleNumber: 1,
};

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/dailyChallenge/wordWheelGeneration')>();
  return {
    ...actual,
    generateWordWheelPuzzle: () => puzzle,
  };
});

vi.mock('@/hooks/fastValidateWord', () => ({
  fastValidateWord: vi.fn().mockResolvedValue(true),
}));

const props = {
  locale: 'en',
  hero: {
    title: 'Daily Word Wheel',
    subtitle: 'Today',
    description: 'Find words on the wheel.',
    cta: 'Play full game',
    leaderboard: 'Leaderboard',
  },
  rulesHeading: 'Rules',
  rules: ['Use the center letter'],
  steps: [
    { step: '1', title: 'Spin', desc: 'Look at letters' },
    { step: '2', title: 'Find', desc: 'Make a word' },
  ],
  stepsHeading: 'How to play',
  faqHeading: 'FAQ',
  faqItems: [{ q: 'Q', a: 'A' }],
  finalCta: { heading: 'Play', description: 'Go', button: 'Start' },
};

describe('AnimatedLanding', () => {
  it('renders without throwing so RankingPlayEmbed can mount', () => {
    render(<AnimatedLanding {...props} />);
    expect(screen.getByRole('heading', { name: 'Daily Word Wheel' })).toBeTruthy();
    expect(screen.getByTestId('ranking-wheel-play')).toBeTruthy();
  });

  it('lets a first-time visitor tap letters and submit a word without following the CTA', async () => {
    render(<AnimatedLanding {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    fireEvent.click(screen.getByTestId('ranking-wheel-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('found-count')).toHaveTextContent('1');
    });
    expect(screen.getByRole('link', { name: 'Play full game' }).getAttribute('href')).toBe(
      '/en/daily/word-wheel',
    );
  });
});
