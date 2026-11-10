import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { recommendedPack } from '@/components/teacher/setup/starterPackPick';

const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const api = vi.hoisted(() => ({
  create: vi.fn(),
  createLesson: vi.fn(),
  assign: vi.fn(),
  created: vi.fn(),
  funnel: vi.fn(),
  firstAssignment: vi.fn(),
  classrooms: [] as { id: string; name: string }[],
}));

vi.mock('react-hot-toast', () => ({ default: toastMock }));
vi.mock('next/navigation', () => ({ useRouter: () => nav }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: api.classrooms, createClassroom: api.create }) }));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => ({ createLesson: api.createLesson }) }));
vi.mock('@/lib/supabase/education/assignments', () => ({ createAssignment: api.assign }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, status: null, loading: false, accessTrialExpires: null }) }));
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => ({ trial: null, isLoading: false }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomCreated: api.created, trackEduFirstAssignmentCreated: api.firstAssignment }));
vi.mock('@/lib/education/teacherOnboardingFunnel', () => ({
  captureTeacherOnboardingFunnel: api.funnel,
  TEACHER_ONBOARDING_FUNNEL_EVENTS: { classroomCreated: 'classroom_created' },
  teacherFunnelPlan: () => 'free',
}));
vi.mock('@/components/teacher/ClassLimitUpsellModal', () => ({ default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="limit-modal" /> : null) }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import { ClassSetupCreate } from '../ClassSetupCreate';

const pack = recommendedPack('en', null);

describe('ClassSetupCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.classrooms = [];
    api.create.mockResolvedValue({ success: true, data: { id: 'new1', name: 'Class 1', join_code: 'ABC123', language: 'en' } });
    api.createLesson.mockResolvedValue({ success: true, data: { id: 'lesson-1' } });
    api.assign.mockResolvedValue({ data: { id: 'asg-1' }, error: null });
  });

  it('Given the details step, When "Start live" is tapped, Then the class is made, the picked pack is assigned to it, and the invite opens on that list without a second pack lesson', async () => {
    render(<ClassSetupCreate />);
    fireEvent.click(screen.getByTestId('setup-start-live'));
    await waitFor(() => expect(nav.replace).toHaveBeenCalled());

    expect(api.createLesson).toHaveBeenCalledTimes(1);
    expect(api.createLesson).toHaveBeenCalledWith(expect.objectContaining({ name: pack.nameKey, language: pack.language, classroomId: 'new1' }));
    expect(api.assign).toHaveBeenCalledTimes(1);
    expect(api.assign).toHaveBeenCalledWith(expect.objectContaining({ classroom_id: 'new1', lesson_id: 'lesson-1' }));
    expect(nav.replace.mock.calls[0][0]).toBe(`/en/teacher/classroom/new?classroomId=new1&pack=${encodeURIComponent(pack.nameKey)}&lessonId=lesson-1`);
    expect(toastMock.success).toHaveBeenCalledWith('teacher.assignment.created');
    expect(api.firstAssignment).toHaveBeenCalledWith({ classroomId: 'new1' });
    expect(api.created).toHaveBeenCalledWith(expect.objectContaining({ classroomId: 'new1' }));
    expect(api.funnel).toHaveBeenCalledWith('classroom_created', expect.anything());
  });

  it('Given the details step, Then there is one create button, not a second one that does the same thing', () => {
    render(<ClassSetupCreate />);
    expect(screen.queryByTestId('setup-create')).toBeNull();
  });

  it('Given a different pack is picked, Then that pack is the one assigned', async () => {
    render(<ClassSetupCreate />);
    fireEvent.click(screen.getByTestId('setup-advanced-toggle'));
    const packRadios = screen.getAllByRole('radio').filter((r) => r.hasAttribute('data-pack'));
    const other = packRadios.find((r) => r.getAttribute('data-pack') !== pack.nameKey) as HTMLElement;
    fireEvent.click(other);
    fireEvent.click(screen.getByTestId('setup-start-live'));
    await waitFor(() => expect(api.createLesson).toHaveBeenCalled());
    expect(api.createLesson.mock.calls[0][0].name).toBe(other.getAttribute('data-pack'));
  });

  it('Given the lesson cannot be saved, When "Start live" is tapped, Then the invite keeps the pack so the live round still has words', async () => {
    api.createLesson.mockResolvedValue({ success: false, error: 'offline' });
    render(<ClassSetupCreate />);
    fireEvent.click(screen.getByTestId('setup-start-live'));
    await waitFor(() => expect(nav.replace).toHaveBeenCalled());
    expect(nav.replace.mock.calls[0][0]).toBe(`/en/teacher/classroom/new?classroomId=new1&pack=${encodeURIComponent(pack.nameKey)}`);
    expect(toastMock.error).toHaveBeenCalledWith('eduShell.setup.assignFailed');
  });

  it('Given the class is made but the assignment fails, Then the teacher still reaches the code and is told the words were not assigned', async () => {
    api.assign.mockResolvedValue({ data: null, error: { message: 'boom' } });
    render(<ClassSetupCreate />);
    fireEvent.click(screen.getByTestId('setup-start-live'));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith(`/en/teacher/classroom/new?classroomId=new1&pack=${encodeURIComponent(pack.nameKey)}&lessonId=lesson-1`, { scroll: false }));
    expect(toastMock.error).toHaveBeenCalledWith('eduShell.setup.assignFailed');
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(api.firstAssignment).not.toHaveBeenCalled();
  });

  it('Given the free class cap is hit on the server, Then the limit modal opens, nothing is assigned and nothing navigates', async () => {
    api.create.mockResolvedValue({ success: false, code: 'CLASS_LIMIT_REACHED', currentCount: 3, limit: 3 });
    render(<ClassSetupCreate />);
    fireEvent.click(screen.getByTestId('setup-start-live'));
    await screen.findByTestId('limit-modal');
    expect(api.createLesson).not.toHaveBeenCalled();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('Given the class cannot be created, Then the error shows on the form and nothing is assigned', async () => {
    api.create.mockResolvedValue({ success: false, error: 'offline' });
    render(<ClassSetupCreate />);
    fireEvent.click(screen.getByTestId('setup-start-live'));
    expect(await screen.findByRole('alert')).toHaveTextContent('eduShell.setup.createFailed');
    expect(api.createLesson).not.toHaveBeenCalled();
  });

  it('Given a double tap, Then only one class and one assignment are made', async () => {
    render(<ClassSetupCreate />);
    fireEvent.click(screen.getByTestId('setup-start-live'));
    fireEvent.click(screen.getByTestId('setup-start-live'));
    await waitFor(() => expect(nav.replace).toHaveBeenCalled());
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.assign).toHaveBeenCalledTimes(1);
  });
  describe('the teacher pastes their own words', () => {
    const paste = (text: string) => fireEvent.change(screen.getByTestId('setup-own-words'), { target: { value: text } });

    it('Given enough valid words, When "Start live" is tapped, Then those words become the class list instead of the starter pack, and the invite opens on that list with no pack', async () => {
      render(<ClassSetupCreate />);
      paste('cat, dog\nsun\nmoon, rely on');
      fireEvent.click(screen.getByTestId('setup-start-live'));
      await waitFor(() => expect(nav.replace).toHaveBeenCalled());

      expect(api.createLesson).toHaveBeenCalledTimes(1);
      const saved = api.createLesson.mock.calls[0][0];
      expect(saved).toMatchObject({ name: 'eduShell.setup.words.listName', language: 'en', classroomId: 'new1' });
      expect(saved.words.map((w: { word: string }) => w.word)).toEqual(['cat', 'dog', 'sun', 'moon']);
      expect(api.assign).toHaveBeenCalledWith(expect.objectContaining({ classroom_id: 'new1', lesson_id: 'lesson-1' }));
      expect(nav.replace.mock.calls[0][0]).toBe('/en/teacher/classroom/new?classroomId=new1&lessonId=lesson-1');
      expect(toastMock.success).toHaveBeenCalledWith('teacher.assignment.created');
    });

    it('Given 3 valid words (the shared minimum), When "Start live" is tapped, Then they become the class list', async () => {
      render(<ClassSetupCreate />);
      paste('cat, dog, sun');
      fireEvent.click(screen.getByTestId('setup-start-live'));
      await waitFor(() => expect(nav.replace).toHaveBeenCalled());
      expect(api.createLesson.mock.calls[0][0].words.map((w: { word: string }) => w.word)).toEqual(['cat', 'dog', 'sun']);
    });

    it('Given fewer than 3 valid words, When "Start live" is tapped, Then the starter pack is assigned exactly as with an empty box', async () => {
      render(<ClassSetupCreate />);
      paste('cat, dog');
      fireEvent.click(screen.getByTestId('setup-start-live'));
      await waitFor(() => expect(nav.replace).toHaveBeenCalled());
      expect(api.createLesson).toHaveBeenCalledTimes(1);
      expect(api.createLesson.mock.calls[0][0].name).toBe(pack.nameKey);
      expect(nav.replace.mock.calls[0][0]).toBe(`/en/teacher/classroom/new?classroomId=new1&pack=${encodeURIComponent(pack.nameKey)}&lessonId=lesson-1`);
    });

    it('Given the teacher list cannot be saved, Then no starter pack is slipped in instead and the teacher is told', async () => {
      api.createLesson.mockResolvedValue({ success: false, error: 'offline' });
      render(<ClassSetupCreate />);
      paste('cat, dog, sun, moon');
      fireEvent.click(screen.getByTestId('setup-start-live'));
      await waitFor(() => expect(nav.replace).toHaveBeenCalled());
      expect(api.createLesson).toHaveBeenCalledTimes(1);
      expect(nav.replace.mock.calls[0][0]).toBe('/en/teacher/classroom/new?classroomId=new1');
      expect(toastMock.error).toHaveBeenCalledWith('eduShell.setup.assignFailed');
    });
  });
});
