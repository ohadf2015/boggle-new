import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BridgeStage from '../BridgeStage';
import { plateFitEms } from '../plateFit';

const stage = (o: { isCorrect?: boolean; isGaveUp?: boolean } = {}) =>
  render(
    <BridgeStage word1="PINE" word2="SAUCE" isCorrect={!!o.isCorrect} isGaveUp={!!o.isGaveUp}>
      <div data-testid="planks">planks</div>
    </BridgeStage>,
  );

describe('BridgeStage', () => {
  it('shows both given words with the plank row between them', () => {
    stage();
    const text = document.body.textContent ?? '';
    expect(text.indexOf('PINE')).toBeLessThan(text.indexOf('planks'));
    expect(text.indexOf('planks')).toBeLessThan(text.indexOf('SAUCE'));
  });

  it('is idle until resolved: no ropes pulled, no burst', () => {
    stage();
    expect(screen.queryByTestId('bridge-connector')).toBeNull();
    expect(screen.queryByTestId('spark-burst')).toBeNull();
  });

  it('pulls the ropes lime and bursts on a solve', () => {
    stage({ isCorrect: true });
    expect(screen.getByTestId('bridge-connector').className).toContain('bg-neo-lime');
    expect(screen.getByTestId('spark-burst')).toBeTruthy();
  });

  it('cuts the ropes red with no celebration on a give-up', () => {
    stage({ isGaveUp: true });
    expect(screen.getByTestId('bridge-connector').className).toContain('bg-neo-red');
    expect(screen.queryByTestId('spark-burst')).toBeNull();
  });

  it('sizes each plate from its own longest word and never breaks inside a word', () => {
    render(
      <BridgeStage word1="FIREPLACE" word2="ICE" isCorrect={false} isGaveUp={false}>
        <span />
      </BridgeStage>,
    );
    const long = screen.getByText('FIREPLACE');
    const short = screen.getByText('ICE');
    expect(long.style.getPropertyValue('--plate-fit')).toBe(String(plateFitEms('FIREPLACE')));
    expect(short.style.getPropertyValue('--plate-fit')).toBe(String(plateFitEms('ICE')));
    expect(long.className).toContain('var(--plate-fit)');
    expect(long.className).not.toContain('overflow-wrap:anywhere');
  });

  it('never starts a visible layer at opacity 0 (a stalled animation bundle must not blank the puzzle)', () => {
    const { container } = stage();
    expect(container.querySelector('[style*="opacity: 0"]')).toBeNull();
  });

  it('draws a bridge over water: two ropes, a plank deck holding the tiles, an arch and a river', () => {
    const { container } = stage();
    expect(screen.getAllByTestId('bridge-rope')).toHaveLength(2);
    const deck = screen.getByTestId('bridge-deck');
    expect(deck.contains(screen.getByTestId('planks'))).toBe(true);
    expect(deck.className).toContain('repeating-linear-gradient');
    const river = screen.getByTestId('bridge-river');
    expect(river.querySelector('svg path')).toBeTruthy();
    // Rope + deck + river stack in that order between the two plates.
    const span = screen.getByTestId('bridge-span');
    const kids = [...span.children];
    expect(kids.indexOf(deck)).toBeLessThan(kids.indexOf(river));
    expect(container.textContent?.indexOf('PINE')).toBeLessThan(container.textContent?.indexOf('planks') ?? 0);
  });

  it('lays the plates and the bridge out in normal flow, never absolute or with negative margins', () => {
    stage();
    const flow = [
      screen.getByTestId('bridge-stage'),
      screen.getByTestId('bridge-span'),
      screen.getByTestId('bridge-deck'),
      ...screen.getAllByTestId('bridge-plate'),
    ];
    for (const el of flow) {
      expect(el.className).not.toMatch(/(^|\s)absolute(\s|$)/);
      expect(el.className).not.toMatch(/(^|\s)-m[xy]?-/);
    }
  });

  it('caps plate text and tile size by the stage height so a short screen shrinks instead of overlapping', () => {
    stage();
    const plate = screen.getAllByTestId('bridge-plate')[0];
    expect(plate.className).toMatch(/cqh/);
    const deck = screen.getByTestId('bridge-deck');
    expect(deck.style.getPropertyValue('--cell-cap')).toContain('cqh');
  });
});

