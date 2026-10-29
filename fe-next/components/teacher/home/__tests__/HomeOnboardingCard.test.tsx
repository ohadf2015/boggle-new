import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { homeOnboarding } from '@/lib/education/homeOnboarding';
import { HomeOnboardingCard } from '../HomeOnboardingCard';

const t = (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const HREFS = { createClass: '/en/teacher/classroom/new', shareCode: '/en/teacher/classroom/new?classroomId=c1', tryDemo: '/en/education/classroom-game?classroomId=c1&minutes=2' };
const TRIAL_HREFS = {
  create_classroom: '/en/teacher/classroom/new',
  invite_students: '/en/teacher/classroom/new?classroomId=c1',
  first_assignment: '/en/teacher?classroomId=c1&assign=1',
};
const fresh = homeOnboarding({ classroomCount: 0, inviteCopied: false, liveStarted: false, dismissed: false });
const shared = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: false, dismissed: false });
const allDone = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: true, dismissed: false });

type Checklist = NonNullable<Parameters<typeof HomeOnboardingCard>[0]['trial']>['checklist'];
function trialAt(currentIndex: 0 | 1 | 2): Checklist {
  const ids = ['create_classroom', 'invite_students', 'first_assignment'] as const;
  return {
    steps: ids.map((id, i) => ({ id, index: (i + 1) as 1 | 2 | 3, status: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo', done: i < currentIndex })),
    current: ids[currentIndex],
    doneCount: currentIndex,
    allStepsDone: false,
    complete: false,
    visible: true,
  };
}

afterEach(() => cleanup());

describe('<HomeOnboardingCard>', () => {
  it('Given a teacher with no class, Then one card with one lime action leads to the quick class setup', () => {
    render(<HomeOnboardingCard onboarding={fresh} hrefs={HREFS} variant="full" t={t} />);
    const card = screen.getByTestId('home-onboarding');
    expect(within(card).getAllByTestId(/^home-onboarding-step-/)).toHaveLength(3);
    expect(within(card).getByTestId('home-onboarding-cta')).toHaveAttribute('href', '/en/teacher/classroom/new');
    expect(within(card).getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByTestId('home-onboarding-dismiss')).toBeNull();
  });

  it('Given a trialing teacher, Then the trial step replaces the first-run step in the same single card', () => {
    render(
      <HomeOnboardingCard onboarding={shared} hrefs={HREFS} trial={{ checklist: trialAt(1), hrefs: TRIAL_HREFS, onDismiss: vi.fn() }} variant="compact" t={t} />,
    );
    expect(screen.getAllByTestId('home-onboarding')).toHaveLength(1);
    expect(screen.getByTestId('home-onboarding')).toHaveAttribute('data-source', 'trial');
    expect(screen.getByTestId('home-onboarding-cta')).toHaveAttribute('href', TRIAL_HREFS.invite_students);
  });

  it('Given the trial assignment step, When its action is pressed, Then the assignment creator opens in place', () => {
    const onOpenAssignment = vi.fn();
    render(
      <HomeOnboardingCard
        onboarding={allDone}
        hrefs={HREFS}
        trial={{ checklist: trialAt(2), hrefs: TRIAL_HREFS, onOpenAssignment }}
        variant="compact"
        t={t}
      />,
    );
    const cta = screen.getByTestId('home-onboarding-cta');
    expect(cta).toHaveTextContent('eduShell.trialChecklist.steps.first_assignment.cta');
    fireEvent.click(cta);
    expect(onOpenAssignment).toHaveBeenCalledTimes(1);
  });

  it('Given every step is done, Then the card is gone', () => {
    const { container } = render(<HomeOnboardingCard onboarding={allDone} hrefs={HREFS} variant="compact" t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given the share card is already on Home, Then the share step does not show a second card', () => {
    const needsShare = homeOnboarding({ classroomCount: 1, inviteCopied: false, liveStarted: false, dismissed: false });
    const { container } = render(<HomeOnboardingCard onboarding={needsShare} hrefs={HREFS} shareCardShown variant="compact" t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('When a first-run step is started or dismissed, Then the callbacks fire with that step', () => {
    const onStepStart = vi.fn();
    const onDismiss = vi.fn();
    render(<HomeOnboardingCard onboarding={shared} hrefs={HREFS} onStepStart={onStepStart} onDismiss={onDismiss} variant="compact" t={t} />);
    const cta = screen.getByTestId('home-onboarding-cta');
    cta.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(cta);
    expect(onStepStart).toHaveBeenCalledWith('tryDemo');
    fireEvent.click(screen.getByTestId('home-onboarding-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
