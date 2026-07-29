import { describe, it, expect } from 'vitest';
import { reduceSelection, type SelectionState, type SelectionEvent } from '../selection-state';
import { cellId } from '../cell-id';

describe('selection state machine', () => {
  it('idle + pointerdown starts active drag', () => {
    const state: SelectionState = { kind: 'idle' };
    const result = reduceSelection(state, { type: 'pointerdown', cell: cellId(0, 0), mode: 'drag' });
    expect(result.state.kind).toBe('active');
    if (result.state.kind === 'active') {
      expect(result.state.cells).toEqual([cellId(0, 0)]);
      expect(result.state.axis).toBe('undecided');
      expect(result.state.mode).toBe('drag');
    }
    expect(result.submit).not.toBe(true);
  });

  it('active drag on adjacent horizontal cell sets H axis', () => {
    const state: SelectionState = { kind: 'active', cells: [cellId(0, 0)], axis: 'undecided', mode: 'drag' };
    const result = reduceSelection(state, { type: 'pointermove', cell: cellId(1, 0) });
    expect(result.state.kind).toBe('active');
    if (result.state.kind === 'active') {
      expect(result.state.cells).toEqual([cellId(0, 0), cellId(1, 0)]);
      expect(result.state.axis).toBe('H');
    }
  });

  it('active drag on non-collinear cell is rejected', () => {
    const state: SelectionState = { kind: 'active', cells: [cellId(0, 0)], axis: 'undecided', mode: 'drag' };
    const result = reduceSelection(state, { type: 'pointermove', cell: cellId(1, 1) });
    expect(result.state).toEqual(state);
  });

  it('drag with >=2 cells and axis decided submits on pointerup', () => {
    const state: SelectionState = { kind: 'active', cells: [cellId(0, 0), cellId(1, 0)], axis: 'H', mode: 'drag' };
    const result = reduceSelection(state, { type: 'pointerup' });
    expect(result.state.kind).toBe('idle');
    expect(result.submit).toBe(true);
    if (result.submit) {
      expect(result.cells).toEqual([cellId(0, 0), cellId(1, 0)]);
      expect(result.axis).toBe('H');
    }
  });

  it('drag with <2 cells cancels on pointerup', () => {
    const state: SelectionState = { kind: 'active', cells: [cellId(0, 0)], axis: 'undecided', mode: 'drag' };
    const result = reduceSelection(state, { type: 'pointerup' });
    expect(result.state.kind).toBe('idle');
    expect(result.submit).not.toBe(true);
  });

  it('idle + tap starts active tap mode', () => {
    const state: SelectionState = { kind: 'idle' };
    const result = reduceSelection(state, { type: 'tap', cell: cellId(2, 3) });
    expect(result.state.kind).toBe('active');
    if (result.state.kind === 'active') {
      expect(result.state.cells).toEqual([cellId(2, 3)]);
      expect(result.state.mode).toBe('tap');
    }
  });

  it('tap on adjacent extends selection', () => {
    const state: SelectionState = { kind: 'active', cells: [cellId(0, 0), cellId(1, 0)], axis: 'H', mode: 'tap' };
    const result = reduceSelection(state, { type: 'tap', cell: cellId(2, 0) });
    expect(result.state.kind).toBe('active');
    if (result.state.kind === 'active') {
      expect(result.state.cells).toEqual([cellId(0, 0), cellId(1, 0), cellId(2, 0)]);
    }
  });

  it('doubletap with >=2 cells and axis decided submits', () => {
    const state: SelectionState = { kind: 'active', cells: [cellId(0, 0), cellId(0, 1)], axis: 'V', mode: 'tap' };
    const result = reduceSelection(state, { type: 'doubletap', cell: cellId(0, 1) });
    expect(result.state.kind).toBe('idle');
    expect(result.submit).toBe(true);
    if (result.submit) {
      expect(result.cells).toEqual([cellId(0, 0), cellId(0, 1)]);
      expect(result.axis).toBe('V');
    }
  });

  it('cancel from any state returns to idle', () => {
    const state: SelectionState = { kind: 'active', cells: [cellId(0, 0), cellId(1, 0)], axis: 'H', mode: 'drag' };
    const result = reduceSelection(state, { type: 'cancel' });
    expect(result.state.kind).toBe('idle');
    expect(result.submit).not.toBe(true);
  });
});
