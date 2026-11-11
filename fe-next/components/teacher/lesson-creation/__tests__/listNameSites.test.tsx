import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/lesson-creation/ListNameButton', () => ({
  default: ({ lessonId, name }: { lessonId: string; name: string }) => <span data-testid="list-name" data-id={lessonId}>{name}</span>,
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 't1' } }) }));
vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: () => ({
    assignments: [{ id: 'a1', lesson_id: 'l1', due_date: '2026-11-16T00:00:00+00:00', created_at: '2026-11-09T10:00:00Z', completion_count: 1, student_count: 3, vocabulary_lessons: { name: 'Planets' } }],
    isLoading: false, error: null, createAssignment: vi.fn(),
  }),
}));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: vi.fn() }));
vi.mock('@/components/teacher/assignments/AssignmentCreatorDueDate', () => ({ localDayPlus: (n: number) => (n === 0 ? '2026-11-09' : '2026-11-16') }));

import { ClassWordLists } from '@/components/teacher/classroom/page/ClassPageBlocks';
import { HomeWeekChallenge } from '@/components/teacher/home/HomeWeekChallenge';
import { LobbyQuickSummary } from '@/components/education/lobby/LobbyQuickSummary';

const t = ((k: string) => k) as never;
const ids = () => screen.getAllByTestId('list-name').map((n) => n.getAttribute('data-id'));

describe('word-list names open the list', () => {
  it('Given the class page lists, Then each name opens its list', () => {
    render(<ClassWordLists lists={[{ id: 'l1', name: 'Planets', wordCount: 3 }, { id: 'l2', name: 'Weather', wordCount: 2 }] as never} loading={false} libraryHref="/x" t={t} />);
    expect(ids()).toEqual(['l1', 'l2']);
  });

  it('Given an open week challenge, Then its list name opens the list', () => {
    render(<HomeWeekChallenge classroomId="c1" classLanguage="en" lessons={[]} preferredLessonId={null} resultsHref="/r" onPickList={vi.fn()} language="en" t={t} />);
    expect(ids()).toEqual(['l1']);
  });

  it('Given a quick lobby, Then every selected list name opens its list', () => {
    render(<LobbyQuickSummary classroomName="5A" lessons={[{ id: 'l1', name: 'Planets' }, { id: 'l2', name: 'Weather' }]} wordCount={5} onMoreOptions={vi.fn()} />);
    expect(ids()).toEqual(['l1', 'l2']);
  });
});
