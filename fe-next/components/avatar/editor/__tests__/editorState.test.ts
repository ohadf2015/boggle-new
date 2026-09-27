import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_FEMALE_HAIR,
  FEMALE_HAIR_STYLES,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';
import {
  editorReducer,
  initEditorState,
  previewConfigOf,
  canUndo,
  HISTORY_LIMIT,
} from '../editorState';

const start: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, gender: 'male' };

describe('editorState — committed draft vs try-on', () => {
  it('Given a fresh editor, When nothing happens, Then preview = committed = initial and undo is off', () => {
    const s = initEditorState(start);
    expect(s.committed).toEqual(start);
    expect(previewConfigOf(s)).toEqual(start);
    expect(canUndo(s)).toBe(false);
  });

  it('set commits a field and records one undo step', () => {
    const s = editorReducer(initEditorState(start), { type: 'set', key: 'base', value: 'square' });
    expect(s.committed.base).toBe('square');
    expect(canUndo(s)).toBe(true);
    const back = editorReducer(s, { type: 'undo' });
    expect(back.committed).toEqual(start);
    expect(canUndo(back)).toBe(false);
  });

  it('setting the same value is a no-op (no empty undo step)', () => {
    const s0 = initEditorState(start);
    const s = editorReducer(s0, { type: 'set', key: 'base', value: start.base });
    expect(s).toBe(s0);
  });

  it('try-on shows the part in the preview but NEVER in committed (the saved config)', () => {
    const s = editorReducer(initEditorState(start), { type: 'tryOn', key: 'accessory', value: 'crystalCrown' });
    expect(previewConfigOf(s).accessory).toBe('crystalCrown');
    expect(s.committed.accessory).toBe(start.accessory);
    // try-on is not an undo step
    expect(canUndo(s)).toBe(false);
  });

  it('a real pick clears the try-on', () => {
    let s = editorReducer(initEditorState(start), { type: 'tryOn', key: 'accessory', value: 'crystalCrown' });
    s = editorReducer(s, { type: 'set', key: 'accessory', value: 'glasses' });
    expect(s.tryOn).toBeNull();
    expect(previewConfigOf(s).accessory).toBe('glasses');
  });

  it('clearTryOn restores the committed look', () => {
    let s = editorReducer(initEditorState(start), { type: 'tryOn', key: 'hair', value: 'lightning' });
    s = editorReducer(s, { type: 'clearTryOn' });
    expect(previewConfigOf(s)).toEqual(start);
  });

  it('undo also drops an active try-on', () => {
    let s = editorReducer(initEditorState(start), { type: 'set', key: 'base', value: 'square' });
    s = editorReducer(s, { type: 'tryOn', key: 'hair', value: 'lightning' });
    s = editorReducer(s, { type: 'undo' });
    expect(s.tryOn).toBeNull();
    expect(s.committed).toEqual(start);
  });

  it('switching gender to female swaps an unavailable hair and clears facial hair', () => {
    const maleOnlyHair = start.hair;
    const s0 = initEditorState({ ...start, facialHair: 'fullBeard' as CustomAvatarConfig['facialHair'] });
    const s = editorReducer(s0, { type: 'set', key: 'gender', value: 'female' });
    expect(s.committed.facialHair).toBe('none');
    if (!(FEMALE_HAIR_STYLES as readonly string[]).includes(maleOnlyHair)) {
      expect(s.committed.hair).toBe(DEFAULT_FEMALE_HAIR);
    }
  });

  it('randomize / restore replace the whole config as ONE undo step', () => {
    const other: CustomAvatarConfig = { ...start, base: 'square', mouth: 'grin' as CustomAvatarConfig['mouth'] };
    let s = editorReducer(initEditorState(start), { type: 'replace', config: other });
    expect(s.committed).toEqual(other);
    s = editorReducer(s, { type: 'undo' });
    expect(s.committed).toEqual(start);
  });

  it('caps history so a long session cannot grow unbounded', () => {
    let s = initEditorState(start);
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      s = editorReducer(s, { type: 'set', key: 'bgColor', value: i % 2 ? '#000000' : '#FFFFFF' });
    }
    expect(s.history.length).toBe(HISTORY_LIMIT);
  });

  it('reset starts over from a new initial config with empty history', () => {
    let s = editorReducer(initEditorState(start), { type: 'set', key: 'base', value: 'square' });
    s = editorReducer(s, { type: 'reset', config: DEFAULT_AVATAR_CONFIG });
    expect(s.committed).toEqual(DEFAULT_AVATAR_CONFIG);
    expect(canUndo(s)).toBe(false);
    expect(s.tryOn).toBeNull();
  });

  it('bumps a change counter on every visible change (drives the preview pop)', () => {
    const s0 = initEditorState(start);
    const s1 = editorReducer(s0, { type: 'set', key: 'base', value: 'square' });
    const s2 = editorReducer(s1, { type: 'tryOn', key: 'hair', value: 'lightning' });
    expect(s1.changeCount).toBeGreaterThan(s0.changeCount);
    expect(s2.changeCount).toBeGreaterThan(s1.changeCount);
  });
});

it('keeps the default female hair constant importable (guards the gender rule)', () => {
  expect(DEFAULT_FEMALE_HAIR).toBeTruthy();
});
