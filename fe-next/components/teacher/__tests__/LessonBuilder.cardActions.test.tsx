/**
 * Every lesson card carries its own three verbs: Host, Practice, Results.
 *
 * The bar here is Blooket's dashboard, where each set on the landing screen has
 * Host / Solo / Assign on it and a teacher is three clicks from a running game.
 * Our card had Start Game plus three unlabelled icon buttons (edit, assign,
 * template settings), so hosting was fine but "let them practise it" and "how
 * did it go" were nowhere — they lived in a different tab behind a separate
 * Create Assignment step.
 *
 * Assign and the per-lesson template editor are gone from the card: creating a
 * lesson already assigns it to the chosen classroom, and the timer/board
 * settings are chosen on the Set Up Game screen a moment later anyway.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const push = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: unknown) => (typeof p === 'object' && p ? `${k}` : k),
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const LESSON = {
  id: 'lesson-1',
  name: 'Ecology Vocabulary',
  description: '',
  language: 'en',
  words: [{ word: 'osmosis', canIntegrate: true }],
  classroom_id: null as string | null,
};

const ASSIGNED_LESSON = { ...LESSON, id: 'lesson-2', classroom_id: 'c1' };

vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: () => ({
    lessons: [LESSON, ASSIGNED_LESSON],
    isLoading: false,
    createLesson: vi.fn(),
    updateLesson: vi.fn(),
  }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms: [{ id: 'c1', name: 'Class 1' }] }),
}));
vi.mock('@/hooks/useLessonDraft', () => ({
  useLessonDraft: () => ({
    hasRestorableDraft: false,
    saveDraft: vi.fn(),
    clearDraft: vi.fn(),
    restoreDraft: vi.fn(),
    draftAge: null,
  }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../LessonBuilderCreateDialog', () => ({ default: () => null }));
vi.mock('../LessonBuilderEditDialog', () => ({ default: () => null }));
vi.mock('../LessonBuilderDraftPrompt', () => ({ default: () => null }));
vi.mock('../lesson-creation', () => ({ BulkImportEnhanced: () => null }));
vi.mock('../StarterPacksSection', () => ({ StarterPacksSection: () => null }));

import LessonBuilder from '../LessonBuilder';

describe('LessonBuilder — lesson card actions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hosts the lesson straight from its card', () => {
    render(<LessonBuilder />);
    fireEvent.click(screen.getByTestId('lesson-host-lesson-1'));
    expect(push).toHaveBeenCalledWith('/en/education/classroom-game?lessonId=lesson-1');
  });

  it('sends students to self-paced practice for that lesson', () => {
    render(<LessonBuilder />);
    fireEvent.click(screen.getByTestId('lesson-practice-lesson-1'));
    expect(push).toHaveBeenCalledWith('/en/student/lessons/lesson-1');
  });

  it('opens the reports picker for a lesson with no classroom', () => {
    render(<LessonBuilder />);
    fireEvent.click(screen.getByTestId('lesson-results-lesson-1'));
    expect(push).toHaveBeenCalledWith('/en/teacher/reports');
  });

  it("opens that lesson's classroom report directly when it has one", () => {
    render(<LessonBuilder />);
    fireEvent.click(screen.getByTestId('lesson-results-lesson-2'));
    expect(push).toHaveBeenCalledWith('/en/teacher/reports?classroomId=c1');
  });

  it('names the classroom an assigned lesson went to, on its card', () => {
    render(<LessonBuilder />);
    expect(screen.getByTestId('lesson-classroom-lesson-2')).toHaveTextContent('Class 1');
    expect(screen.queryByTestId('lesson-classroom-lesson-1')).not.toBeInTheDocument();
  });

  it('says what a lesson is and what to do with it, above the list', () => {
    render(<LessonBuilder />);
    expect(screen.getByRole('heading', { name: 'teacher.lesson.sectionTitle' })).toBeInTheDocument();
    expect(screen.getByText('teacher.lesson.sectionHint')).toBeInTheDocument();
  });

  it('drops the assign and template-settings icon buttons', () => {
    render(<LessonBuilder />);
    expect(screen.queryByLabelText('teacher.lessons.assign.trigger')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('education.template.settings')).not.toBeInTheDocument();
  });
});
