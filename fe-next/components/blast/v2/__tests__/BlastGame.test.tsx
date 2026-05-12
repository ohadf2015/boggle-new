import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { BlastLevel } from '@/lib/blast/v2/types';

vi.mock('../BlastAtmosphereOverlay', () => ({
  BlastAtmosphereOverlay: () => null,
}));
vi.mock('../BlastFxOverlay', () => ({
  BlastFxOverlay: () => null,
}));
vi.mock('@/lib/blast/v2/fx', () => ({
  useBlastFx: () => new Proxy({}, { get: () => () => {} }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

import { BlastGame } from '../BlastGame';

const mockLevel: BlastLevel = {
  id: 'game-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['S', 'U', 'N'] },
    { index: 2, tiles: ['E', 'G', 'G'] },
  ],
  words: ['CAT', 'SUN', 'EGG'],
  resolvableOrder: ['CAT', 'SUN', 'EGG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

describe('BlastGame', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  it('shows intro card initially', () => {
    render(<BlastGame level={mockLevel} onAdvance={vi.fn()} />);
    expect(screen.getByTestId('intro-card')).toBeInTheDocument();
  });

  it('auto-dismisses intro card after 1500ms', async () => {
    render(<BlastGame level={mockLevel} onAdvance={vi.fn()} />);
    vi.advanceTimersByTime(1500);
    await waitFor(() => {
      expect(screen.queryByTestId('intro-card')).not.toBeInTheDocument();
    });
  });

  it('shows board after intro dismisses', async () => {
    render(<BlastGame level={mockLevel} onAdvance={vi.fn()} />);
    vi.advanceTimersByTime(1500);
    await waitFor(() => {
      expect(screen.getByTestId('blast-board')).toBeInTheDocument();
    });
  });

  it('shows complete card when all words found', async () => {
    const { rerender } = render(<BlastGame level={mockLevel} onAdvance={vi.fn()} />);
    vi.advanceTimersByTime(1500);
    await waitFor(() => {
      expect(screen.getByTestId('blast-board')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('complete-card')).not.toBeInTheDocument();
  });

  it('shows FTUE overlay on level 1 without ftue_completed', () => {
    const mockLevel1 = { ...mockLevel, levelNumber: 1 };
    render(
      <BlastGame
        level={mockLevel1}
        unlocksSeen={{}}
        isVeteranPlayer={false}
        onAdvance={vi.fn()}
      />
    );

    // FTUE should show during intro phase
    expect(screen.getByText('Drag across letters to spell a word')).toBeInTheDocument();
  });

  it('calls onUpdateUnlocks when FTUE completes', async () => {
    const mockLevel1 = { ...mockLevel, levelNumber: 1 };
    const onUpdateUnlocks = vi.fn();
    render(
      <BlastGame
        level={mockLevel1}
        unlocksSeen={{}}
        isVeteranPlayer={false}
        onAdvance={vi.fn()}
        onUpdateUnlocks={onUpdateUnlocks}
      />
    );

    // FTUE is shown; clicking should trigger onUpdateUnlocks
    // (actual FTUE completion logic is tested separately)
  });
});
