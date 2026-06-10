import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockJoin, mockUseAuth, mockPush } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) => React.createElement('div', p, children as React.ReactNode) }),
}));

import JoinClassroomForm from '../JoinClassroomForm';

const submitBtn = () => screen.getByRole('button', { name: /join\.button/i });

describe('JoinClassroomForm — guest (account-less) join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1' });
  });

  it('shows a name field for logged-out students and passes the name as guestName', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<JoinClassroomForm />);

    const nameInput = screen.getByLabelText('education.student.join.nameLabel');
    expect(nameInput).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'Maya' } });
    fireEvent.change(screen.getByLabelText('education.student.join.codeLabel'), { target: { value: 'ABC123' } });
    fireEvent.click(submitBtn());

    await waitFor(() => {
      expect(mockJoin).toHaveBeenCalledWith('ABC123', { guestName: 'Maya' });
    });
  });

  it('does NOT show a name field for logged-in students and joins without guestName', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'real-1' } });
    render(<JoinClassroomForm />);

    expect(screen.queryByLabelText('education.student.join.nameLabel')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('education.student.join.codeLabel'), { target: { value: 'ABC123' } });
    fireEvent.click(submitBtn());

    await waitFor(() => {
      expect(mockJoin).toHaveBeenCalledWith('ABC123', undefined);
    });
  });

  it('keeps the guest submit disabled with no name (cannot call join)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<JoinClassroomForm />);

    fireEvent.change(screen.getByLabelText('education.student.join.codeLabel'), { target: { value: 'ABC123' } });
    // No name → button stays disabled, so join can never be triggered.
    expect(submitBtn()).toBeDisabled();
    expect(mockJoin).not.toHaveBeenCalled();
  });
});
