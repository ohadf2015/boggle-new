/**
 * GridComponent — combo re-render guard (MP INP perf)
 *
 * Real RUM: /multiplayer word submit = 414-753ms client INP processing on mobile.
 * Root cause: comboLevel changes on every accepted word (same socket event as
 * foundWords), and comboLevel/comboColors/escalationCombo were passed to ALL 16
 * memoized GridCells — so every tile re-rendered each word, even though combo
 * visuals are SELECTED-only (GridCellEffects returns null when !isSelected;
 * GridCell only reads combo props behind isSelected guards). At submit the
 * selection has cleared, so all cells are non-selected and re-rendered for combo
 * they never display.
 *
 * Fix: clamp combo props to stable values for non-selected cells (mirrors the
 * existing `hasAnySelection` 0/1 clamp). This test asserts a comboLevel change
 * with no active selection does NOT re-render the (non-selected) cells.
 */

/* eslint-disable react-hooks/immutability -- intentional render-count instrumentation in a mocked test component */
import React, { memo } from 'react';
import { render } from '@testing-library/react';
import GridComponent from '../GridComponent';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Count renders per cell. The mock is memo'd so it shallow-compares props exactly
// like the real GridCell — a re-render only happens when GridComponent passes
// changed props to that cell.
const renderCounts: Record<string, number> = {};
vi.mock('../grid/GridCell', () => {
  const MockGridCell = memo((props: { row: number; col: number; cell: string }) => {
    const key = `${props.row}-${props.col}`;
    renderCounts[key] = (renderCounts[key] || 0) + 1;
    return <div data-testid={`cell-${key}`}>{props.cell}</div>;
  });
  MockGridCell.displayName = 'MockGridCell';
  return { __esModule: true, default: MockGridCell };
});

vi.mock('framer-motion', () => {
  const passthrough = ({ children, initial, animate, exit, whileTap, transition, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  );
  const passthroughSpan = ({ children, initial, animate, exit, whileTap, transition, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <span {...props}>{children}</span>
  );
  return {
    m: { div: passthrough, span: passthroughSpan },
    motion: { div: passthrough, span: passthroughSpan },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    LazyMotion: ({ children }: React.PropsWithChildren) => <>{children}</>,
    domAnimation: {},
    domMax: {},
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
    useReducedMotion: () => false,
  };
});

vi.mock('@/contexts/AccessibilityContext', () => ({
  useSuppressTimerUrgency: () => false,
  useDisableFireRoundLights: () => false,
  useDisableEarthquakeEffects: () => false,
  useLargeLetters: () => false,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playLetterSelectSound: vi.fn() }),
}));

vi.mock('../../hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

// Stable refs — the real hook deliberately returns frozen refs at idle so a
// parent re-render doesn't defeat GridCell.memo. The mock must do the same, else
// it injects per-render churn that masks what we're measuring.
const STABLE_ZERO_OFFSET = { x: 0, y: 0, rotate: 0, scale: 1, delay: 0 };
const STABLE_PHASE_ANIM = {};
const STABLE_GET_SHAKE = () => STABLE_ZERO_OFFSET;
const STABLE_EARTHQUAKE = {
  earthquakePhase: 'idle',
  earthquakeParticles: [],
  earthquakeDust: [],
  showCracks: false,
  dustPhase: 'idle',
  getShakeOffset: STABLE_GET_SHAKE,
  getPhaseAnimation: STABLE_PHASE_ANIM,
  useEnhancedMode: false,
};
vi.mock('../../hooks/useEarthquakeAnimation', () => ({
  useEarthquakeAnimation: () => STABLE_EARTHQUAKE,
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

const mockGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

describe('GridComponent — combo re-render guard', () => {
  beforeEach(() => {
    for (const k of Object.keys(renderCounts)) delete renderCounts[k];
  });

  it('does NOT re-render non-selected cells when comboLevel changes (word accepted)', () => {
    const { rerender } = render(
      <GridComponent grid={mockGrid} interactive comboLevel={0} />,
      { wrapper: TestWrapper },
    );

    const baseline = { ...renderCounts };
    expect(Object.keys(baseline).length).toBe(16); // all cells mounted once

    // A word is accepted: comboLevel bumps. No cells are selected (selection
    // clears on submit). The grid must NOT repaint every tile for combo they
    // don't display.
    rerender(<GridComponent grid={mockGrid} interactive comboLevel={4} />);

    const churned = Object.keys(renderCounts).filter(
      (k) => renderCounts[k] > (baseline[k] ?? 0),
    );
    expect(churned).toEqual([]);
  });
});
