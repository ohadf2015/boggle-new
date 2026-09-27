/**
 * CreateClassroomWizard — 3-step first-run visual
 *
 * Shared empty-state used by PlayTabFirstRunCard and ClassroomManager.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateClassroomWizard from '../CreateClassroomWizard';

const tMap: Record<string, string> = {
  'teacher.classroom.wizard.title': 'Get students in 3 steps',
  'teacher.classroom.wizard.subtitle': "You'll have a join code in under a minute.",
  'teacher.classroom.wizard.step1.title': 'Create class',
  'teacher.classroom.wizard.step1.body': 'Name it and pick a language.',
  'teacher.classroom.wizard.step2.title': 'Get code',
  'teacher.classroom.wizard.step2.body': 'A short join code appears instantly.',
  'teacher.classroom.wizard.step3.title': 'Share with students',
  'teacher.classroom.wizard.step3.body': 'Send the code. No student logins needed.',
  'teacher.classroom.create': 'Create Classroom',
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => tMap[key] || key,
    language: 'en',
  }),
}));

describe('CreateClassroomWizard', () => {
  it('shouldRenderThreeVisualStepsWhenMounted', () => {
    // GIVEN / WHEN
    render(<CreateClassroomWizard onCreateClassroom={vi.fn()} />);

    // THEN
    const wizard = screen.getByTestId('create-classroom-wizard');
    expect(wizard).toBeInTheDocument();
    expect(screen.getByText('Create class')).toBeInTheDocument();
    expect(screen.getByText('Get code')).toBeInTheDocument();
    expect(screen.getByText('Share with students')).toBeInTheDocument();
    expect(screen.getByText('Get students in 3 steps')).toBeInTheDocument();
  });

  it('shouldCallOnCreateClassroomWhenCtaClicked', () => {
    // GIVEN
    const onCreateClassroom = vi.fn();
    render(<CreateClassroomWizard onCreateClassroom={onCreateClassroom} />);

    // WHEN
    fireEvent.click(screen.getByRole('button', { name: /create classroom/i }));

    // THEN
    expect(onCreateClassroom).toHaveBeenCalledTimes(1);
  });

  it('shouldApplyCreateButtonTestIdWhenProvided', () => {
    // GIVEN / WHEN
    render(
      <CreateClassroomWizard
        onCreateClassroom={vi.fn()}
        createButtonTestId="play-tab-create-button"
      />
    );

    // THEN
    expect(screen.getByTestId('play-tab-create-button')).toBeInTheDocument();
  });

  it('shouldUseRtlLogicalLayoutClasses', () => {
    // GIVEN / WHEN
    render(<CreateClassroomWizard onCreateClassroom={vi.fn()} />);

    // THEN — no physical left/right that would break Hebrew
    const wizard = screen.getByTestId('create-classroom-wizard');
    expect(wizard.className).not.toMatch(/\b(ml|mr|pl|pr|left|right)-/);
  });
});
