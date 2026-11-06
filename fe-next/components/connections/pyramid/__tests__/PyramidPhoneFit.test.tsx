/**
 * Phone layout of the pyramid play screen (2026-11-06 report, Hebrew phone):
 * - The lit beam pointed at the LEFT slot while the current slot (stage 1)
 *   sits on the RIGHT in RTL: the slot row follows the page direction, the
 *   beams SVG did not.
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

describe('PyramidProgress beams', () => {
  it('mirrors the beams in RTL, like the slot row they point at', () => {
    renderProgress();
    expect(screen.getByTestId('pyramid-beams').getAttribute('class')).toContain('rtl:-scale-x-100');
  });

  it('spans the beams across the slot row instead of a fixed width', () => {
    renderProgress();
    const beams = screen.getByTestId('pyramid-beams');
    const cls = beams.getAttribute('class') ?? '';
    expect(cls).toContain('min-w-full');
    expect(cls).not.toContain('w-64');
    // Same box as the slots, so the beam ends follow the slots when the rail zooms them.
    expect(beams.parentElement?.contains(screen.getByTestId('pyramid-slot-current'))).toBe(true);
  });

  it('keeps unlit beams visible', () => {
    const { container } = renderProgress();
    const strokes = Array.from(container.querySelectorAll('line')).map((l) => l.getAttribute('stroke'));
    expect(strokes).not.toContain('rgba(255,255,255,0.15)');
  });

  it('shrinks the apex and slots on short screens', () => {
    renderProgress();
    expect(screen.getByTestId('pyramid-apex').className).toContain('[@container(max-height:42rem)]:h-9');
    expect(screen.getByTestId('pyramid-slot-current').className).toContain('[@container(max-height:42rem)]:h-9');
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

  it('renders no empty rank wrapper when there is no rank', () => {
    render(<PyramidHeader state={initPyramidState(pyramid as never)} metaAnswer="STONE" />);
    expect(screen.queryByTestId('pyramid-rank-slot')).toBeNull();
  });
});
