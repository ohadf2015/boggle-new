import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { pickLesson } from './__tests__/pickLesson';
import AssignmentCreator from './AssignmentCreator';

vi.mock('@/hooks/useAssignments', () => ({ useAssignments: () => ({ createAssignment: vi.fn(), assignments: [] }) }));
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: () => ({
    lessons: [
      { id: 'he-1', name: 'חיות', language: 'he', words: [{ word: 'כלב' }, { word: 'חתול' }] },
      { id: 'ru-1', name: 'Животные', language: 'ru', words: [{ word: 'кошка' }, { word: 'собака' }] },
    ],
    isLoading: false,
    createLesson: vi.fn(),
  }),
}));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms: [{ id: 'classroom-1', name: 'Period 1', language: 'en', member_count: 3 }] }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' }, isLoading: false }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key), language: 'en' }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('react-hot-toast', () => ({ __esModule: true, default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

const renderIt = () => render(<AssignmentCreator classroomId="classroom-1" onComplete={vi.fn()} isOpen onClose={vi.fn()} />);

describe('AssignmentCreator — the selected lesson decides the language', () => {
  it('Given a Hebrew lesson in an English-default class, Then the template gallery opens on Hebrew templates', () => {
    renderIt();
    pickLesson('he-1');
    fireEvent.click(screen.getByTestId('assignment-browse-templates'));
    const checked = screen.getAllByRole('radio').find((r) => (r as HTMLInputElement).checked) as HTMLInputElement;
    expect(checked.value).toBe('he');
    expect(screen.getAllByTestId(/^assignment-template-he-/).length).toBeGreaterThan(0);
  });

  it('Given a Russian lesson, Then Word Craft is offered and stays the default', () => {
    renderIt();
    pickLesson('ru-1');
    expect(screen.getByTestId('assignment-mode-wordcraft')).not.toBeDisabled();
    expect(screen.getByTestId('assignment-mode-wordcraft')).toHaveAttribute('aria-pressed', 'true');
  });
});
