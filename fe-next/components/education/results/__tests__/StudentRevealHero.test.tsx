import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('next/image', () => ({ default: ({ src }: { src: string }) => <span data-testid="mascot" data-src={src} /> }));
vi.mock('../CelebrationLoop', () => ({ CelebrationLoop: ({ active }: { active: boolean }) => (active ? <span data-testid="confetti" /> : null) }));

import { StudentRevealHero } from '../StudentRevealHero';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const base = { rank: 4, total: 26, score: 37, reduceMotion: true, t };

describe('StudentRevealHero', () => {
  it('given I won my duel, when the verdict beat lands, then the card turns lime with the victory mascot, confetti and one big rival line', () => {
    render(<StudentRevealHero {...base} reduceMotion={false} beat="verdict" verdict="won" rival={{ rivalName: 'Dana', diff: 4, won: true }} gap={null} />);
    const hero = screen.getByTestId('edu-student-hero');
    expect(hero).toHaveAttribute('data-verdict', 'won');
    expect(hero).toHaveClass('bg-neo-lime');
    expect(screen.getByTestId('mascot').getAttribute('data-src')).toContain('victory');
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
    expect(screen.getByTestId('edu-student-rival')).toHaveTextContent('education.rivals.outcome.won:{"name":"Dana","points":4}');
    expect(screen.getByTestId('edu-student-rival')).not.toHaveClass('invisible');
  });

  it('given a tie and a loss, then each gets its own colour and mascot, and neither throws confetti', () => {
    const { unmount } = render(<StudentRevealHero {...base} beat="done" verdict="tied" rival={{ rivalName: 'Dana', diff: 0, won: false }} gap={null} />);
    expect(screen.getByTestId('edu-student-hero')).toHaveClass('bg-neo-yellow');
    expect(screen.getByTestId('mascot').getAttribute('data-src')).toContain('cheer');
    unmount();
    render(<StudentRevealHero {...base} beat="done" verdict="lost" rival={null} gap={{ kind: 'behind', points: 10, name: 'Noa' }} />);
    expect(screen.getByTestId('edu-student-hero')).toHaveClass('bg-neo-cyan');
    expect(screen.getByTestId('mascot').getAttribute('data-src')).toContain('think');
    expect(screen.getByTestId('edu-student-gap')).toHaveTextContent('mpUi.results.behind:{"points":10,"name":"Noa"}');
    expect(screen.queryByTestId('confetti')).toBeNull();
  });

  it('given the reveal has only reached my rank, then the verdict is held back and the card is not coloured yet', () => {
    render(<StudentRevealHero {...base} reduceMotion={false} beat="rank" verdict="won" rival={{ rivalName: 'Dana', diff: 4, won: true }} gap={null} />);
    expect(screen.getByTestId('edu-student-hero')).toHaveAttribute('data-verdict', 'pending');
    expect(screen.getByTestId('edu-student-hero')).not.toHaveClass('bg-neo-lime');
    expect(screen.getByTestId('edu-student-rival')).toHaveClass('invisible');
  });

  it('given my placing, then rank and score lead the card with their real values for screen readers', () => {
    render(<StudentRevealHero {...base} beat="done" verdict="won" rival={null} gap={null} />);
    expect(screen.getByTestId('edu-student-rank')).toHaveTextContent('eduLiveRoom.studentResults.rankOf:{"rank":4,"total":26}');
    expect(screen.getByTestId('edu-student-score')).toHaveTextContent('37');
  });

  it('given a loss with a chest, then the chest comes before the verdict line', () => {
    render(<StudentRevealHero {...base} beat="done" verdict="lost" rival={null} gap={{ kind: 'behind', points: 10, name: 'Noa' }} chest={<div data-testid="chest" />} />);
    const chest = screen.getByTestId('chest');
    expect(chest.compareDocumentPosition(screen.getByTestId('edu-student-gap')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('given a win with a chest, then the verdict line comes first and the chest follows', () => {
    render(<StudentRevealHero {...base} beat="done" verdict="won" rival={{ rivalName: 'Dana', diff: 4, won: true }} gap={null} chest={<div data-testid="chest" />} />);
    expect(screen.getByTestId('edu-student-rival').compareDocumentPosition(screen.getByTestId('chest')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('given zero points, then no placing is claimed', () => {
    render(<StudentRevealHero {...base} score={0} beat="done" verdict="lost" rival={null} gap={null} />);
    expect(screen.queryByTestId('edu-student-rank')).toBeNull();
    expect(screen.getByTestId('edu-student-headline')).toHaveTextContent('education.results.you.roundComplete');
  });
});
