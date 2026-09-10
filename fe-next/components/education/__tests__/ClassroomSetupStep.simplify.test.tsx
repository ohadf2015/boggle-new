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

vi.mock('../ClassroomModeSettings', () => ({
  ClassroomModeSettings: () => <div data-testid="mode-settings" />,
}));

vi.mock('../ClassroomBattleSettings', () => ({
  ClassroomBattleSettings: () => <div data-testid="battle-settings" />,
}));

vi.mock('@/components/ui/WizardStep', () => ({
  WizardStep: ({ children, nextLabel }: { children: React.ReactNode; nextLabel?: string }) => (
    <div>
      <button type="button" data-testid="next">{nextLabel}</button>
      {children}
    </div>
  ),
}));

const classroomA = { id: 'c1', name: 'Period 1', join_code: 'AAA111', language: 'en', member_count: 22 } as any;
const classroomB = { id: 'c2', name: 'Period 2', join_code: 'BBB222', language: 'en', member_count: 18 } as any;
const lesson = {
  id: 'l1',
  name: 'Week 3',
  language: 'en',
  words: [{ word: 'apple', canIntegrate: true }],
} as any;

const baseProps = {
  classrooms: [classroomA],
  lessons: [lesson],
  selectedClassroomId: 'c1',
  selectedLessonIds: ['l1'],
  allPlayableWords: ['apple'],
  gameMode: 'classic' as const,
  targetWord: '',
  minWordLength: 3,
  vocabQuizFocus: 'any' as const,
  vocabQuizQuestionCount: 8,
  vocabQuizSeconds: 15,
  timerMinutes: 3,
  boardSize: 'small' as const,
  isStarting: false,
  activePreset: 'standard' as const,
  playStyle: 'ffa' as const,
  teamCount: 2,
  accessibility: {},
  onApplyPreset: vi.fn(),
  onPlayStyleChange: vi.fn(),
  onTeamCountChange: vi.fn(),
  onAccessibilityChange: vi.fn(),
  onSelectClassroom: vi.fn(),
  onSelectLessons: vi.fn(),
  onGameModeChange: vi.fn(),
  onVocabQuizFocusChange: vi.fn(),
  onVocabQuizQuestionCountChange: vi.fn(),
  onVocabQuizSecondsChange: vi.fn(),
  onTargetWordChange: vi.fn(),
  onMinWordLengthChange: vi.fn(),
  onTimerChange: vi.fn(),
  onBoardSizeChange: vi.fn(),
  onNext: vi.fn(),
  onBack: vi.fn(),
};

describe('ClassroomSetupStep — 3-tap start, defaults over config', () => {
  it('keeps ritual presets on the primary surface', () => {
    render(<ClassroomSetupStep {...baseProps} />);
    expect(screen.getByTestId('preset-standard')).toBeInTheDocument();
    expect(screen.getByTestId('preset-friday-battle')).toBeInTheDocument();
    expect(screen.getByTestId('preset-sped')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-selector')).toBeInTheDocument();
  });

  it('hides the classroom radio list when the teacher has only one class', () => {
    render(<ClassroomSetupStep {...baseProps} />);
    expect(screen.queryByRole('radio', { name: 'Period 1' })).not.toBeInTheDocument();
  });

  it('shows the classroom picker when there is more than one class', () => {
    render(
      <ClassroomSetupStep
        {...baseProps}
        classrooms={[classroomA, classroomB]}
      />
    );
    expect(screen.getByRole('radio', { name: 'Period 1' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Period 2' })).toBeInTheDocument();
  });

  it('collapses timer, board, mode, battle, and preview behind one closed Advanced disclosure', () => {
    render(<ClassroomSetupStep {...baseProps} />);
    const advanced = screen.getByTestId('setup-advanced');
    expect(advanced.tagName).toBe('DETAILS');
    expect(advanced).not.toHaveAttribute('open');
    expect(screen.queryByTestId('mode-settings')).not.toBeInTheDocument();
    expect(screen.queryByTestId('battle-settings')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.classroom.timer.title')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.classroom.board.title')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'education.studentPreview.button' })).not.toBeInTheDocument();
  });

  it('reveals the extra knobs only after Advanced is opened', () => {
    render(<ClassroomSetupStep {...baseProps} />);
    fireEvent.click(screen.getByTestId('setup-advanced-summary'));
    expect(screen.getByTestId('setup-advanced')).toHaveAttribute('open');
    expect(screen.getByTestId('mode-settings')).toBeInTheDocument();
    expect(screen.getByTestId('battle-settings')).toBeInTheDocument();
    expect(screen.getByText('teacher.classroom.timer.title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'education.studentPreview.button' })).toBeInTheDocument();
  });
});
