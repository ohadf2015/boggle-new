import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { QUICK_LAUNCH_KEY } from '@/components/teacher/dashboard/quickLaunchIntent';

const tel = vi.hoisted(() => ({ shown: vi.fn(), shared: vi.fn(), copied: vi.fn(), first: vi.fn() }));
const roster = vi.hoisted(() => ({ current: { students: [] as { id: string; name: string; avatar: null }[], loading: false, arrivals: [] as string[] } }));
const classrooms = vi.hoisted(() => ({ current: [{ id: 'c1', name: 'Room 7', join_code: 'BLDA7Q' }] as { id: string; name: string; join_code: string }[] }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playPlayerJoinedSound: vi.fn() }) }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: classrooms.current, isLoading: false }) }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, status: null, loading: false }) }));
vi.mock('@/hooks/useTeacherActivationProgress', () => ({ useTeacherActivationProgress: () => ({ markInviteCopied: vi.fn() }) }));
vi.mock('@/components/teacher/hq/useClassRoster', () => ({ useClassRoster: () => roster.current }));
vi.mock('@/lib/education/telemetry', () => ({
  trackEduJoinCodeShown: tel.shown,
  trackEduJoinCodeShared: tel.shared,
  trackEduJoinCodeCopied: tel.copied,
  trackEduFirstStudentJoined: tel.first,
}));
vi.mock('@/lib/education/firstRoundGuideTelemetry', () => ({ trackFirstRoundGuideShown: vi.fn(), trackFirstRoundGuideClicked: vi.fn() }));
vi.mock('@/lib/education/teacherOnboardingFunnel', () => ({
  captureTeacherOnboardingFunnel: vi.fn(),
  TEACHER_ONBOARDING_FUNNEL_EVENTS: { studentJoined: 'student_joined' },
  teacherFunnelPlan: () => 'free',
}));
vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => <div data-testid="projector-sheet" /> }));
vi.mock('@/components/teacher/home/RehearseWithBotsButton', () => ({ RehearseWithBotsButton: () => null }));
vi.mock('@/components/education/results/ResultsTeacherProTrialCard', () => ({ ResultsTeacherProTrialCard: () => null, CLASS_CREATED_TRIAL_PLACEMENT: 'class_created' }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));

import { ClassSetupInvite } from '../ClassSetupInvite';

describe('ClassSetupInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    roster.current = { students: [], loading: false, arrivals: [] };
    classrooms.current = [{ id: 'c1', name: 'Room 7', join_code: 'BLDA7Q' }];
  });

  it('Given a new class, Then the code, QR and every share channel are on the one screen and the view is recorded once', () => {
    render(<ClassSetupInvite classroomId="c1" />);
    expect(screen.getByTestId('setup-join-code')).toHaveTextContent('BLDA7Q');
    expect(screen.getByTestId('setup-qr')).toBeInTheDocument();
    for (const id of ['setup-copy-link', 'setup-share-whatsapp', 'setup-share-google', 'setup-share-native']) expect(screen.getByTestId(id)).toBeInTheDocument();
    expect(screen.getByTestId('setup-projector')).toHaveAttribute('data-hero', 'true');
    expect(tel.shown).toHaveBeenCalledTimes(1);
  });

  it('When the teacher shares to WhatsApp, Then the channel is recorded', () => {
    render(<ClassSetupInvite classroomId="c1" />);
    fireEvent.click(screen.getByTestId('setup-share-whatsapp'));
    expect(tel.shared).toHaveBeenCalledWith({ classroomId: 'c1', method: 'whatsapp' });
  });

  it('Given the invite step, Then the way home sits after the actions so nothing splits the roster from the hero action', () => {
    render(<ClassSetupInvite classroomId="c1" />);
    const actions = screen.getByTestId('setup-actions');
    const quiet = screen.getByTestId('setup-quiet-links');
    expect(quiet).toHaveTextContent('eduShell.setup.backHome');
    expect(actions.compareDocumentPosition(quiet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('invite-roster').compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Given students on the roster, Then their names show and Start leads', () => {
    roster.current = { students: [{ id: 's1', name: 'Maya S', avatar: null }], loading: false, arrivals: ['s1'] };
    render(<ClassSetupInvite classroomId="c1" />);
    expect(screen.getByText('Maya S')).toBeInTheDocument();
    expect(screen.getByTestId('setup-start-game')).toHaveAttribute('data-hero', 'true');
  });

  it('Given the first student arrives while the teacher watches, Then first-student-seen fires once', () => {
    const view = render(<ClassSetupInvite classroomId="c1" />);
    roster.current = { students: [{ id: 's1', name: 'Maya S', avatar: null }], loading: false, arrivals: ['s1'] };
    view.rerender(<ClassSetupInvite classroomId="c1" />);
    expect(tel.first).toHaveBeenCalledTimes(1);
  });

  it('Given a pack from setup, When Start is tapped, Then the quick-launch intent is written at that moment for this class', () => {
    const pack = STARTER_LESSON_PACKS[0];
    render(<ClassSetupInvite classroomId="c1" packKey={pack.nameKey} />);
    const start = screen.getByTestId('setup-start-game');
    expect(start.getAttribute('href')).toContain('flow=quickLaunch');
    expect(sessionStorage.getItem(QUICK_LAUNCH_KEY)).toBeNull();
    fireEvent.click(start);
    expect(JSON.parse(sessionStorage.getItem(QUICK_LAUNCH_KEY) ?? '{}')).toMatchObject({ source: 'pack', packKey: pack.nameKey, classroomId: 'c1' });
  });

  it.each([
    ['no students yet', [] as { id: string; name: string; avatar: null }[]],
    ['students in', [{ id: 's1', name: 'Maya S', avatar: null }]],
  ])('Given %s, Then the one hero action sits in the same bottom slot', (_label, students) => {
    roster.current = { students, loading: false, arrivals: [] };
    render(<ClassSetupInvite classroomId="c1" />);
    const slot = screen.getByTestId('setup-hero-slot');
    const heroes = [screen.getByTestId('setup-projector'), screen.getByTestId('setup-start-game')].filter((el) => el.dataset.hero === 'true');
    expect(heroes).toHaveLength(1);
    expect(slot).toContainElement(heroes[0]);
  });

  it('Given an unknown class id, Then it says so and links to the class list', () => {
    render(<ClassSetupInvite classroomId="nope" />);
    expect(screen.getByRole('alert')).toHaveTextContent('education.classroomGame.classroomNotFound');
  });
});
