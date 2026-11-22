/**
 * Phone layout of the pyramid play screen (2026-11-06 report, Hebrew phone):
 * - A lit beam once pointed at the wrong slot in RTL. The base row now follows
 *   the page direction itself, so Hebrew lays the first brick on the right.
 * - On short screens (or an enlarged system font) the header pushed the
 *   keyboard below the fold. The play root is a size container and the header
 *   sheds the explainer, then the rank, then shrinks the pyramid.
 * jsdom has no layout, so these pin the classes that carry the behavior; the
 * PR has phone screenshots of the real result.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PyramidProgress from '../PyramidProgress';
import PyramidHeader from '../PyramidHeader';
import { initPyramidState } from '@/lib/connections/pyramid/gameLogic';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', t: (k: string) => k }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/lib/dailyModes', () => ({
  DAILY_MODES: [{ id: 'connections', art: '/x.png', titleKey: 'daily.connections', optional: false }],
}));

const puzzle = (id: string) => ({ id, word1: 'A', word2: 'B', bridge: 'STONE', difficulty: 'easy' as const });
const pyramid = {
  id: 'p',
  metaAnswer: 'STONE',
  metaHint: 'h',
  base: [puzzle('1'), puzzle('2'), puzzle('3')],
  difficulty: 'medium' as const,
};

function renderProgress() {
  return render(
    <PyramidProgress stage={0} solvedBridges={[]} gaveUpBase={[false, false, false]} metaAnswer="STONE" won={false} />,
  );
}

describe('PyramidProgress on short phones', () => {
  it('shrinks the capstone spot and the bricks on short screens', () => {
    renderProgress();
    expect(screen.getByTestId('pyramid-apex').className).toContain('[@container(max-height:42rem)]:h-11');
    for (const i of [0, 1, 2]) {
      expect(screen.getByTestId(`pyramid-tier-${i}`).className).toContain('[@container(max-height:42rem)]:h-9');
    }
  });

  it('moves the tries to the top-start corner on the shortest phones, clear of the floating mute button', () => {
    render(
      <PyramidProgress stage={0} solvedBridges={[]} gaveUpBase={[false, false, false]} metaAnswer="STONE" won={false} corner={<span>tries</span>} />,
    );
    const cls = screen.getByTestId('pyramid-corner').className;
    expect(cls).toContain('[@container(height<=36rem)]:start-1.5');
    expect(cls).toContain('[@container(height<=36rem)]:end-auto');
  });

  it('lays the base row in the page direction, with no lit beam to point the wrong way', () => {
    renderProgress();
    expect(screen.queryByTestId('pyramid-beams')).toBeNull();
    const row = screen.getByTestId('pyramid-tier-0').parentElement!;
    expect(row.className).toContain('flex-row');
    expect(row.getAttribute('dir')).toBeNull();
  });
});

describe('PyramidHeader on short phones', () => {
  it('drops the explainer first and the rank next', () => {
    render(<PyramidHeader daily state={initPyramidState(pyramid as never)} metaAnswer="STONE" rankSlot={<span>rank</span>} />);
    expect(screen.getByTestId('pyramid-explainer').className).toContain('[@container(max-height:46rem)]:hidden');
    const rank = screen.getByTestId('pyramid-rank-slot');
    expect(rank.className).toContain('[@container(max-height:42rem)]:hidden');
    expect(rank.textContent).toBe('rank');
  });

  it('drops the daily heading on the shortest phones so the keyboard dock stays on screen', () => {
    render(<PyramidHeader daily state={initPyramidState(pyramid as never)} metaAnswer="STONE" />);
    expect(screen.getByTestId('daily-quest-heading').className).toContain('[@container(height<=36rem)]:hidden');
  });

  it('renders no empty rank wrapper when there is no rank', () => {
    render(<PyramidHeader state={initPyramidState(pyramid as never)} metaAnswer="STONE" />);
    expect(screen.queryByTestId('pyramid-rank-slot')).toBeNull();
  });
});
