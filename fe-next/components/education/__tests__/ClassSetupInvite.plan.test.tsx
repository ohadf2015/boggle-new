import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const tel = vi.hoisted(() => ({ shown: vi.fn(), shared: vi.fn(), copied: vi.fn(), first: vi.fn() }));
const roster = vi.hoisted(() => ({ current: { students: [] as { id: string; name: string; avatar: null }[], loading: false, arrivals: [] as string[] } }));
const classrooms = vi.hoisted(() => ({ current: [{ id: 'c1', name: 'Room 7', join_code: 'BLDA7Q' }] as { id: string; name: string; join_code: string; language?: string }[] }));

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
vi.mock('@/components/teacher/home/RehearseWithBotsButton', () => ({ RehearseWithBotsButton: () => <button type="button" data-testid="rehearse" /> }));
vi.mock('@/components/education/results/ResultsTeacherProTrialCard', () => ({ ResultsTeacherProTrialCard: () => <div data-testid="pro-trial-card" />, CLASS_CREATED_TRIAL_PLACEMENT: 'class_created' }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));
const single = vi.hoisted(() => ({ getClassroom: vi.fn() }));
const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const lessons = vi.hoisted(() => ({ createLesson: vi.fn(), assign: vi.fn(), get: vi.fn(), countAssigned: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => nav }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 't1' } }) }));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => ({ createLesson: lessons.createLesson }) }));
vi.mock('@/lib/supabase/education/assignments', () => ({ createAssignment: lessons.assign, countClassroomsLessonAssignments: lessons.countAssigned }));
vi.mock('@/lib/supabase/education/classrooms', () => ({ getClassroom: single.getClassroom }));
vi.mock('@/lib/supabase/education/lessons', () => ({ getLesson: lessons.get }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

const track = vi.hoisted(() => vi.fn());
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: track }));

import { ClassSetupInvite } from '../ClassSetupInvite';
import { forgetCreatedClassrooms } from '@/lib/education/createdClassroomHandoff';

const LP = 'eduLiveRoom.hostResults.lessonPlan';
const fetchMock = vi.fn();
const savedPlan = { current: null as string | null };

const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const openCalendar = async () => fireEvent.click(await screen.findByTestId('setup-plan-calendar-toggle'));

describe('ClassSetupInvite: what next with no students yet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roster.current = { students: [], loading: false, arrivals: [] };
    classrooms.current = [{ id: 'c1', name: 'Room 7', join_code: 'BLDA7Q' }];
    forgetCreatedClassrooms();
    single.getClassroom.mockResolvedValue({ data: null, error: null });
    lessons.countAssigned.mockResolvedValue(0);
    lessons.get.mockImplementation(async (id: string) => ({ data: { id, words: [{ word: 'cat' }] }, error: null }));
    savedPlan.current = null;
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? { ok: true, status: 200, json: async () => ({ ok: true, lessonAt: JSON.parse(init.body as string).lessonAt }) }
        : { ok: true, status: 200, json: async () => ({ ok: true, lessonAt: savedPlan.current }) }
    );
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('Given a class with no students, Then the lesson reminder asks when the next lesson with this class is, after the code, the actions and the rehearse door', async () => {
    render(<ClassSetupInvite classroomId="c1" />);
    const prompt = await screen.findByTestId('lesson-plan');
    expect(prompt).toHaveTextContent(`${LP}.setupTitle`);
    expect(prompt).not.toHaveTextContent(`${LP}.title`);
    expect(follows(screen.getByTestId('setup-actions'), prompt)).toBe(true);
    expect(follows(screen.getByTestId('rehearse'), prompt)).toBe(true);
    expect(follows(screen.getByText('eduShell.setup.backHome'), prompt)).toBe(true);
    expect(track).toHaveBeenCalledWith('lesson_plan_prompt_shown', { source: 'class_setup' });
  });

  it('Given a class with no students, When the teacher saves tomorrow at 9, Then the plan is stored for this class with source class_setup', async () => {
    render(<ClassSetupInvite classroomId="c1" />);
    fireEvent.click(await screen.findByTestId('lesson-plan-tomorrow'));
    await waitFor(() => expect(screen.getByTestId('lesson-plan-saved')).toBeInTheDocument());
    const post = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST')!;
    expect(post[0]).toBe('/api/education/lesson-plan');
    expect(JSON.parse((post[1] as RequestInit).body as string)).toMatchObject({ classroomId: 'c1' });
    expect(track).toHaveBeenCalledWith('lesson_planned', expect.objectContaining({ source: 'class_setup' }));
  });

  it('Given a lesson already planned for this class, Then the reminder shows the saved time, not the choices', async () => {
    savedPlan.current = new Date(Date.now() + 2 * 86_400_000).toISOString();
    render(<ClassSetupInvite classroomId="c1" />);
    expect(await screen.findByTestId('lesson-plan-saved')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-plan-tomorrow')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/education/lesson-plan?classroomId=c1');
  });

  it('Given a student has joined, Then neither the reminder nor the calendar shows: the class is in the room', () => {
    roster.current = { students: [{ id: 's1', name: 'Noa', avatar: null }], loading: false, arrivals: [] };
    render(<ClassSetupInvite classroomId="c1" />);
    expect(screen.queryByTestId('setup-plan')).toBeNull();
    expect(screen.queryByTestId('first-game-plan')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given the roster is still loading, Then nothing flashes in before the count is known', () => {
    roster.current = { students: [], loading: true, arrivals: [] };
    render(<ClassSetupInvite classroomId="c1" />);
    expect(screen.queryByTestId('setup-plan')).toBeNull();
  });

  it('Given no students, Then the calendar export is a small link under the reminder, and opens the calendar card on tap', async () => {
    render(<ClassSetupInvite classroomId="c1" />);
    const prompt = await screen.findByTestId('lesson-plan');
    expect(screen.queryByTestId('first-game-plan')).toBeNull();
    const toggle = screen.getByTestId('setup-plan-calendar-toggle');
    expect(follows(prompt, toggle)).toBe(true);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await openCalendar();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('first-game-plan')).toHaveTextContent('eduShell.setup.plan.title');
  });

  it('Given the saved lesson time is still loading, Then the calendar link waits too, so the reminder never pops in above it', async () => {
    let answer: (v: unknown) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((r) => { answer = r; }));
    render(<ClassSetupInvite classroomId="c1" />);
    expect(screen.queryByTestId('setup-plan-calendar-toggle')).toBeNull();
    answer({ ok: true, status: 200, json: async () => ({ ok: true, lessonAt: null }) });
    expect(await screen.findByTestId('setup-plan-calendar-toggle')).toBeInTheDocument();
  });

  it('Given the class already has its word list, Then the calendar card also offers to send the link for practice at home, without asking the database', async () => {
    render(<ClassSetupInvite classroomId="c1" lessonId="L1" />);
    await openCalendar();
    expect(screen.getByTestId('first-game-plan-home')).toBeInTheDocument();
    expect(lessons.countAssigned).not.toHaveBeenCalled();
  });

  it('Given the teacher comes back from a reminder email (no lessonId) and the class has a word list, Then the home-practice offer shows', async () => {
    lessons.countAssigned.mockResolvedValue(1);
    render(<ClassSetupInvite classroomId="c1" />);
    await waitFor(() => expect(lessons.countAssigned).toHaveBeenCalledWith(['c1']));
    await openCalendar();
    expect(await screen.findByTestId('first-game-plan-home')).toBeInTheDocument();
  });

  it.each([
    ['no word list saved', 0],
    ['the word-list check fails', null],
  ])('Given %s, Then no home-practice offer shows', async (_label, count) => {
    lessons.countAssigned.mockResolvedValue(count);
    render(<ClassSetupInvite classroomId="c1" />);
    await waitFor(() => expect(lessons.countAssigned).toHaveBeenCalled());
    await openCalendar();
    expect(screen.queryByTestId('first-game-plan-home')).toBeNull();
  });
});
