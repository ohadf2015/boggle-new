import { describe, it, expect, vi, beforeEach, afterEach, onTestFinished } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en', dir: 'ltr' }),
}));
let search = '';
const routerReplace = vi.fn();
const routerPush = vi.fn();
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search), useRouter: () => ({ replace: routerReplace, push: routerPush }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
const guide = vi.hoisted(() => ({ trackFirstRoundGuideShown: vi.fn(), trackFirstRoundGuideClicked: vi.fn() }));
vi.mock('@/lib/education/firstRoundGuideTelemetry', () => guide);
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({ default: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));
vi.mock('@/components/teacher/ClassLimitUpsellModal', () => ({
  default: ({ isOpen, reason }: { isOpen: boolean; reason?: string }) =>
    isOpen ? <div role="dialog" data-testid={`upsell-${reason ?? 'class_limit'}`} /> : null,
}));
vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => <div data-testid="projector-sheet" /> }));

const createClassroom = vi.fn();
let classrooms: { id: string; name: string; join_code: string; member_count: number; language: string }[];
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms, isLoading: false, error: null, createClassroom, refresh: vi.fn() }),
}));
let pro: { hasPro: boolean; loading: boolean; accessTrialExpires?: string | null } = { hasPro: false, loading: false };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
let trial: { isExpired: boolean } | null = null;
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => ({ trial, isLoading: false }) }));
const markInviteCopied = vi.fn();
vi.mock('@/hooks/useTeacherActivationProgress', () => ({
  useTeacherActivationProgress: () => ({ progress: { inviteCopied: false, liveStarted: false, roomOpened: false, dismissed: false }, ready: true, markInviteCopied }),
}));

const telemetry = vi.hoisted(() => ({
  trackEduClassroomCreated: vi.fn(),
  trackEduJoinCodeShown: vi.fn(),
  trackEduJoinCodeCopied: vi.fn(),
  trackEduJoinCodeShared: vi.fn(),
  trackEduFirstStudentJoined: vi.fn(),
}));
vi.mock('@/lib/education/telemetry', () => telemetry);
const funnel = vi.fn();
vi.mock('@/lib/education/teacherOnboardingFunnel', async (orig) => ({
  ...(await orig<typeof import('@/lib/education/teacherOnboardingFunnel')>()),
  captureTeacherOnboardingFunnel: (...a: unknown[]) => funnel(...a),
}));
let roster: { students: { id: string }[]; loading: boolean; arrivals: string[] };
const rosterCalls: unknown[][] = [];
vi.mock('@/components/teacher/hq/useClassRoster', () => ({
  useClassRoster: (...a: unknown[]) => {
    rosterCalls.push(a);
    return roster;
  },
}));
const shareWithFallback = vi.fn();
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: (...a: unknown[]) => shareWithFallback(...a) }));

import { ClassSetupFlow } from '../ClassSetupFlow';
import { QUICK_LAUNCH_KEY } from '@/components/teacher/dashboard/quickLaunchIntent';
import { recommendedPack, packsForLanguage } from '../starterPackPick';

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  search = '';
  classrooms = [];
  trial = null;
  pro = { hasPro: false, loading: false };
  createClassroom.mockReset();
  roster = { students: [], loading: false, arrivals: [] };
  rosterCalls.length = 0;
  sessionStorage.clear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const NEW = { id: 'c9', name: '5B', join_code: 'K7Q2', language: 'en' };

describe('<ClassSetupFlow>', () => {
  it('Given step 1, Then it asks only name, grade and language, with smart defaults', () => {
    render(<ClassSetupFlow />);
    expect(screen.getByTestId('setup-step-details')).toBeInTheDocument();
    expect(screen.getByLabelText('eduShell.setup.nameLabel')).toHaveValue('');
    expect(screen.getAllByTestId(/^setup-grade-/)).toHaveLength(5);
    const language = screen.getByRole('radiogroup', { name: 'eduShell.setup.languageLabel' });
    expect(within(language).getByRole('radio', { name: /English/ })).toBeChecked();
  });

  it('Given step 1, Then a starter pack is already picked and skipping is always one tap away', () => {
    render(<ClassSetupFlow />);
    const packs = screen.getByRole('radiogroup', { name: 'eduShell.setup.packLabel' });
    expect(within(packs).getAllByRole('radio').length).toBe(packsForLanguage('en').length);
    expect(within(packs).getByRole('radio', { checked: true })).toHaveAttribute('data-pack', recommendedPack('en', null).nameKey);
    expect(screen.getByTestId('setup-skip')).toHaveAttribute('href', '/en/teacher');
    expect(screen.getByTestId('setup-start-live')).toHaveAttribute('data-hero', 'true');
  });

  it('Given each first-run choice, Then the mascot pose points at the next one', async () => {
    render(<ClassSetupFlow />);
    expect(screen.getByTestId('edu-mascot-pickGrade')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('setup-grade-k2'));
    expect(screen.getByTestId('edu-mascot-pickLanguage')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Español|Spanish/ }));
    expect(screen.getByTestId('edu-mascot-firstClass')).toBeInTheDocument();
  });

  it('When Start live game is pressed, Then the class is made and the teacher lands in a live lobby with the picked pack', async () => {
    createClassroom.mockResolvedValue({ success: true, data: NEW });
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-grade-g912'));
    const other = packsForLanguage('en').find((p) => p.nameKey !== recommendedPack('en', 'g912').nameKey)!;
    await userEvent.click(screen.getByRole('radio', { name: new RegExp(other.nameKey) }));
    await userEvent.click(screen.getByTestId('setup-start-live'));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/en/education/classroom-game?flow=quickLaunch'));
    expect(createClassroom).toHaveBeenCalledWith('eduShell.setup.gradeName.g912', 'en');
    expect(telemetry.trackEduClassroomCreated).toHaveBeenCalledTimes(1);
    expect(funnel).toHaveBeenCalledWith('classroom_created', expect.objectContaining({ locale: 'en' }));
    const intent = JSON.parse(sessionStorage.getItem(QUICK_LAUNCH_KEY) ?? 'null');
    expect(intent).toMatchObject({ source: 'pack', packKey: other.nameKey, classroomId: 'c9', language: other.language });
  });

  it('Given the free cap is hit, When Start live game is pressed, Then the upsell opens and nothing launches', async () => {
    classrooms = ['a', 'b', 'c'].map((id) => ({ id, name: id, join_code: id.repeat(4), member_count: 0, language: 'en' }));
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-start-live'));
    expect(await screen.findByTestId('upsell-class_limit')).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('Given a free teacher, Then the cap meter shows how many classes are left', () => {
    classrooms = [{ id: 'a', name: 'A', join_code: 'AAAA', member_count: 0, language: 'en' }];
    render(<ClassSetupFlow />);
    expect(screen.getByTestId('setup-cap-meter')).toHaveTextContent('eduShell.setup.capMeter:{"count":1,"limit":3}');
  });

  it('Given a Pro teacher, Then there is no cap meter', () => {
    pro = { hasPro: true, loading: false };
    render(<ClassSetupFlow />);
    expect(screen.queryByTestId('setup-cap-meter')).not.toBeInTheDocument();
  });

  it('Given a teacher on a live access trial, Then there is no cap meter, matching the server cap', () => {
    pro = { hasPro: false, loading: false, accessTrialExpires: new Date(Date.now() + 3 * 86_400_000).toISOString() };
    classrooms = [{ id: 'a', name: 'A', join_code: 'AAAA', member_count: 0, language: 'en' }];
    render(<ClassSetupFlow />);
    expect(screen.queryByTestId('setup-cap-meter')).not.toBeInTheDocument();
  });

  it('When the teacher picks a grade and creates, Then the class is named from it and step 2 shows the code', async () => {
    createClassroom.mockResolvedValue({ success: true, data: NEW });
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-grade-g35'));
    await userEvent.click(screen.getByTestId('setup-create'));
    expect(createClassroom).toHaveBeenCalledWith('eduShell.setup.gradeName.g35', 'en');
    expect(await screen.findByTestId('setup-step-ready')).toBeInTheDocument();
    expect(screen.getByTestId('setup-join-code')).toHaveTextContent('K7Q2');
    await waitFor(() => expect(screen.getByTestId('setup-qr').querySelector('svg')).not.toBeNull());
    expect(screen.getByTestId('setup-start-game')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c9&minutes=2');
  });

  it('When a class is created, Then the join code is reported shown once with no click and the URL keeps the class', async () => {
    createClassroom.mockResolvedValue({ success: true, data: NEW });
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-create'));
    expect(await screen.findByTestId('setup-join-code')).toBeVisible();
    expect(telemetry.trackEduJoinCodeShown).toHaveBeenCalledTimes(1);
    expect(telemetry.trackEduJoinCodeShown).toHaveBeenCalledWith({ classroomId: 'c9' });
    expect(telemetry.trackEduClassroomCreated).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith('/en/teacher/classroom/new?classroomId=c9', { scroll: false });
  });

  it('Given no student yet, Then putting the code on the projector is the one hero and starting a game is demoted', async () => {
    search = 'classroomId=a';
    classrooms = [{ id: 'a', name: 'A', join_code: 'ABCD', member_count: 0, language: 'en' }];
    render(<ClassSetupFlow />);
    expect(screen.getByTestId('setup-joined-count')).toHaveTextContent('eduShell.setup.joinedNone');
    expect(screen.getByTestId('setup-projector')).toHaveAttribute('data-hero', 'true');
    expect(screen.getByTestId('setup-copy-link')).toHaveAttribute('data-hero', 'false');
    expect(screen.getByTestId('setup-start-game')).toHaveAttribute('data-hero', 'false');
    expect(screen.getAllByText('eduShell.setup.firstRound.start')).toHaveLength(1);
    expect(screen.queryByTestId('first-round-guide')).toBeNull();
    expect(guide.trackFirstRoundGuideShown).toHaveBeenCalledWith({ surface: 'class_ready', locale: 'en' });
    await userEvent.click(screen.getByTestId('setup-projector'));
    expect(screen.getByTestId('projector-sheet')).toBeInTheDocument();
    const start = screen.getByTestId('setup-start-game');
    start.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(start);
    expect(guide.trackFirstRoundGuideClicked).toHaveBeenCalledWith({ surface: 'class_ready', locale: 'en', step: 'start_round' });
    expect(screen.getByTestId('rehearse-with-bots')).toBeInTheDocument();
  });

  it('Given the roster is still loading, Then the counter claims no number', () => {
    search = 'classroomId=a';
    classrooms = [{ id: 'a', name: 'A', join_code: 'ABCD', member_count: 0, language: 'en' }];
    roster = { students: [], loading: true, arrivals: [] };
    render(<ClassSetupFlow />);
    expect(screen.getByTestId('setup-joined-count')).toHaveTextContent('…');
    expect(screen.getByTestId('setup-joined-count')).not.toHaveTextContent('joinedNone');
  });

  it('Given the ready screen, Then the roster is polled every 5 seconds', () => {
    search = 'classroomId=a';
    classrooms = [{ id: 'a', name: 'A', join_code: 'ABCD', member_count: 0, language: 'en' }];
    render(<ClassSetupFlow />);
    expect(rosterCalls[0]).toEqual(['a', expect.any(String), 5000]);
  });

  it('When the first student joins, Then the counter rises, first-student fires once and Start a quick game becomes the one hero', async () => {
    search = 'classroomId=a';
    classrooms = [{ id: 'a', name: 'A', join_code: 'ABCD', member_count: 0, language: 'en' }];
    const { rerender } = render(<ClassSetupFlow />);
    expect(telemetry.trackEduFirstStudentJoined).not.toHaveBeenCalled();
    roster = { students: [{ id: 's1' }], loading: false, arrivals: ['s1'] };
    rerender(<ClassSetupFlow />);
    expect(screen.getByTestId('setup-joined-count')).toHaveTextContent('eduShell.setup.joinedOne');
    expect(telemetry.trackEduFirstStudentJoined).toHaveBeenCalledTimes(1);
    expect(telemetry.trackEduFirstStudentJoined).toHaveBeenCalledWith({ classroomId: 'a' });
    expect(funnel).toHaveBeenCalledWith('student_joined', expect.objectContaining({ locale: 'en' }));
    const start = screen.getByTestId('setup-start-game');
    expect(start).toHaveAttribute('data-hero', 'true');
    expect(start).toHaveTextContent('eduShell.setup.startQuick');
    expect(screen.getByTestId('setup-projector')).toHaveAttribute('data-hero', 'false');
    expect(screen.getByTestId('setup-copy-link')).toHaveAttribute('data-hero', 'false');
    roster = { students: [{ id: 's1' }, { id: 's2' }], loading: false, arrivals: ['s2'] };
    rerender(<ClassSetupFlow />);
    expect(screen.getByTestId('setup-joined-count')).toHaveTextContent('eduShell.setup.joinedMany:{"count":2}');
    expect(telemetry.trackEduFirstStudentJoined).toHaveBeenCalledTimes(1);
  });

  it('Given a class that already has students, When it opens, Then first-student does not fire', () => {
    search = 'classroomId=a';
    classrooms = [{ id: 'a', name: 'A', join_code: 'ABCD', member_count: 3, language: 'en' }];
    roster = { students: [{ id: 's1' }, { id: 's2' }, { id: 's3' }], loading: false, arrivals: [] };
    render(<ClassSetupFlow />);
    expect(telemetry.trackEduFirstStudentJoined).not.toHaveBeenCalled();
  });

  it('When WhatsApp or Google Classroom is tapped, Then each opens its share URL and reports its method', async () => {
    search = 'classroomId=a';
    classrooms = [{ id: 'a', name: 'A', join_code: 'ABCD', member_count: 0, language: 'en' }];
    render(<ClassSetupFlow />);
    const wa = await screen.findByTestId('setup-share-whatsapp');
    expect(wa).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/\?text=.*%2Fen%2Fjoin%2FABCD/));
    wa.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(wa);
    expect(telemetry.trackEduJoinCodeShared).toHaveBeenLastCalledWith({ classroomId: 'a', method: 'whatsapp' });
    const gc = screen.getByTestId('setup-share-google');
    expect(gc).toHaveAttribute('href', expect.stringMatching(/^https:\/\/classroom\.google\.com\/share\?/));
    gc.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(gc);
    expect(telemetry.trackEduJoinCodeShared).toHaveBeenLastCalledWith({ classroomId: 'a', method: 'google_classroom' });
  });

  it('When Share is tapped, Then the native sheet is used and a clipboard fallback is reported as such', async () => {
    search = 'classroomId=a';
    classrooms = [{ id: 'a', name: 'A', join_code: 'ABCD', member_count: 0, language: 'en' }];
    render(<ClassSetupFlow />);
    shareWithFallback.mockResolvedValueOnce('shared');
    await userEvent.click(await screen.findByTestId('setup-share-native'));
    expect(shareWithFallback).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringMatching(/\/en\/join\/ABCD$/) }));
    expect(telemetry.trackEduJoinCodeShared).toHaveBeenLastCalledWith({ classroomId: 'a', method: 'native' });
    shareWithFallback.mockResolvedValueOnce('copied');
    await userEvent.click(screen.getByTestId('setup-share-native'));
    expect(telemetry.trackEduJoinCodeShared).toHaveBeenLastCalledWith({ classroomId: 'a', method: 'copy_fallback' });
    expect(toastSuccess).toHaveBeenCalledWith('eduShell.setup.copied');
    shareWithFallback.mockResolvedValueOnce('cancelled');
    await userEvent.click(screen.getByTestId('setup-share-native'));
    expect(telemetry.trackEduJoinCodeShared).toHaveBeenCalledTimes(2);
  });

  it('When a class is created from a scrolled-down form, Then the ready screen opens from its top with focus on its title', async () => {
    createClassroom.mockResolvedValue({ success: true, data: NEW });
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    onTestFinished(() => {
      Element.prototype.scrollIntoView = original;
    });
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-create'));
    const title = await screen.findByRole('heading', { name: 'eduShell.setup.readyTitle' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(scrollIntoView.mock.contexts[0]).toContainElement(screen.getByRole('list', { name: 'eduShell.setup.stepsLabel' }));
  });

  it('Given the ready screen is shown, Then the share step is recorded at show time', async () => {
    createClassroom.mockResolvedValue({ success: true, data: NEW });
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-create'));
    await screen.findByTestId('setup-step-ready');
    expect(markInviteCopied).toHaveBeenCalledTimes(1);
  });

  it('When Copy invite link is tapped, Then the join link is copied and a toast says so', async () => {
    createClassroom.mockResolvedValue({ success: true, data: NEW });
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-create'));
    await userEvent.click(await screen.findByTestId('setup-copy-link'));
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/en\/join\/K7Q2$/));
    expect(toastSuccess).toHaveBeenCalledWith('eduShell.setup.copied');
    expect(telemetry.trackEduJoinCodeCopied).toHaveBeenCalledWith({ classroomId: 'c9' });
  });

  it('Given the free class cap already hit, When create is tapped, Then the upsell opens without posting', async () => {
    classrooms = [
      { id: 'a', name: 'A', join_code: 'AAAA', member_count: 0, language: 'en' },
      { id: 'b', name: 'B', join_code: 'BBBB', member_count: 0, language: 'en' },
      { id: 'c', name: 'C', join_code: 'CCCC', member_count: 0, language: 'en' },
    ];
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-create'));
    expect(createClassroom).not.toHaveBeenCalled();
    expect(await screen.findByTestId('upsell-class_limit')).toBeInTheDocument();
  });

  it('Given the free class cap, When create is refused, Then the class-limit upsell opens', async () => {
    createClassroom.mockResolvedValue({ success: false, code: 'CLASS_LIMIT_REACHED', currentCount: 3, limit: 3 });
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-create'));
    expect(await screen.findByTestId('upsell-class_limit')).toBeInTheDocument();
  });

  it('Given a failed create, Then an inline error offers a retry and the button is usable again', async () => {
    createClassroom.mockResolvedValueOnce({ success: false, error: 'boom' }).mockResolvedValueOnce({ success: true, data: NEW });
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-create'));
    expect(await screen.findByRole('alert')).toHaveTextContent('eduShell.setup.createFailed');
    await userEvent.click(screen.getByTestId('setup-create'));
    await waitFor(() => expect(screen.getByTestId('setup-step-ready')).toBeInTheDocument());
  });

  it('Given ?classroomId= of an existing class, Then it opens straight on that class’s code', () => {
    search = 'classroomId=a';
    classrooms = [{ id: 'a', name: 'A', join_code: 'ABCD', member_count: 0, language: 'en' }];
    render(<ClassSetupFlow />);
    expect(screen.getByTestId('setup-join-code')).toHaveTextContent('ABCD');
  });

  it('Given an expired trial and no class yet, Then the first class opens with no Pro ask in front of it', () => {
    trial = { isExpired: true };
    render(<ClassSetupFlow />);
    expect(screen.queryByTestId('upsell-trial_expired')).toBeNull();
  });

  it('Given an expired trial and a class already made, Then the Pro ask still greets the next class', () => {
    trial = { isExpired: true };
    classrooms = [{ id: 'a', name: 'A', join_code: 'AAAA', member_count: 0, language: 'en' }];
    render(<ClassSetupFlow />);
    expect(screen.getByTestId('upsell-trial_expired')).toBeInTheDocument();
  });
});
