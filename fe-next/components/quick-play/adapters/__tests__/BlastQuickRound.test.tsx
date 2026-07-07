import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BlastQuickRound } from '../BlastQuickRound';
import type { QuickRoundConfig } from '../../types';

const lastBlastGameProps = { current: null as any };

vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: (props: any) => {
    lastBlastGameProps.current = props;
    return <div data-testid="mock-blast-game">mock</div>;
  },
}));

const config: QuickRoundConfig = {
  mode: 'blast',
  seed: 's-1',
  language: 'en',
  durationSec: 60,
  grid: [
    ['A', 'B'],
    ['C', 'D'],
  ],
  totalWords: 5,
  perfectScore: 100,
};

// Regression test: Quick Play's Blast round is meant to be a bounded "bare
// board" — words clear and STAY cleared, the board shrinks toward empty.
// Sibling multiplayer implementations (BlastView.tsx, useBlastMultiplayerBridge)
// both set boardClearMode: 'shrink' for this exact scenario. Without it, the
// engine defaults to 'refill' — every cleared tile is replaced by a new one
// falling from the top, so the board never empties and looks like tiles
// "keep showing up instead of disappearing".
describe('BlastQuickRound', () => {
  beforeEach(() => {
    lastBlastGameProps.current = null;
  });

  it('configures the engine to shrink the board instead of refilling it', async () => {
    render(<BlastQuickRound config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    await waitFor(() => expect(lastBlastGameProps.current).not.toBeNull());
    expect(lastBlastGameProps.current.config.boardClearMode).toBe('shrink');
  });
});
