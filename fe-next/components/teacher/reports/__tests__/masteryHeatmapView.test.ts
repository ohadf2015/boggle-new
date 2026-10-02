import { describe, it, expect } from 'vitest';
import { buildClassMastery } from '@/lib/education/wordMasteryTrend';
import { buildWordMasteryReport } from '@/lib/education/wordMasteryReport';
import { buildHeatmapView, cellTone, shortNames } from '../masteryHeatmapView';

const session = (studentId: string, asked: string[], found: string[]) => ({
  studentId,
  startedAt: '2026-09-01T10:00:00Z',
  results: { gameCode: 'G', lessonWordsAsked: asked, lessonWordsFound: found },
});

describe('cellTone', () => {
  it('maps accuracy to solid / shaky / missed / unseen', () => {
    expect(cellTone({ attempts: 4, correct: 4 })).toBe('solid');
    expect(cellTone({ attempts: 4, correct: 2 })).toBe('shaky');
    expect(cellTone({ attempts: 4, correct: 1 })).toBe('missed');
    expect(cellTone(undefined)).toBe('unseen');
    expect(cellTone({ attempts: 0, correct: 0 })).toBe('unseen');
  });
});

describe('shortNames', () => {
  it('uses the first name only', () => {
    expect(shortNames({ a: 'Maya Cohen', b: '  Noa  ' })).toEqual({ a: 'Maya', b: 'Noa' });
  });

  it('adds a last initial when two students share a first name', () => {
    expect(shortNames({ a: 'Maya Cohen', b: 'Maya Levi', c: 'Dan' })).toEqual({ a: 'Maya C.', b: 'Maya L.', c: 'Dan' });
  });

  it('keeps a single-word name whole even when another student shares it', () => {
    expect(shortNames({ a: 'Maya', b: 'Maya Levi' })).toEqual({ a: 'Maya', b: 'Maya L.' });
  });
});

describe('buildHeatmapView', () => {
  const words = ['bridge', 'castle', 'eagle'];
  const report = buildWordMasteryReport(
    buildClassMastery([
      session('s1', words, []),
      session('s2', words, ['eagle']),
      session('s3', words, ['bridge', 'castle', 'eagle']),
    ]),
  );
  const view = buildHeatmapView(report, { s1: 'Zoe Adler', s2: 'Avi Ben', s3: 'Noa Katz' }, 'Student');

  it('counts per word how many of the asked students missed it, hardest first', () => {
    const bridge = view.words.find((w) => w.word === 'bridge')!;
    expect(bridge.missedBy).toEqual(['Zoe', 'Avi']);
    expect(bridge.asked).toBe(3);
    const eagle = view.words.find((w) => w.word === 'eagle')!;
    expect(eagle.missedBy).toEqual(['Zoe']);
    expect(view.words.map((w) => w.missedBy.length)).toEqual([...view.words.map((w) => w.missedBy.length)].sort((a, b) => b - a));
  });

  it('gives each student a needs-help count and puts the students who need most help first', () => {
    expect(view.students.map((s) => [s.name, s.needsHelp])).toEqual([
      ['Zoe', 3],
      ['Avi', 2],
      ['Noa', 0],
    ]);
    expect(view.students[0].fullName).toBe('Zoe Adler');
  });

  it('falls back to the localized unknown-student label', () => {
    const anon = buildHeatmapView(report, {}, 'Student');
    expect(anon.students.every((s) => s.name === 'Student')).toBe(true);
  });
});
