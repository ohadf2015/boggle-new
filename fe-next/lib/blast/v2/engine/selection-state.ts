import type { CellId } from '../types';
import { parseCell } from './cell-id';

export type SelectionState =
  | { kind: 'idle' }
  | { kind: 'active'; cells: CellId[]; axis: 'H' | 'V' | 'undecided'; mode: 'drag' | 'tap' };

export type SelectionEvent =
  | { type: 'pointerdown'; cell: CellId; mode: 'drag' }
  | { type: 'pointermove'; cell: CellId }
  | { type: 'pointerup' }
  | { type: 'tap'; cell: CellId }
  | { type: 'doubletap'; cell: CellId }
  | { type: 'cancel' };

export type SelectionTransition =
  | { state: SelectionState; submit?: false }
  | { state: SelectionState; submit: true; cells: CellId[]; axis: 'H' | 'V' };

function detectAxis(last: CellId, cand: CellId): 'H' | 'V' | null {
  const a = parseCell(last);
  const b = parseCell(cand);
  if (a.col === b.col && Math.abs(a.row - b.row) === 1) return 'V';
  if (a.row === b.row && Math.abs(a.col - b.col) === 1) return 'H';
  return null;
}

function isStraightExtension(cells: CellId[], cand: CellId, axis: 'H' | 'V'): boolean {
  if (cells.length === 0) return true;
  const last = parseCell(cells[cells.length - 1]!);
  const c = parseCell(cand);
  if (axis === 'H') return c.row === last.row && Math.abs(c.col - last.col) === 1;
  return c.col === last.col && Math.abs(c.row - last.row) === 1;
}

export function reduceSelection(state: SelectionState, event: SelectionEvent): SelectionTransition {
  if (event.type === 'cancel') return { state: { kind: 'idle' } };

  if (state.kind === 'idle') {
    if (event.type === 'pointerdown') {
      return { state: { kind: 'active', cells: [event.cell], axis: 'undecided', mode: 'drag' } };
    }
    if (event.type === 'tap') {
      return { state: { kind: 'active', cells: [event.cell], axis: 'undecided', mode: 'tap' } };
    }
    return { state };
  }

  if (event.type === 'pointermove' || event.type === 'tap') {
    if (state.cells.includes(event.cell)) return { state };
    if (state.axis === 'undecided') {
      const ax = detectAxis(state.cells[state.cells.length - 1]!, event.cell);
      if (!ax) return { state };
      return { state: { ...state, cells: [...state.cells, event.cell], axis: ax } };
    }
    if (!isStraightExtension(state.cells, event.cell, state.axis)) return { state };
    return { state: { ...state, cells: [...state.cells, event.cell] } };
  }

  if (event.type === 'pointerup' && state.mode === 'drag') {
    if (state.cells.length >= 2 && state.axis !== 'undecided') {
      return { state: { kind: 'idle' }, submit: true, cells: state.cells, axis: state.axis };
    }
    return { state: { kind: 'idle' } };
  }

  if (event.type === 'doubletap' && state.mode === 'tap') {
    if (state.cells.length >= 2 && state.axis !== 'undecided') {
      return { state: { kind: 'idle' }, submit: true, cells: state.cells, axis: state.axis };
    }
    return { state: { kind: 'idle' } };
  }

  return { state };
}
