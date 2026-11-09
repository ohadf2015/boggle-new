import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { QUICK_LAUNCH_KEY } from '@/components/teacher/dashboard/quickLaunchIntent';

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
vi.mock('@/components/teacher/home/RehearseWithBotsButton', () => ({ RehearseWithBotsButton: () => null }));
vi.mock('@/components/education/results/ResultsTeacherProTrialCard', () => ({ ResultsTeacherProTrialCard: () => <div data-testid="pro-trial-card" />, CLASS_CREATED_TRIAL_PLACEMENT: 'class_created' }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));
const single = vi.hoisted(() => ({ getClassroom: vi.fn() }));
const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const lessons = vi.hoisted(() => ({ createLesson: vi.fn(), assign: vi.fn(), get: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => nav }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 't1' } }) }));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => ({ createLesson: lessons.createLesson }) }));
vi.mock('@/lib/supabase/education/assignments', () => ({ createAssignment: lessons.assign }));
vi.mock('@/lib/supabase/education/classrooms', () => ({ getClassroom: single.getClassroom }));
vi.mock('@/lib/supabase/education/lessons', () => ({ getLesson: lessons.get }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

import { ClassSetupInvite } from '../ClassSetupInvite';
import { forgetCreatedClassrooms, rememberCreatedClassroom } from '@/lib/education/createdClassroomHandoff';

const enPack = STARTER_LESSON_PACKS.find((p) => p.language === 'en')!;
const otherEnPack = STARTER_LESSON_PACKS.find((p) => p.language === 'en' && p.nameKey !== enPack.nameKey)!;
const TEN = 'apple, banana, cherry, grape, lemon\nmango\npeach\npear\nplum\nmelon';
const LOBBY = '/en/education/classroom-game?flow=quickLaunch';
const storedIntent = () => JSON.parse(sessionStorage.getItem(QUICK_LAUNCH_KEY) ?? '{}');

describe('ClassSetupInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    roster.current = { students: [], loading: false, arrivals: [] };
    classrooms.current = [{ id: 'c1', name: 'Room 7', join_code: 'BLDA7Q' }];
    forgetCreatedClassrooms();
    single.getClassroom.mockResolvedValue({ data: null, error: null });
    lessons.createLesson.mockResolvedValue({ success: true, data: { id: 'L-new' } });
    lessons.assign.mockResolvedValue({ data: { id: 'a1' }, error: null });
    lessons.get.mockImplementation(async (id: string) => ({ data: { id, words: [{ word: 'cat' }] }, error: null }));
    nav.push.mockReset();
  });

  it('Given a class just made but a stale class list without it, Then the ready screen still shows its code, never "not found"', () => {
    classrooms.current = [];
    rememberCreatedClassroom({ id: 'new1', name: 'Grade 4', join_code: 'NEW4AB' });
    render(<ClassSetupInvite classroomId="new1" />);
    expect(screen.getByTestId('setup-join-code')).toHaveTextContent('NEW4AB');
    expect(screen.queryByText('education.classroomGame.classroomNotFound')).toBeNull();
    expect(single.getClassroom).not.toHaveBeenCalled();
  });

  it('Given the list misses the class and nothing was handed over (a reload), Then it reads that one class before giving up', async () => {
    classrooms.current = [];
    single.getClassroom.mockResolvedValue({ data: { id: 'new2', name: 'Grade 5', join_code: 'NEW5CD' }, error: null });
    render(<ClassSetupInvite classroomId="new2" />);
    expect(screen.queryByText('education.classroomGame.classroomNotFound')).toBeNull();
    expect(await screen.findByTestId('setup-join-code')).toHaveTextContent('NEW5CD');
    expect(single.getClassroom).toHaveBeenCalledWith('new2');
  });

  it('Given a class that really is not there, Then "not found" shows after the one lookup', async () => {
    classrooms.current = [];
    render(<ClassSetupInvite classroomId="gone" />);
    expect(await screen.findByText('education.classroomGame.classroomNotFound')).toBeInTheDocument();
  });

  it('Given a new class, Then the code, QR and every share channel are on the one screen and the view is recorded once', () => {
    render(<ClassSetupInvite classroomId="c1" />);
    expect(screen.getByTestId('setup-join-code')).toHaveTextContent('BLDA7Q');
    expect(screen.getByTestId('setup-qr')).toBeInTheDocument();
    for (const id of ['setup-copy-link', 'setup-share-whatsapp', 'setup-share-google', 'setup-share-native']) expect(screen.getByTestId(id)).toBeInTheDocument();
    expect(screen.getByTestId('setup-projector')).toBeInTheDocument();
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

  it('Given students on the roster, Then their names show', () => {
    roster.current = { students: [{ id: 's1', name: 'Maya S', avatar: null }], loading: false, arrivals: ['s1'] };
    render(<ClassSetupInvite classroomId="c1" />);
    expect(within(screen.getByTestId('invite-roster')).getByText('Maya S')).toBeInTheDocument();
  });

  it('Given the first student arrives while the teacher watches, Then first-student-seen fires once', () => {
    const view = render(<ClassSetupInvite classroomId="c1" />);
    roster.current = { students: [{ id: 's1', name: 'Maya S', avatar: null }], loading: false, arrivals: ['s1'] };
    view.rerender(<ClassSetupInvite classroomId="c1" />);
    expect(tel.first).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no students yet', [] as { id: string; name: string; avatar: null }[]],
    ['students in', [{ id: 's1', name: 'Maya S', avatar: null }]],
  ])('Given %s, Then Play now is the one hero action in the bottom slot and the projector is secondary', (_label, students) => {
    roster.current = { students, loading: false, arrivals: [] };
    render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
    const play = screen.getByTestId('setup-play-now');
    expect(play).toHaveAttribute('data-hero', 'true');
    expect(screen.getByTestId('setup-hero-slot')).toContainElement(play);
    expect(screen.getByTestId('setup-projector')).toHaveAttribute('data-hero', 'false');
  });

  it('Given nobody has joined yet, Then the roster is one waiting line with no rows of empty seats', () => {
    render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
    expect(screen.getByTestId('setup-joined-count')).toHaveTextContent('eduShell.setup.joinedNone');
    expect(screen.queryByTestId('hq-roster-seats')).toBeNull();
  });

  it('Given a phone, Then the projector door also sits in the quiet row so the bottom bar holds only Play now', () => {
    render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
    const quiet = screen.getByTestId('setup-projector-quiet');
    expect(screen.getByTestId('setup-quiet-links')).toContainElement(quiet);
    expect(quiet).toHaveClass('sm:hidden');
    expect(screen.getByTestId('setup-projector')).toHaveClass('max-sm:hidden');
    fireEvent.click(quiet);
    expect(screen.getByTestId('projector-sheet')).toBeInTheDocument();
  });

  it('Given a phone, Then who has joined is one line in the bottom bar above Play now, in place of the roster card', () => {
    roster.current = { students: [{ id: 's1', name: 'Maya S', avatar: null }, { id: 's2', name: 'Leo K', avatar: null }], loading: false, arrivals: [] };
    render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
    const line = screen.getByTestId('setup-joined-line');
    expect(screen.getByTestId('setup-actions')).toContainElement(line);
    expect(line).toHaveClass('sm:hidden');
    expect(line).toHaveTextContent('eduShell.setup.joinedMany');
    expect(line).toHaveTextContent('Maya S, Leo K');
    expect(screen.getByTestId('invite-roster')).toHaveClass('max-sm:hidden');
  });

  it('Given a class just made, Then no Pro offer sits on the way to the first game', () => {
    render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
    expect(screen.queryByTestId('pro-trial-card')).toBeNull();
  });

  describe('first game in one minute', () => {
    it('Given a pasted 10-word list, Then the code and Play now show, and Play now saves the list to this class and opens Classic on its list id', async () => {
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      expect(screen.getByTestId('setup-join-code')).toHaveTextContent('BLDA7Q');
      fireEvent.change(screen.getByTestId('first-game-words'), { target: { value: TEN } });
      expect(screen.getByTestId('first-game-count')).toHaveTextContent('eduShell.setup.words.count:{"count":10}');
      fireEvent.click(screen.getByTestId('setup-play-now'));
      await waitFor(() => expect(nav.push).toHaveBeenCalledWith(LOBBY));

      expect(lessons.createLesson).toHaveBeenCalledTimes(1);
      expect(lessons.createLesson.mock.calls[0][0]).toMatchObject({ classroomId: 'c1', language: 'en' });
      expect(lessons.createLesson.mock.calls[0][0].words).toHaveLength(10);
      expect(lessons.assign).toHaveBeenCalledWith(expect.objectContaining({ classroom_id: 'c1', lesson_id: 'L-new' }));
      expect(storedIntent()).toMatchObject({ source: 'lesson', lessonId: 'L-new', mode: 'classic', classroomId: 'c1' });
    });

    it('Given no words pasted, Then starter packs are offered with the saved one picked, and Play now launches that saved list with no new write', async () => {
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      const radios = screen.getAllByRole('radio');
      expect(radios.length).toBeGreaterThan(0);
      expect(radios.find((r) => r.getAttribute('data-pack') === enPack.nameKey)).toBeChecked();
      const play = screen.getByTestId('setup-play-now');
      expect(play).toBeEnabled();
      fireEvent.click(play);
      await waitFor(() => expect(nav.push).toHaveBeenCalledWith(LOBBY));
      expect(lessons.createLesson).not.toHaveBeenCalled();
      expect(storedIntent()).toMatchObject({ source: 'lesson', lessonId: 'L-pack', mode: 'classic', classroomId: 'c1' });
    });

    it('Given the starter list saved at creation, Then its tile says it is already in the class', () => {
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      expect(screen.getAllByText('eduShell.setup.words.saved')).toHaveLength(1);
      expect(screen.queryByText('eduShell.setup.packRecommended')).toBeNull();
    });

    it('Given no words and another pack tapped, Then that pack is saved to the class and played', async () => {
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      fireEvent.click(screen.getAllByRole('radio').find((r) => r.getAttribute('data-pack') === otherEnPack.nameKey)!);
      fireEvent.click(screen.getByTestId('setup-play-now'));
      await waitFor(() => expect(nav.push).toHaveBeenCalledWith(LOBBY));
      expect(lessons.createLesson.mock.calls[0][0]).toMatchObject({ classroomId: 'c1', language: otherEnPack.language });
      expect(storedIntent()).toMatchObject({ source: 'lesson', lessonId: 'L-new', mode: 'classic' });
    });

    it('Given a class with no saved list (old link), Then Play now still has words: the picked pack is saved and played', async () => {
      render(<ClassSetupInvite classroomId="c1" />);
      fireEvent.click(screen.getByTestId('setup-play-now'));
      await waitFor(() => expect(nav.push).toHaveBeenCalledWith(LOBBY));
      expect(lessons.createLesson).toHaveBeenCalledTimes(1);
      expect(storedIntent()).toMatchObject({ source: 'lesson', lessonId: 'L-new', mode: 'classic', classroomId: 'c1' });
    });

    it('Given a Hebrew class on an English screen, Then the packs and the pasted list are Hebrew', async () => {
      classrooms.current = [{ id: 'c1', name: 'Room 7', join_code: 'BLDA7Q', language: 'he' }];
      render(<ClassSetupInvite classroomId="c1" />);
      const heKeys = STARTER_LESSON_PACKS.filter((p) => p.language === 'he').map((p) => p.nameKey);
      expect(screen.getAllByRole('radio').map((r) => r.getAttribute('data-pack'))).toEqual(heKeys);
      fireEvent.change(screen.getByTestId('first-game-words'), { target: { value: 'חתול, כלב, ציפור' } });
      fireEvent.click(screen.getByTestId('setup-play-now'));
      await waitFor(() => expect(nav.push).toHaveBeenCalledWith(LOBBY));
      expect(lessons.createLesson.mock.calls[0][0]).toMatchObject({ language: 'he', classroomId: 'c1' });
      expect(storedIntent()).toMatchObject({ language: 'he', mode: 'classic' });
    });

    it('Given only two words, When Play now is tapped, Then it says what is missing, keeps the words and nothing launches', () => {
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      const box = screen.getByTestId('first-game-words');
      fireEvent.change(box, { target: { value: 'cat, dog' } });
      const play = screen.getByTestId('setup-play-now');
      expect(play).toBeEnabled();
      fireEvent.click(play);
      expect(screen.getByRole('alert')).toHaveTextContent('eduShell.setup.words.tooFew');
      expect(box).toHaveValue('cat, dog');
      expect(document.activeElement).toBe(box);
      expect(nav.push).not.toHaveBeenCalled();
      expect(lessons.createLesson).not.toHaveBeenCalled();
    });

    it('Given only phrases pasted, When Play now is tapped, Then it says phrases cannot go on the board, offers no pack and nothing launches', () => {
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      const box = screen.getByTestId('first-game-words');
      fireEvent.change(box, { target: { value: 'rely on\nlook up' } });
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
      expect(screen.getByTestId('first-game-skipped')).toHaveTextContent('eduShell.setup.words.skipped:{"count":2}');
      fireEvent.click(screen.getByTestId('setup-play-now'));
      expect(screen.getByRole('alert')).toHaveTextContent('eduShell.setup.words.phrasesOnly');
      expect(document.activeElement).toBe(box);
      expect(nav.push).not.toHaveBeenCalled();
      expect(lessons.createLesson).not.toHaveBeenCalled();
    });

    it('Given words mixed with a phrase, Then the words count and the skipped phrase is named by number', () => {
      render(<ClassSetupInvite classroomId="c1" />);
      fireEvent.change(screen.getByTestId('first-game-words'), { target: { value: 'cat, dog, bird, rely on' } });
      expect(screen.getByTestId('first-game-count')).toHaveTextContent('eduShell.setup.words.count:{"count":3}');
      expect(screen.getByTestId('first-game-skipped')).toHaveTextContent('eduShell.setup.words.skipped:{"count":1}');
    });

    it('Given the teacher comes back from the lobby and plays the same words again, Then the saved list is reused, not saved twice', async () => {
      const first = render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      fireEvent.change(screen.getByTestId('first-game-words'), { target: { value: TEN } });
      fireEvent.click(screen.getByTestId('setup-play-now'));
      await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
      first.unmount();
      sessionStorage.removeItem(QUICK_LAUNCH_KEY);

      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      fireEvent.change(screen.getByTestId('first-game-words'), { target: { value: TEN } });
      fireEvent.click(screen.getByTestId('setup-play-now'));
      await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(2));
      expect(lessons.createLesson).toHaveBeenCalledTimes(1);
      expect(lessons.assign).toHaveBeenCalledTimes(1);
      expect(storedIntent()).toMatchObject({ source: 'lesson', lessonId: 'L-new' });
    });

    it('Given the saved list in the link was deleted, Then Play now saves the pack to the class instead of opening a missing list', async () => {
      lessons.get.mockResolvedValue({ data: null, error: null });
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-gone" />);
      fireEvent.click(screen.getByTestId('setup-play-now'));
      await waitFor(() => expect(nav.push).toHaveBeenCalledWith(LOBBY));
      expect(lessons.createLesson).toHaveBeenCalledTimes(1);
      expect(storedIntent()).toMatchObject({ source: 'lesson', lessonId: 'L-new' });
    });

    it('Given the list saves but the homework assignment fails, Then the teacher is told, and still reaches the lobby', async () => {
      lessons.assign.mockResolvedValue({ data: null, error: { message: 'boom' } });
      render(<ClassSetupInvite classroomId="c1" />);
      fireEvent.change(screen.getByTestId('first-game-words'), { target: { value: TEN } });
      fireEvent.click(screen.getByTestId('setup-play-now'));
      await waitFor(() => expect(nav.push).toHaveBeenCalledWith(LOBBY));
      expect(toastMock.error).toHaveBeenCalledWith('eduShell.setup.assignFailed');
    });

    it('Given the navigation throws, Then the spinner stops, the teacher is told, and Play now works again', async () => {
      nav.push.mockImplementationOnce(() => {
        throw new Error('nav failed');
      });
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      const play = screen.getByTestId('setup-play-now');
      fireEvent.click(play);
      await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('eduShell.setup.words.playFailed'));
      expect(play).not.toHaveAttribute('aria-busy');
      fireEvent.click(play);
      await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(2));
    });

    it('Given the page comes back from the back-forward cache, Then the spinner is gone and Play now works again', async () => {
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      const play = screen.getByTestId('setup-play-now');
      fireEvent.click(play);
      await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
      expect(play).toHaveAttribute('aria-busy', 'true');
      const back = new Event('pageshow');
      Object.defineProperty(back, 'persisted', { value: true });
      act(() => {
        window.dispatchEvent(back);
      });
      expect(play).not.toHaveAttribute('aria-busy');
      fireEvent.click(play);
      await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(2));
    });

    it('Given an older class with no language and a Hebrew pack in the link on an English screen, Then the packs are Hebrew and that pack is picked', () => {
      const hePack = STARTER_LESSON_PACKS.find((p) => p.language === 'he')!;
      classrooms.current = [{ id: 'c1', name: 'Room 7', join_code: 'BLDA7Q' }];
      render(<ClassSetupInvite classroomId="c1" packKey={hePack.nameKey} lessonId="L-he" />);
      const heKeys = STARTER_LESSON_PACKS.filter((p) => p.language === 'he').map((p) => p.nameKey);
      const radios = screen.getAllByRole('radio');
      expect(radios.map((r) => r.getAttribute('data-pack'))).toEqual(heKeys);
      expect(radios.find((r) => r.getAttribute('data-pack') === hePack.nameKey)).toBeChecked();
    });

    it('Given a double tap, Then the list is saved once', async () => {
      lessons.createLesson.mockImplementation(() => new Promise((r) => setTimeout(() => r({ success: true, data: { id: 'L-new' } }), 20)));
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      fireEvent.change(screen.getByTestId('first-game-words'), { target: { value: TEN } });
      const play = screen.getByTestId('setup-play-now');
      fireEvent.click(play);
      fireEvent.click(play);
      await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
      expect(lessons.createLesson).toHaveBeenCalledTimes(1);
    });

    it('Given the list cannot be saved, Then the teacher still reaches the lobby with the pasted words', async () => {
      lessons.createLesson.mockResolvedValue({ success: false, error: 'offline' });
      render(<ClassSetupInvite classroomId="c1" packKey={enPack.nameKey} lessonId="L-pack" />);
      fireEvent.change(screen.getByTestId('first-game-words'), { target: { value: TEN } });
      fireEvent.click(screen.getByTestId('setup-play-now'));
      await waitFor(() => expect(nav.push).toHaveBeenCalledWith(LOBBY));
      expect(storedIntent()).toMatchObject({ source: 'paste', mode: 'classic', classroomId: 'c1' });
      expect(storedIntent().words).toHaveLength(10);
    });
  });

  it('Given nobody has joined yet, Then a calendar card offers to put the first game on the teacher\'s calendar', () => {
    render(<ClassSetupInvite classroomId="c1" />);
    expect(screen.getByTestId('first-game-plan')).toHaveTextContent('eduShell.setup.plan.title');
  });

  it('Given the class already has its word list, Then the card also offers to send the link for practice at home', () => {
    render(<ClassSetupInvite classroomId="c1" lessonId="L1" />);
    expect(screen.getByTestId('first-game-plan-home')).toBeInTheDocument();
  });

  it('Given no word list saved to the class, Then no home-practice offer shows', () => {
    render(<ClassSetupInvite classroomId="c1" />);
    expect(screen.queryByTestId('first-game-plan-home')).toBeNull();
  });

  it('Given a student has joined, Then the calendar card is gone: the class is in the room', () => {
    roster.current = { students: [{ id: 's1', name: 'Noa', avatar: null }], loading: false, arrivals: [] };
    render(<ClassSetupInvite classroomId="c1" />);
    expect(screen.queryByTestId('first-game-plan')).toBeNull();
  });

  it('Given the roster is still loading, Then no calendar card flashes in before the count is known', () => {
    roster.current = { students: [], loading: true, arrivals: [] };
    render(<ClassSetupInvite classroomId="c1" />);
    expect(screen.queryByTestId('first-game-plan')).toBeNull();
  });

  it('Given an unknown class id, Then after the one lookup it says so and links to the class list', async () => {
    render(<ClassSetupInvite classroomId="nope" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('education.classroomGame.classroomNotFound');
  });
});
