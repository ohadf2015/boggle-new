import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en', dir: 'ltr' }),
}));
let search = '';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search), useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
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
let pro = { hasPro: false, loading: false };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => ({ trial: null, isLoading: false }) }));
const markInviteCopied = vi.fn();
vi.mock('@/hooks/useTeacherActivationProgress', () => ({
  useTeacherActivationProgress: () => ({ progress: { inviteCopied: false, liveStarted: false, dismissed: false }, ready: true, markInviteCopied }),
}));

import { ClassSetupFlow } from '../ClassSetupFlow';

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  search = '';
  classrooms = [];
  pro = { hasPro: false, loading: false };
  createClassroom.mockReset();
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
    expect(screen.getByLabelText('eduShell.setup.languageLabel')).toHaveValue('en');
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

  it('When the teacher picks a grade and creates, Then the class is named from it and step 2 shows the code', async () => {
    createClassroom.mockResolvedValue({ success: true, data: NEW });
    render(<ClassSetupFlow />);
    await userEvent.click(screen.getByTestId('setup-grade-g35'));
    await userEvent.click(screen.getByTestId('setup-create'));
    expect(createClassroom).toHaveBeenCalledWith('eduShell.setup.gradeName.g35', 'en');
    expect(await screen.findByTestId('setup-step-ready')).toBeInTheDocument();
    expect(screen.getByTestId('setup-join-code')).toHaveTextContent('K7Q2');
    expect(screen.getByTestId('setup-qr').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('setup-start-game')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c9');
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
});
