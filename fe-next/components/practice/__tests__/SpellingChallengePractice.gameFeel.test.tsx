import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpellingTiles } from '../spelling/SpellingTiles';
import { StarTrack } from '../spelling/StarTrack';

import '@testing-library/jest-dom';

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const MockMotionDiv = React.forwardRef(
    ({ children, initial, animate, exit, transition, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )
  );
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    m: { div: MockMotionDiv, span: ({ children, ...props }: any) => <span {...props}>{children}</span> },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('SpellingTiles', () => {
  it('shows one slot per letter, the hint as text and blanks as _', () => {
    render(<SpellingTiles length={5} hint="l" typed="" state="typing" />);
    const tiles = screen.getByTestId('spelling-tiles');
    expect(tiles.children).toHaveLength(5);
    expect(tiles.textContent).toBe('l____');
  });

  it('fills tiles as the student types, without adding to the text content', () => {
    render(<SpellingTiles length={5} hint="l" typed="lig" state="typing" />);
    const tiles = Array.from(screen.getByTestId('spelling-tiles').children);
    expect(tiles.slice(0, 3).map((t) => t.getAttribute('data-letter'))).toEqual(['l', 'i', 'g']);
    expect(tiles.slice(0, 3).every((t) => t.getAttribute('data-slot') === 'filled')).toBe(true);
    expect(tiles[3].getAttribute('data-slot')).toBe('empty');
  });

  it('adds a few overflow tiles when the student types past the end', () => {
    render(<SpellingTiles length={3} hint="c" typed="catsss" state="typing" />);
    expect(screen.getByTestId('spelling-tiles').children).toHaveLength(6);
  });

  it('spells the real answer on the tiles once the verdict is in', () => {
    render(<SpellingTiles length={5} hint="p" typed="" state="wrong" answer="plant" />);
    const tiles = screen.getByTestId('spelling-tiles');
    expect(tiles).toHaveAttribute('data-state', 'wrong');
    expect(Array.from(tiles.children).map((t) => t.getAttribute('data-letter')).join('')).toBe('plant');
  });
});

describe('StarTrack', () => {
  it('marks hits, misses, the current slot and the rest', () => {
    render(
      <StarTrack total={4} current={2} outcomes={[{ correct: true }, { correct: false }]} label="Word 3 of 4" />
    );
    const track = screen.getByRole('progressbar', { name: 'Word 3 of 4' });
    expect(Array.from(track.children).map((c) => c.getAttribute('data-state'))).toEqual(['hit', 'miss', 'current', 'todo']);
  });

  it('falls back to a single bar past 20 words', () => {
    render(<StarTrack total={30} current={3} outcomes={[]} label="x" />);
    expect(screen.getByTestId('practice-progress-track').querySelectorAll('[data-state]')).toHaveLength(0);
  });
});

describe('SpellingChallengePractice game feel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bursts confetti from the tiles on a right answer only', async () => {
    const { fireConfetti } = await import('@/utils/confettiUtils');
    const { SpellingChallengePractice } = await import('../SpellingChallengePractice');
    render(
      <SpellingChallengePractice
        words={[
          { word: 'cat', definition: 'a pet', canIntegrate: true },
          { word: 'dog', definition: 'another pet', canIntegrate: true },
        ] as never}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    fireEvent.change(screen.getByTestId('spelling-input'), { target: { value: 'zzz' } });
    fireEvent.submit(screen.getByTestId('spelling-input').closest('form')!);
    expect(fireConfetti).not.toHaveBeenCalled();
    // Both buddies (perched on phones, side column on desktop) answer the miss.
    expect(screen.getAllByTestId('practice-buddy').map((b) => b.getAttribute('data-mood'))).toEqual(['miss', 'miss']);
    fireEvent.click(screen.getByRole('button', { name: /next|finish/i }));
    const next = (screen.getByTestId('definition-card').textContent ?? '').includes('another') ? 'dog' : 'cat';
    fireEvent.change(screen.getByTestId('spelling-input'), { target: { value: next } });
    fireEvent.submit(screen.getByTestId('spelling-input').closest('form')!);
    expect(fireConfetti).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('spelling-tiles')).toHaveAttribute('data-state', 'correct');
    expect(screen.getAllByTestId('practice-buddy')[0]).toHaveAttribute('data-mood', 'correct');
    expect(screen.getByTestId('spelling-fly-up')).toHaveAttribute('aria-hidden', 'true');
  });

  it('nods along while the student types', async () => {
    const { SpellingChallengePractice } = await import('../SpellingChallengePractice');
    render(
      <SpellingChallengePractice
        words={[{ word: 'cat', definition: 'a pet', canIntegrate: true }] as never}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getAllByTestId('practice-buddy')[0]).toHaveAttribute('data-mood', 'idle');
    fireEvent.change(screen.getByTestId('spelling-input'), { target: { value: 'c' } });
    expect(screen.getAllByTestId('practice-buddy')[0]).toHaveAttribute('data-mood', 'typing');
  });
});
