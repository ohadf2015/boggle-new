/**
 * PlayTabFirstRunCard — first-run empty state on the Play tab.
 *
 * Must keep onCreateClassroom and the create CTA testid that the parent
 * dashboard first-run suite relies on conceptually.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayTabFirstRunCard from '../PlayTabFirstRunCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        'teacher.dashboard.createClassroomFirst':
          'Create a classroom first to track assignments and duel activity',
        'teacher.dashboard.reviewEmptyHint':
          'Create your first classroom to unlock analytics, assignments and reports.',
        'teacher.classroom.create': 'Create Classroom',
        'teacher.classroom.wizard.title': 'Get students in 3 steps',
        'teacher.classroom.wizard.subtitle': "You'll have a join code in under a minute.",
        'teacher.classroom.wizard.step1.title': 'Create class',
        'teacher.classroom.wizard.step1.body': 'Name it and pick a language.',
        'teacher.classroom.wizard.step2.title': 'Get code',
        'teacher.classroom.wizard.step2.body': 'A short join code appears instantly.',
        'teacher.classroom.wizard.step3.title': 'Share with students',
        'teacher.classroom.wizard.step3.body': 'Send the code. No student logins needed.',
      })[key] || key,
    language: 'en',
  }),
}));

describe('PlayTabFirstRunCard', () => {
  it('shouldRenderWizardAndKeepCreateButtonTestId', () => {
    // GIVEN / WHEN
    render(<PlayTabFirstRunCard onCreateClassroom={vi.fn()} />);

    // THEN
    expect(screen.getByTestId('play-tab-first-run-card')).toBeInTheDocument();
    expect(screen.getByTestId('create-classroom-wizard')).toBeInTheDocument();
    expect(screen.getByTestId('play-tab-create-button')).toBeInTheDocument();
    expect(
      screen.getByText('Create a classroom first to track assignments and duel activity')
    ).toBeInTheDocument();
  });

  it('shouldInvokeOnCreateClassroomWhenCtaClicked', () => {
    // GIVEN
    const onCreateClassroom = vi.fn();
    render(<PlayTabFirstRunCard onCreateClassroom={onCreateClassroom} />);

    // WHEN
    fireEvent.click(screen.getByTestId('play-tab-create-button'));

    // THEN
    expect(onCreateClassroom).toHaveBeenCalledTimes(1);
  });
});
