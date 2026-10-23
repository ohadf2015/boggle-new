import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BridgeStage from '../BridgeStage';

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

  it('never starts a visible layer at opacity 0 (a stalled animation bundle must not blank the puzzle)', () => {
    const { container } = stage();
    expect(container.querySelector('[style*="opacity: 0"]')).toBeNull();
  });
});
