import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BridgeOutcomeTiles from '../BridgeOutcomeTiles';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';

const outcomes: BridgeOutcome[] = [
  { reached: true, solved: true, wrongAttempts: 0, hintUsed: false },
  { reached: true, solved: true, wrongAttempts: 2, hintUsed: false },
  { reached: true, solved: true, wrongAttempts: 0, hintUsed: true },
  { reached: true, solved: false, wrongAttempts: 3, hintUsed: false },
  { reached: false, solved: false, wrongAttempts: 0, hintUsed: false },
];

describe('BridgeOutcomeTiles', () => {
  it('renders one icon tile per bridge, mirroring the share-grid legend (no emoji in UI)', () => {
    render(<BridgeOutcomeTiles outcomes={outcomes} />);
    const cells = screen.getAllByTestId('recap-square');
    expect(cells).toHaveLength(5);
    expect(cells.map((c) => c.getAttribute('data-kind'))).toEqual([
      'clean', 'messy', 'hint', 'failed', 'unreached',
    ]);
    for (const cell of cells) expect(cell.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2B1B}-\u{2B1C}]/u);
  });
});
