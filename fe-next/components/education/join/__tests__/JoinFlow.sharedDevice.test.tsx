import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockPush, mockSignOut } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, string>) => (params && typeof params === 'object' ? `${k}:${JSON.stringify(params)}` : k),
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn(), trackJoinCodeStepRefused: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ signOut: mockSignOut, resendEmailVerification: vi.fn() }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => <div data-testid="join-language-chip" /> }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';
import { getStoredUsername, setStoredUsername, clearStoredUsername } from '@/utils/profileStorage';

const K = 'education.student.join';
const confirmTitle = (name: string) => screen.getByText(`${K}.returning.title:${JSON.stringify({ name })}`);
const yes = () => screen.getByRole('button', { name: `${K}.returning.yes` });
const notMe = () => screen.getByRole('button', { name: `${K}.returning.notMe` });

const anonymous = { id: 'guest-1', is_anonymous: true, user_metadata: { full_name: 'Dana' } };

describe('<JoinFlow> on a shared device', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStoredUsername();
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 7' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1' });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('Given the previous student\'s guest session, When the QR opens, Then it asks "Continue as Dana?" and joins nobody yet', async () => {
    mockUseAuth.mockReturnValue({ user: anonymous, loading: false });
    render(<JoinFlow initialCode="P45KRT" />);
    expect(await screen.findByText(`${K}.returning.title:${JSON.stringify({ name: 'Dana' })}`)).toBeInTheDocument();
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('Given that prompt, When they tap "Yes, that\'s me", Then the session joins once', async () => {
    mockUseAuth.mockReturnValue({ user: anonymous, loading: false });
    render(<JoinFlow initialCode="P45KRT" />);
    await waitFor(() => confirmTitle('Dana'));
    fireEvent.click(yes());
    await waitFor(() => expect(mockJoin).toHaveBeenCalledTimes(1));
    expect(mockJoin).toHaveBeenCalledWith('P45KRT', {});
  });

  it.each([
    ['a live game code', { success: true, classroomId: 'c1', gameCode: 'P45KRT' }],
    ['a locked room', { success: false, code: 'ROOM_LOCKED' }],
    ['the teacher\'s own class', { success: false, code: 'TEACHER_OWN_CLASS' }],
  ])('Given "Yes" and %s, Then the join is sent exactly once', async (_label, answer) => {
    mockUseAuth.mockReturnValue({ user: anonymous, loading: false });
    mockJoin.mockResolvedValue(answer);
    render(<JoinFlow initialCode="P45KRT" />);
    await waitFor(() => confirmTitle('Dana'));
    fireEvent.click(yes());
    await waitFor(() => expect(mockJoin).toHaveBeenCalledTimes(1));
    await act(async () => { await new Promise((r) => setTimeout(r, 900)); });
    expect(mockJoin).toHaveBeenCalledTimes(1);
  });

  it('Given that prompt, When they tap "Not me", Then the old guest is signed out and a clean name step shows', async () => {
    let auth = { user: anonymous as typeof anonymous | null, loading: false };
    mockUseAuth.mockImplementation(() => auth);
    setStoredUsername('Dana');
    const { rerender } = render(<JoinFlow initialCode="P45KRT" />);
    await waitFor(() => confirmTitle('Dana'));
    await act(async () => { fireEvent.click(notMe()); });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(getStoredUsername()).toBeNull();
    auth = { user: null, loading: false };
    rerender(<JoinFlow initialCode="P45KRT" />);
    const field = await screen.findByLabelText(`${K}.nameLabel`);
    expect((field as HTMLInputElement).value).not.toBe('Dana');
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('Given only a remembered name on this device, When they confirm, Then they join as that name', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setStoredUsername('Maya');
    render(<JoinFlow initialCode="P45KRT" />);
    await waitFor(() => confirmTitle('Maya'));
    fireEvent.click(yes());
    await waitFor(() => expect(mockJoin).toHaveBeenCalledWith('P45KRT', { guestName: 'Maya' }));
  });

  it('Given a fresh device, Then there is no prompt: the 1-tap name step opens', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<JoinFlow initialCode="P45KRT" />);
    expect(await screen.findByLabelText(`${K}.nameLabel`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: `${K}.returning.yes` })).not.toBeInTheDocument();
  });

  it('Given a remembered name we generated ourselves, Then there is no prompt', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setStoredUsername('Sneaky Potato');
    render(<JoinFlow initialCode="P45KRT" />);
    expect(await screen.findByLabelText(`${K}.nameLabel`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: `${K}.returning.yes` })).not.toBeInTheDocument();
  });

  it('Given a real signed-in account, Then the invite still auto-joins with no prompt', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 's1', is_anonymous: false, email: 's@x.edu', email_confirmed_at: 'x' }, loading: false });
    render(<JoinFlow initialCode="P45KRT" />);
    await waitFor(() => expect(mockJoin).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: `${K}.returning.yes` })).not.toBeInTheDocument();
  });

  it('Given the server replaced the typed name, Then the device remembers the replacement', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1', displayName: 'Turbo Salmon' });
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(await screen.findByLabelText(`${K}.nameLabel`), { target: { value: 'rude' } });
    fireEvent.click(screen.getByRole('button', { name: /education\.student\.join\.flow\.go/ }));
    await waitFor(() => expect(getStoredUsername()).toBe('Turbo Salmon'));
  });
});

describe('<JoinFlow> join chrome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStoredUsername();
    mockResolve.mockResolvedValue({ verdict: 'classroom' });
  });

  it('shows the language chip on the join header', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<JoinFlow />);
    expect(screen.getByTestId('join-language-chip')).toBeInTheDocument();
  });

  it('Given a guest, Then the email-recovery door is not offered', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<JoinFlow initialCode="P45KRT" />);
    await screen.findByLabelText(`${K}.nameLabel`);
    expect(screen.queryByTestId('join-unconfirmed-open')).not.toBeInTheDocument();
  });

  it('Given letters no layout can map, When typed, Then the code field explains instead of staying silently empty', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<JoinFlow />);
    fireEvent.change(screen.getByLabelText(`${K}.codeLabel`), { target: { value: 'αβγ' } });
    expect(screen.getByText(`${K}.codeStripped`)).toBeInTheDocument();
  });
});
