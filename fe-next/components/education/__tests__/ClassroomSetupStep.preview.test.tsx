import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassroomSetupStep } from '../ClassroomSetupStep';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('../MultiLessonSelector', () => ({
  MultiLessonSelector: () => <div data-testid="lesson-selector" />,
}));

vi.mock('@/components/ui/WizardStep', () => ({
  WizardStep: ({ children }: any) => <div>{children}</div>,
}));

const classroom = { id: 'c1', name: 'Class 1', join_code: 'QWE789', language: 'en' } as any;
const lesson = {
  id: 'l1',
  name: 'Lesson 1',
  language: 'en',
  words: [{ word: 'apple', canIntegrate: true }],
} as any;

const baseProps = {
  classrooms: [classroom],
  lessons: [lesson],
  selectedClassroomId: 'c1',
  selectedLessonIds: ['l1'],
  allPlayableWords: ['apple'],
  gameMode: 'classic' as const,
  targetWord: '',
  minWordLength: 3,
  timerMinutes: 3,
  boardSize: 'medium' as const,
  isStarting: false,
  onSelectClassroom: vi.fn(),
  onSelectLessons: vi.fn(),
  onGameModeChange: vi.fn(),
  onTargetWordChange: vi.fn(),
  onMinWordLengthChange: vi.fn(),
  onTimerChange: vi.fn(),
  onBoardSizeChange: vi.fn(),
  onNext: vi.fn(),
  onBack: vi.fn(),
};

const previewButton = () =>
  screen.getByRole('button', { name: 'education.studentPreview.button' });

describe('ClassroomSetupStep — student preview', () => {
  it('disables the preview until a classroom and a lesson are selected', () => {
    const { rerender } = render(
      <ClassroomSetupStep {...baseProps} selectedLessonIds={[]} allPlayableWords={[]} />
    );
    expect(previewButton()).toBeDisabled();

    rerender(<ClassroomSetupStep {...baseProps} selectedClassroomId="" />);
    expect(previewButton()).toBeDisabled();

    rerender(<ClassroomSetupStep {...baseProps} />);
    expect(previewButton()).not.toBeDisabled();
  });

  it('opens the preview dialog with the selected classroom join code', () => {
    render(<ClassroomSetupStep {...baseProps} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(previewButton());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('student-preview-join-code')).toHaveTextContent('QWE789');
  });
});
