/**
 * Definitions travelling with the homework link — RED first.
 *
 * `missGapQuiz` can already build a 4-choice DEFINITION round, but nothing ever
 * handed it definitions: the share link carried only `missed=word,word`, so
 * every homework session was spelling-only. This module is the wire format —
 * compact enough to survive a WhatsApp link, lossless enough to rebuild the map.
 */
import { describe, it, expect } from 'vitest';
import {
  encodeMissGapDefinitions,
  parseMissGapDefinitions,
  MAX_MISS_GAP_DEFINITIONS,
} from '../missGapDefinitions';

describe('parseMissGapDefinitions', () => {
  it('reads word|definition pairs separated by ~', () => {
    expect(parseMissGapDefinitions('anchor|a heavy hook~quiver|to shake')).toEqual({
      anchor: 'a heavy hook',
      quiver: 'to shake',
    });
  });

  it('lower-cases the key so a capitalised word still matches', () => {
    expect(parseMissGapDefinitions('Bridge|a way across')).toEqual({
      bridge: 'a way across',
    });
  });

  it('drops pairs with no definition and empty input', () => {
    expect(parseMissGapDefinitions('anchor|~|lonely~bridge|a way across')).toEqual({
      bridge: 'a way across',
    });
    expect(parseMissGapDefinitions('')).toEqual({});
    expect(parseMissGapDefinitions(null)).toEqual({});
  });

  it('strips control characters and collapses whitespace', () => {
    expect(parseMissGapDefinitions('anchor|a  heavy hook ')).toEqual({
      anchor: 'a heavy hook',
    });
  });

  it('caps how many definitions a link can carry', () => {
    const many = Array.from({ length: MAX_MISS_GAP_DEFINITIONS + 5 }, (_, i) => `w${i}|d${i}`);
    expect(Object.keys(parseMissGapDefinitions(many.join('~')))).toHaveLength(
      MAX_MISS_GAP_DEFINITIONS,
    );
  });
});

describe('encodeMissGapDefinitions', () => {
  it('round-trips through parse', () => {
    const map = { anchor: 'a heavy hook', quiver: 'to shake' };
    expect(parseMissGapDefinitions(encodeMissGapDefinitions(map))).toEqual(map);
  });

  it('never emits a separator that would split a definition', () => {
    const encoded = encodeMissGapDefinitions({ tilde: 'a ~ and a | together' });
    expect(parseMissGapDefinitions(encoded)).toEqual({ tilde: 'a and a together' });
  });

  it('returns an empty string for an empty map', () => {
    expect(encodeMissGapDefinitions({})).toBe('');
  });

  it('only keeps definitions for words in the list when one is given', () => {
    const encoded = encodeMissGapDefinitions(
      { anchor: 'a heavy hook', spare: 'not assigned' },
      ['Anchor'],
    );
    expect(parseMissGapDefinitions(encoded)).toEqual({ anchor: 'a heavy hook' });
  });
});

/**
 * The link is the only channel: whatever the assignment knows has to survive a
 * copy-paste into WhatsApp, so the share URL must carry the definitions too.
 */
describe('miss-gap assignment share URL', () => {
  it('carries the definitions for the assigned words', async () => {
    const { buildMissGapAssignmentShareUrl } = await import('../missGapAsyncAssignment');
    const url = buildMissGapAssignmentShareUrl({
      locale: 'en',
      lesson: 'Week 3',
      teacher: 'Ms. G',
      found: 6,
      total: 10,
      missedWords: ['anchor', 'quiver'],
      dueDate: '2026-09-30',
      definitions: { anchor: 'a heavy hook', quiver: 'to shake', spare: 'unassigned' },
    });
    const defs = new URL(url).searchParams.get('defs') || '';
    expect(parseMissGapDefinitions(defs)).toEqual({
      anchor: 'a heavy hook',
      quiver: 'to shake',
    });
  });

  it('omits the parameter entirely when there are no definitions', async () => {
    const { buildMissGapAssignmentShareUrl } = await import('../missGapAsyncAssignment');
    const url = buildMissGapAssignmentShareUrl({
      locale: 'en',
      lesson: 'Week 3',
      teacher: 'Ms. G',
      found: 6,
      total: 10,
      missedWords: ['anchor'],
      dueDate: '2026-09-30',
    });
    expect(new URL(url).searchParams.has('defs')).toBe(false);
  });
});
