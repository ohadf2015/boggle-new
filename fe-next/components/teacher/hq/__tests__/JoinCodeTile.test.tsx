import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { JoinCodeTile, joinCodeHop } from '../JoinCodeTile';

afterEach(cleanup);

describe('JoinCodeTile', () => {
  it('Given a code, Then each tile drops in after the one before it, then hops on its own turn', () => {
    const { getAllByTestId } = render(
      <p>
        {Array.from('K7Q2').map((ch, i) => (
          <JoinCodeTile key={i} ch={ch} index={i} count={4} data-testid="tile" className="bg-neo-cream" />
        ))}
      </p>,
    );
    const tiles = getAllByTestId('tile');
    const dropDelays = tiles.map((el) => parseFloat(el.style.animationDelay));
    expect(dropDelays).toEqual([...dropDelays].sort((a, b) => a - b));
    expect(new Set(dropDelays).size).toBe(4);
    for (const el of tiles) {
      expect(el.className).toContain('animate-edu-tile-in');
      expect(el.getAttribute('aria-hidden')).toBe('true');
      const face = el.firstElementChild as HTMLElement;
      expect(face.className).toContain('animate-edu-hop');
      expect(face.className).toContain('bg-neo-cream');
      expect(face.textContent).toBe(el.textContent);
    }
    const hopDelays = tiles.map((el) => parseFloat((el.firstElementChild as HTMLElement).style.animationDelay));
    expect(new Set(hopDelays).size).toBe(4);
  });

  it('Then the drop-in and the hop live on different elements, so the idle hop never cancels the entrance', () => {
    const { getByTestId } = render(<JoinCodeTile ch="A" index={0} count={1} data-testid="tile" />);
    const outer = getByTestId('tile');
    expect(outer.className).not.toContain('animate-edu-hop');
    expect((outer.firstElementChild as HTMLElement).className).not.toContain('animate-edu-tile-in');
  });

  it('Then one full wave gives every tile its own hop slot, a couple of seconds apart', () => {
    const hop = joinCodeHop(2, 6);
    expect(hop.cycleS).toBeGreaterThanOrEqual(6);
    expect(hop.delayS).toBeGreaterThan(joinCodeHop(1, 6).delayS + 1);
  });
});
