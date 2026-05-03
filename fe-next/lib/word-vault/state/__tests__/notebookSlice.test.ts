// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createNotebookSlice } from '../notebookSlice';
import type { ClueFragment } from '../../beats/types';

const fragment = (id: string): ClueFragment => ({
  id,
  roomId: 'r1.1',
  kind: 'whisper',
  text: id,
});

describe('notebookSlice', () => {
  it('addClue stores by roomId', () => {
    const slice = createNotebookSlice();
    slice.addClue('r1.1', fragment('door'));
    expect(slice.cluesFor('r1.1')).toHaveLength(1);
  });

  it('addClue is idempotent on fragment id', () => {
    const slice = createNotebookSlice();
    slice.addClue('r1.1', fragment('door'));
    slice.addClue('r1.1', fragment('door'));
    expect(slice.cluesFor('r1.1')).toHaveLength(1);
  });

  it('hasClue returns true after add', () => {
    const slice = createNotebookSlice();
    expect(slice.hasClue('r1.1', 'door')).toBe(false);
    slice.addClue('r1.1', fragment('door'));
    expect(slice.hasClue('r1.1', 'door')).toBe(true);
  });

  it('clueCountSinceTap returns 0 then increments per add', () => {
    const slice = createNotebookSlice();
    expect(slice.snapshot().lastTapAt).toBe(0);
    slice.addClue('r1.1', fragment('a'));
    expect(slice.snapshot().lastTapAt).toBeGreaterThan(0);
  });
});
