import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockPush, mockClassroom } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  mockClassroom: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, unknown>) => (params ? `${k}:${JSON.stringify(params)}` : k),
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: mockClassroom }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const K = 'education.student.join';
const endedPanel = () => screen.queryByTestId('join-ended-panel');
const codeField = () => screen.queryByLabelText(`${K}.codeLabel`) as HTMLInputElement | null;

describe('<JoinFlow> — a code whose game has ended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockClassroom.mockReturnValue({ classroomId: null, isLoading: false });
  });

  it('GIVEN the lookup says ended WHEN the QR lands THEN the ended state shows, not the code field with an error', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended', label: 'Year 9 English' });
    render(<JoinFlow initialCode="ABC123" />);

    await waitFor(() => expect(endedPanel()).toBeInTheDocument());
    expect(screen.getByText(`${K}.ended.title`)).toBeInTheDocument();
    expect(screen.getByText(`${K}.ended.body`)).toBeInTheDocument();
    expect(codeField()).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('GIVEN the join itself answers SESSION_ENDED THEN the ended state shows', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    mockJoin.mockResolvedValue({ success: false, code: 'SESSION_ENDED' });
    render(<JoinFlow initialCode="ABC123" />);

    const name = await screen.findByLabelText(`${K}.nameLabel`);
    fireEvent.change(name, { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${K}\\.flow\\.go`) }));

    await waitFor(() => expect(endedPanel()).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('GIVEN the server enrolled them off an ended game code THEN the ended state shows with their class, and nothing navigates', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c9', endedSessionCode: true });
    render(<JoinFlow initialCode="ABC123" />);

    const name = await screen.findByLabelText(`${K}.nameLabel`);
    fireEvent.change(name, { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${K}\\.flow\\.go`) }));

    await waitFor(() => expect(endedPanel()).toBeInTheDocument());
    expect(screen.getByRole('link', { name: `${K}.ended.toClass` })).toHaveAttribute('href', '/en/student?class=open');
    await new Promise((r) => setTimeout(r, 900));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('GIVEN the ended state WHEN the student taps "type a new code" THEN an empty code field is back', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow initialCode="ABC123" />);
    await waitFor(() => expect(endedPanel()).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: `${K}.ended.newCode` }));

    expect(endedPanel()).toBeNull();
    expect(codeField()).toHaveValue('');
  });

  it('GIVEN the student has a class THEN the ended state links to it, inside edu', async () => {
    mockClassroom.mockReturnValue({ classroomId: 'c1', isLoading: false });
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow initialCode="ABC123" />);
    await waitFor(() => expect(endedPanel()).toBeInTheDocument());

    expect(screen.getByRole('link', { name: `${K}.ended.toClass` })).toHaveAttribute(
      'href',
      '/en/student?class=open'
    );
  });

  it('GIVEN no class THEN there is no class link', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow initialCode="ABC123" />);
    await waitFor(() => expect(endedPanel()).toBeInTheDocument());

    expect(screen.queryByRole('link', { name: `${K}.ended.toClass` })).toBeNull();
  });

  it('GIVEN a typed code the lookup calls ended WHEN NEXT is pressed THEN the ended state shows', async () => {
    mockResolve.mockResolvedValue({ verdict: 'ended' });
    render(<JoinFlow />);
    fireEvent.change(codeField()!, { target: { value: 'ABC12' } });
    fireEvent.change(codeField()!, { target: { value: 'ABC123' } });

    await waitFor(() => expect(endedPanel()).toBeInTheDocument());
  });
});
