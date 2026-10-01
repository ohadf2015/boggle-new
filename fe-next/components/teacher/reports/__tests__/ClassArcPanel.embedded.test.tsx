import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ClassMastery } from '@/lib/education/wordMasteryTrend';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));

let mastery: ClassMastery | null = null;
let masteryLoading = false;
let masteryError: Error | null = null;
vi.mock('@/hooks/useWordMasteryTrend', () => ({
  useWordMasteryTrend: () => ({ mastery, isLoading: masteryLoading, error: masteryError, refresh: vi.fn() }),
}));

const getClassroomStudents = vi.fn();
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: (...a: unknown[]) => getClassroomStudents(...a),
}));

const createLesson = vi.fn();
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: () => ({ createLesson }),
}));

const createLessonAndAssign = vi.fn();
vi.mock('@/lib/education/createLessonWithAssignment', () => ({
  createLessonAndAssign: (...a: unknown[]) => createLessonAndAssign(...a),
}));


import { ClassArcPanel } from '../ClassArcPanel';

const props = { classroomId: 'c1', classroomName: 'Band 2', classroomLanguage: 'en' as const, onStudentClick: vi.fn() };

describe('ClassArcPanel embedded in a report disclosure', () => {
  beforeEach(() => {
    masteryLoading = true;
    getClassroomStudents.mockReturnValue(new Promise(() => {}));
  });

  it('drops its own card chrome and visible title when the disclosure already frames it', () => {
    render(<ClassArcPanel {...props} embedded />);
    const panel = screen.getByTestId('class-arc-panel');
    expect(panel).not.toHaveClass('shadow-hard');
    expect(screen.getByRole('heading', { name: 'teacher.reports.arc.title' })).toHaveClass('sr-only');
    expect(panel).toHaveAccessibleName('teacher.reports.arc.title');
  });

  it('stays a standalone card by default', () => {
    render(<ClassArcPanel {...props} />);
    expect(screen.getByTestId('class-arc-panel')).toHaveClass('shadow-hard');
    expect(screen.getByRole('heading', { name: 'teacher.reports.arc.title' })).not.toHaveClass('sr-only');
  });
});
