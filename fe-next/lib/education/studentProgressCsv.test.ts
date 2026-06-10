import { describe, it, expect } from 'vitest';
import { escapeCsvCell, studentsToCsv, type StudentCsvColumns } from './studentProgressCsv';
import type { StudentProgressSummary } from '@/lib/supabase/analytics';

const columns: StudentCsvColumns = {
  student: 'Student',
  level: 'Level',
  mastery: 'Mastery',
  accuracy: 'Accuracy',
  streak: 'Streak',
};

function makeStudent(overrides: Partial<StudentProgressSummary> = {}): StudentProgressSummary {
  return {
    studentId: 's1',
    displayName: 'Ada Lovelace',
    avatarUrl: null,
    totalXp: 1200,
    currentLevel: 4,
    vocabularyMastery: 87,
    overallAccuracy: 91,
    wordsAttempted: 120,
    wordsMastered: 104,
    lastPracticeDate: null,
    isStruggling: false,
    currentStreak: 5,
    ...overrides,
  };
}

describe('escapeCsvCell', () => {
  it('leaves a plain value untouched', () => {
    expect(escapeCsvCell('Ada')).toBe('Ada');
    expect(escapeCsvCell(42)).toBe('42');
  });

  it('quotes and escapes values containing commas, quotes, or newlines', () => {
    expect(escapeCsvCell('Smith, John')).toBe('"Smith, John"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('studentsToCsv', () => {
  it('emits a header row even with no students', () => {
    const csv = studentsToCsv([], columns);
    expect(csv).toBe('Student,Level,Mastery,Accuracy,Streak');
  });

  it('emits one data row per student with mastery/accuracy as percentages', () => {
    const csv = studentsToCsv([makeStudent()], columns);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe('Student,Level,Mastery,Accuracy,Streak');
    expect(row).toBe('Ada Lovelace,4,87%,91%,5');
  });

  it('escapes a display name that contains a comma so columns stay aligned', () => {
    const csv = studentsToCsv([makeStudent({ displayName: 'Lovelace, Ada' })], columns);
    const row = csv.split('\r\n')[1];
    expect(row).toBe('"Lovelace, Ada",4,87%,91%,5');
  });
});
