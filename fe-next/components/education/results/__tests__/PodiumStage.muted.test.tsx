import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
}));

import { PodiumStage } from '../PodiumStage';
import { FINAL_STAGE } from '@/lib/education/roundEndStage';

const t = (key: string) => key;

describe('PodiumStage — a round nobody scored in', () => {
  afterEach(cleanup);

  it('Given every score is 0, Then no medal, crown or gold plate names a winner', () => {
    render(<PodiumStage entries={[{ username: 'Zed', score: 0, rank: 1 }]} stage={FINAL_STAGE} t={t} muted />);
    expect(screen.queryAllByTestId(/^podium-medal-/)).toHaveLength(0);
    expect(screen.queryByTestId('podium-crown')).toBeNull();
    expect(screen.getByTestId('podium-place-1')).not.toHaveAttribute('data-medal');
    const plate = screen.getByTestId('podium-plate-1');
    expect(plate.className).not.toContain('bg-neo-yellow');
    expect(plate.style.backgroundImage).toBe('');
  });

  it('Given a real winner, Then gold still reads as gold', () => {
    render(<PodiumStage entries={[{ username: 'Ada', score: 40, rank: 1 }]} stage={FINAL_STAGE} t={t} />);
    expect(screen.getByTestId('podium-medal-1')).toBeInTheDocument();
    expect(screen.getByTestId('podium-place-1')).toHaveAttribute('data-medal', 'gold');
  });
});
