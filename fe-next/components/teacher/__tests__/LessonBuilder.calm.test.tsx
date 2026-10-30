import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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
vi.mock('../LessonBuilderDraftPrompt', () => ({ default: () => null }));
vi.mock('../lesson-creation', () => ({ BulkImportEnhanced: () => null }));
vi.mock('../StarterPacksSection', () => ({ StarterPacksSection: () => null }));

import LessonBuilder from '../LessonBuilder';

const COLOR_FILL = /(^|\s)bg-neo-(lime|cyan|pink|purple|orange|yellow|white|cream)(\/\d+)?(\s|$)/;
const fills = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLElement>('[class]')).filter((el) => COLOR_FILL.test(el.getAttribute('class') ?? ''));

describe('LessonBuilder: calm My lists', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given two lists, Then New list is the only colored fill and every card start button is outlined', () => {
    const { container } = render(<LessonBuilder />);
    expect(fills(container)).toEqual([screen.getByTestId('lessons-create')]);
    expect(screen.getByTestId('lesson-host-lesson-1')).toHaveTextContent('education.template.startGame');
  });

  it('Given the cards, Then no label shouts in uppercase and the language reads as a name', () => {
    const { container } = render(<LessonBuilder />);
    expect(container.querySelectorAll('.uppercase')).toHaveLength(0);
    expect(screen.getByTestId('my-list-lesson-1')).toHaveTextContent('English');
  });
});
