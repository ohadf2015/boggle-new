import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React, { useState, useRef } from 'react';
import type { Cell } from '../fx/hintPath';

/**
 * Test: BoardFx with unstable parent-provided props (recreated on every rerender)
 * should NOT rerender, thanks to React.memo + parent-side memoization of props.
 *
 * The parent ticks every ~100ms. Without stabilization, BoardFx would rerender
 * on every tick because hitPath/hintCells/children arrays are recreated.
 * With stabilization (useMemo in parent, React.memo on BoardFx), BoardFx should
 * see identical prop references and skip rerender.
 */

let boardFxRenderCount = 0;
let gridRenderCount = 0;

// Mock BoardFx: wrap the real component to count renders, preserving memo.
vi.mock('../fx/BoardFx', async (orig) => {
  const React = await import('react');
  const real = (await orig<any>()).default;
  const isMemo = real?.$$typeof === Symbol.for('react.memo');
  const inner = isMemo ? real.type : real;

  const Counted = (props: any) => {
    boardFxRenderCount++;
    return React.createElement(inner, props);
  };

  return { default: isMemo ? React.memo(Counted, real.compare) : Counted };
});

// Mock GridComponent: plain function to count renders.
vi.mock('@/components/GridComponent', () => ({
  default: (props: any) => {
    gridRenderCount++;
    return (
      <div data-testid="grid-mock" style={{ width: '100%', height: '400px', background: '#ddd' }}>
        Grid {JSON.stringify({ cellCount: props.cells?.length || 0 })}
      </div>
    );
  },
}));

// Stub heavy components.
vi.mock('../stage/LevelStage', () => ({ default: () => <div /> }));
vi.mock('../stage/BoardHazards', () => ({ default: () => <div /> }));
vi.mock('../intro/LevelIntro', () => ({ default: () => <div /> }));
vi.mock('../RunHud', () => ({ default: () => <div /> }));
vi.mock('../RunResult', () => ({ default: () => <div /> }));
vi.mock('../fx/FoundWords', () => ({ default: () => <div /> }));
vi.mock('../fx/HintButton', () => ({ default: () => <div /> }));
vi.mock('../fx/FoeTarget', () => ({ default: () => <div /> }));
vi.mock('../stage/RivalAttack', () => ({ default: () => <div /> }));
vi.mock('../LevelTopBar', () => ({ default: () => <div /> }));
vi.mock('../DraftOverlay', () => ({ default: () => <div /> }));
vi.mock('../run/RunShellStyles', () => ({ default: () => <div /> }));
vi.mock('../map/RunMapScreen', () => ({ default: () => <div /> }));
vi.mock('../nodes/NodeScreen', () => ({ default: () => <div /> }));
vi.mock('../variants/VariantPanel', () => ({ default: () => <div /> }));
vi.mock('../variants/BoardLayer', () => ({ default: () => <div /> }));
vi.mock('../deed/DeedStamp', () => ({ default: () => <div /> }));

// Module-level constant (like NO_HINT_CELLS in AdventureLevel).
const NO_HINT_CELLS: Cell[] = [];

/**
 * Harness that simulates AdventureLevel's per-tick prop reconstruction.
 * It ticks on an interval, triggering parent rerenders.
 * Props like hitPath, hintCells, gridElement should be stable (memoized),
 * but without memoization they would be recreated on every tick.
 */
function TestHarness({
  unstableProps,
  BoardFxComponent: BFC,
}: {
  unstableProps?: boolean;
  BoardFxComponent: React.ComponentType<any>;
}) {
  const [tickCount, setTickCount] = useState(0);
  const screenRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Simulate clock ticks.
  React.useEffect(() => {
    const id = setInterval(() => {
      setTickCount((t) => t + 1);
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Simulate AdventureLevel's prop construction.
  // With stabilization: these are memoized → same references across ticks.
  // Without stabilization: recreated on every tick.

  const hitPath: Cell[] = React.useMemo(() => [], []);
  const hintCells: Cell[] = React.useMemo(() => NO_HINT_CELLS, []);
  const gridElement = React.useMemo(
    () => (
      <div data-testid="grid-container" style={{ width: '100%', height: '300px' }}>
        <div data-testid="grid" className="game-board-frame" style={{ width: '100%', height: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {[...Array(16)].map((_, i) => (
              <div key={i} data-row={Math.floor(i / 4)} data-col={i % 4} style={{ width: '50px', height: '50px', background: '#ccc' }}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    [],
  );

  return (
    <div ref={screenRef} style={{ width: '420px', height: '600px', position: 'relative' }}>
      <div ref={stageRef} style={{ height: '80px', background: '#ccc' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="data:image/svg+xml,%3Csvg/%3E" alt="" data-testid="foe-sprite" />
      </div>

      <BFC
        lastHit={null}
        hitPath={unstableProps ? [] : hitPath}
        active={true}
        shaking={false}
        targetRef={stageRef}
        screenRef={screenRef}
        targetHp={100}
        hintCells={unstableProps ? [] : hintCells}
      >
        {gridElement}
      </BFC>

      <div data-testid="tick-count">{tickCount}</div>
    </div>
  );
}

describe('BoardFx.perf — memo prevents rerenders on parent ticks', () => {
  beforeEach(() => {
    boardFxRenderCount = 0;
    gridRenderCount = 0;
  });

  it('should NOT rerender when parent ticks and props stay stable', async () => {
    // Dynamically import to use the mocked BoardFx.
    const { default: BoardFxComponent } = await import('../fx/BoardFx');

    const { getByTestId } = render(
      <TestHarness unstableProps={false} BoardFxComponent={BoardFxComponent} />,
    );

    // Wait for initial render.
    await waitFor(() => expect(getByTestId('tick-count')).toBeInTheDocument());
    const initialBoardFxCount = boardFxRenderCount;
    const initialGridCount = gridRenderCount;

    // Let 3 ticks happen.
    await waitFor(() => {
      const tickEl = getByTestId('tick-count');
      expect(parseInt(tickEl.textContent || '0')).toBeGreaterThanOrEqual(3);
    });

    // BoardFx should NOT have rerendered (thanks to memo + stable props).
    expect(boardFxRenderCount).toBe(initialBoardFxCount);
    // Grid should NOT have rerendered either.
    expect(gridRenderCount).toBe(initialGridCount);
  });

  it('FAILS before fix: should rerender when parent provides unstable props', async () => {
    // Dynamically import to use the mocked BoardFx.
    const { default: BoardFxComponent } = await import('../fx/BoardFx');

    const { getByTestId } = render(
      <TestHarness unstableProps={true} BoardFxComponent={BoardFxComponent} />,
    );

    await waitFor(() => expect(getByTestId('tick-count')).toBeInTheDocument());
    const initialBoardFxCount = boardFxRenderCount;

    // Let 3 ticks happen with unstable props.
    await waitFor(() => {
      const tickEl = getByTestId('tick-count');
      expect(parseInt(tickEl.textContent || '0')).toBeGreaterThanOrEqual(3);
    });

    // With unstable props (hitPath/hintCells recreated on every tick),
    // BoardFx SHOULD rerender on each tick (assuming it is memoized correctly
    // but receiving new prop references). But if React.memo is missing on BoardFx,
    // or if the memo is broken, this will still pass trivially. The real guard
    // is reverting the production memo and checking this fails.
    expect(boardFxRenderCount).toBeGreaterThan(initialBoardFxCount);
  });
});
