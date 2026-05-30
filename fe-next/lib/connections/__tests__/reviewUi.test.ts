import { describe, it, expect } from 'vitest';
import { sourceOf, buildReviewRows, filterRows } from '../reviewUi';
import type { ConnectionPuzzle } from '../types';

const he: ConnectionPuzzle[] = [
  { id: 'he-e-001', word1: 'עוגת', word2: 'חם', bridge: 'שוקולד', difficulty: 'easy' },
  { id: 'he-g-1', word1: 'תחליף', word2: 'בקר', bridge: 'בשר', difficulty: 'hard' },
  { id: 'he-o-006', word1: 'כלב', word2: 'תיכון', bridge: 'ים', difficulty: 'medium' },
];
const en: ConnectionPuzzle[] = [{ id: 'en-o-001', word1: 'SUN', word2: 'HOUSE', bridge: 'LIGHT', difficulty: 'easy' }];

describe('sourceOf', () => {
  it('classifies by id', () => {
    expect(sourceOf('he-g-1')).toBe('generated');
    expect(sourceOf('he-o-006')).toBe('online');
    expect(sourceOf('en-o-001')).toBe('online');
    expect(sourceOf('he-e-001')).toBe('curated');
  });
});

describe('buildReviewRows', () => {
  it('builds rows with language, source, and both phrases', () => {
    const rows = buildReviewRows({ he, en });
    expect(rows).toHaveLength(4);
    const r = rows.find((x) => x.id === 'he-o-006')!;
    expect(r.language).toBe('he');
    expect(r.source).toBe('online');
    expect(r.phrase1).toBe('כלב ים');
    expect(r.phrase2).toBe('ים תיכון');
    expect(rows.find((x) => x.id === 'en-o-001')!.language).toBe('en');
  });
});

describe('filterRows', () => {
  const rows = buildReviewRows({ he, en });
  const verdicts = { 'he-e-001': 'good', 'he-g-1': 'bad' };

  it('filters by language', () => {
    expect(filterRows(rows, { language: 'en', difficulty: 'all', source: 'all', status: 'all' }, verdicts)).toHaveLength(1);
  });
  it('filters by source', () => {
    expect(filterRows(rows, { language: 'all', difficulty: 'all', source: 'online', status: 'all' }, verdicts).map((r) => r.id).sort()).toEqual(['en-o-001', 'he-o-006']);
  });
  it('filters by difficulty', () => {
    expect(filterRows(rows, { language: 'all', difficulty: 'hard', source: 'all', status: 'all' }, verdicts).map((r) => r.id)).toEqual(['he-g-1']);
  });
  it('filters by review status (unreviewed = no verdict)', () => {
    const unreviewed = filterRows(rows, { language: 'all', difficulty: 'all', source: 'all', status: 'unreviewed' }, verdicts).map((r) => r.id).sort();
    expect(unreviewed).toEqual(['en-o-001', 'he-o-006']);
  });
  it('filters by a specific verdict', () => {
    expect(filterRows(rows, { language: 'all', difficulty: 'all', source: 'all', status: 'bad' }, verdicts).map((r) => r.id)).toEqual(['he-g-1']);
  });
});
