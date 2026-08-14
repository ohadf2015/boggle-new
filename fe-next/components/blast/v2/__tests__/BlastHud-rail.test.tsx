import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

import { BlastHud } from '../BlastHud';

const base = {
  levelNumber: 12,
  coins: 100,
  chestNumber: 1,
  chestProgress: 0.2,
  chestContents: null,
  onShuffle: vi.fn(),
  onHint: vi.fn(),
};

describe('BlastHud — one status rail instead of stacked bands', () => {
  it('puts strikes, progress, bonus and the action buttons in a single rail', () => {
    render(
      <BlastHud
        {...base}
        strikeBudget={3}
        strikesUsed={1}
        bonusWordCount={2}
        targetWords={['ORBIT', 'COMET', 'STAR']}
        foundWords={['ORBIT']}
        canUndo
        onUndo={vi.fn()}
      />,
    );
    const rail = screen.getByTestId('hud-rail');
    for (const id of ['hud-strikes', 'hud-progress', 'hud-bonus-count', 'undo-btn', 'hint-btn']) {
      expect(rail).toContainElement(screen.getByTestId(id));
    }
  });

  // Past level 3 the masked word strip is hidden (it leaks word count AND
  // length). A bare "found / total" counter leaks only the count, which every
  // word game in the genre shows — and without it the player has no idea how
  // much of the level is left.
  it('shows theme-word progress at every level, counting theme words only', () => {
    render(
      <BlastHud
        {...base}
        levelNumber={25}
        targetWords={['ORBIT', 'COMET', 'STAR', 'MOON']}
        // "LUNAR" is an off-theme bonus word — it must not inflate the counter.
        foundWords={['ORBIT', 'COMET', 'LUNAR']}
      />,
    );
    expect(screen.getByTestId('hud-progress')).toHaveTextContent('2/4');
    expect(screen.queryByTestId('hud-words-strip')).not.toBeInTheDocument();
  });

  it('keeps the masked word strip on the tutorial levels', () => {
    render(
      <BlastHud
        {...base}
        levelNumber={2}
        targetWords={['ORBIT', 'COMET']}
        foundWords={['ORBIT']}
      />,
    );
    expect(screen.getByTestId('hud-words-strip')).toBeInTheDocument();
    expect(screen.getByTestId('hud-word-COMET')).toHaveTextContent('•••••');
    expect(screen.getByTestId('hud-word-ORBIT')).toHaveTextContent('ORBIT');
  });

  // jsdom has no layout engine, so this asserts the mechanism rather than the
  // pixels: `ms-auto` is margin-inline-START, which pushes the actions to the
  // trailing edge in BOTH directions. `ml-auto` would pin them to the visual
  // right and strand them mid-rail in Hebrew.
  it('pushes the actions to the trailing edge with a direction-aware margin', () => {
    render(<BlastHud {...base} canUndo onUndo={vi.fn()} />);
    const actions = screen.getByTestId('undo-btn').parentElement!;
    expect(actions.className).toMatch(/\bms-auto\b/);
    expect(actions.className).not.toMatch(/\bml-auto\b/);
  });

  it('renders no rail at all when the level has nothing to report', () => {
    render(<BlastHud {...base} levelNumber={1} />);
    expect(screen.queryByTestId('hud-rail')).not.toBeInTheDocument();
  });
});
