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

describe('buildReviewRows — all native locales', () => {
  const es: ConnectionPuzzle[] = [{ id: 'es-e-001', word1: 'SOL', word2: 'CASA', bridge: 'LUZ', difficulty: 'easy' }];
  const sv: ConnectionPuzzle[] = [{ id: 'sv-e-001', word1: 'SOL', word2: 'HUS', bridge: 'LJUS', difficulty: 'easy' }];
  const ja: ConnectionPuzzle[] = [{ id: 'ja-e-001', word1: '太陽', word2: '家', bridge: '光', difficulty: 'easy' }];

  it('includes es/sv/ja rows when their pools are supplied', () => {
    const rows = buildReviewRows({ he, en, es, sv, ja });
    expect(rows).toHaveLength(7);
    expect(rows.find((x) => x.id === 'es-e-001')!.language).toBe('es');
    expect(rows.find((x) => x.id === 'sv-e-001')!.language).toBe('sv');
    expect(rows.find((x) => x.id === 'ja-e-001')!.language).toBe('ja');
  });

  it('filters by a non-en/he language', () => {
    const rows = buildReviewRows({ he, en, es, sv, ja });
    expect(filterRows(rows, { language: 'ja', difficulty: 'all', source: 'all', status: 'all' }, {}).map((r) => r.id)).toEqual(['ja-e-001']);
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
