/**
 * BlastBoard — desktop idle auto-submit wiring.
 *
 * Blast desktop players who *click* tiles (instead of dragging) build a word
 * that stays selected with no obvious submit gesture. The double-click hint
 * (GridComponent, mode-independent) teaches the explicit gesture; this wires the
 * hands-free complement so a stalled click-built word submits on its own — the
 * same affordance the practice sandboxes already have.
 *
 * The auto-submit BEHAVIOR is covered by useGridInteraction.idleAutoSubmit.test.
 * This guards only that BlastBoard actually passes a sane `autoSubmitIdleMs`
 * through to GridComponent (regression guard against the prop being dropped).
 */
import { render } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';
import { DESKTOP_IDLE_AUTOSUBMIT_MS } from '@/components/grid/submitHintVisibility';
import type { LetterGrid } from '@/shared/types/game';

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedProps = props;
    return null;
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useEquippedCosmetic', () => ({
  useEquippedCosmetic: () => null,
}));

beforeEach(() => {
  capturedProps = null;
});

const grid: LetterGrid = [
  ['A', 'B'],
  ['C', 'D'],
];

function renderBoard() {
  return render(
    <BlastBoard
      grid={grid}
      tileStates={[]}
      gridSize={2}
      language="en"
      interactive
      onWordSubmit={vi.fn()}
      onPathSubmit={vi.fn()}
      onWordChange={vi.fn()}
    />,
  );
}

describe('BlastBoard desktop idle auto-submit', () => {
  it('passes the shared idle-auto-submit window to GridComponent', () => {
    renderBoard();
    expect(capturedProps).not.toBeNull();
    expect(capturedProps?.autoSubmitIdleMs).toBe(DESKTOP_IDLE_AUTOSUBMIT_MS);
  });

  it('uses a window with more grace than the practice sandbox (1000ms)', () => {
    // A blast click-builder hunting the next tile must not trip a premature
    // submit, so the window is deliberately longer than practice's teaching pace.
    expect(DESKTOP_IDLE_AUTOSUBMIT_MS).toBeGreaterThan(1000);
  });
});
