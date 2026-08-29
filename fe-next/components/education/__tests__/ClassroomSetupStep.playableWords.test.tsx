import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassroomSetupStep } from '../ClassroomSetupStep';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('../MultiLessonSelector', () => ({
  MultiLessonSelector: () => <div data-testid="lesson-selector" />,
}));

vi.mock('@/components/ui/WizardStep', () => ({
  WizardStep: ({ children, nextDisabled, nextLabel }: any) => (
    <div>
      <button data-testid="next" disabled={nextDisabled}>
        {nextLabel}
      </button>
      {children}
    </div>
  ),
}));

const classroom = { id: 'c1', name: 'Class 1' } as any;
const lesson = { id: 'l1', name: 'Lesson 1' } as any;

const baseProps = {
  classrooms: [classroom],
  lessons: [lesson],
  selectedClassroomId: 'c1',
  selectedLessonIds: ['l1'],
  gameMode: 'classic' as const,
  timerMinutes: 3,
  boardSize: 'medium' as const,
  isStarting: false,
  onSelectClassroom: vi.fn(),
  onSelectLessons: vi.fn(),
  onGameModeChange: vi.fn(),
  onTimerChange: vi.fn(),
  onBoardSizeChange: vi.fn(),
  onNext: vi.fn(),
  onBack: vi.fn(),
};

describe('ClassroomSetupStep — a lesson with nothing playable', () => {
  it('refuses to start when the selected lesson yields no playable words', () => {
    // Every word filtered out by canIntegrate. Previously the button stayed
    // enabled and the teacher got a game with no vocabulary and no reason why.
    render(<ClassroomSetupStep {...baseProps} allPlayableWords={[]} />);
    expect(screen.getByTestId('next')).toBeDisabled();
  });

  it('allows starting once the lesson contributes at least one word', () => {
    render(<ClassroomSetupStep {...baseProps} allPlayableWords={['apple']} />);
    expect(screen.getByTestId('next')).not.toBeDisabled();
  });

  it('still refuses when no classroom is selected, words or not', () => {
    render(
      <ClassroomSetupStep
        {...baseProps}
        selectedClassroomId=""
        allPlayableWords={['apple']}
      />
    );
    expect(screen.getByTestId('next')).toBeDisabled();
  });
});
