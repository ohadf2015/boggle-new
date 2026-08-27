import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockJoin, mockUseAuth, mockPush, mockPreview } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  mockPreview: vi.fn(),
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
vi.mock('@/lib/education/classroomPreview', () => ({
  lookupClassroomPreview: mockPreview,
}));

import JoinClassroomForm from '../JoinClassroomForm';

const submitBtn = () => screen.getByRole('button', { name: 'education.student.join.button' });

describe('JoinClassroomForm — guest (account-less) join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1' });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Math 101', language: 'en' });
  });

  it('shows a name field for logged-out students after code confirmation', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<JoinClassroomForm />);

    // Enter code to trigger preview
    const codeInput = screen.getByLabelText('education.student.join.codeLabel');
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });

    // Wait for name field to appear (after preview confirmation)
    const nameInput = await screen.findByLabelText('education.student.join.nameLabel');
    fireEvent.change(nameInput, { target: { value: 'Maya' } });
    fireEvent.click(submitBtn());

    await waitFor(() => {
      expect(mockJoin).toHaveBeenCalledWith('ABC123', { guestName: 'Maya' });
    });
  });

  it('does NOT show a name field for logged-in students and joins without guestName', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'real-1' } });
    render(<JoinClassroomForm />);

    expect(screen.queryByLabelText('education.student.join.nameLabel')).not.toBeInTheDocument();

    // Enter code to trigger preview
    fireEvent.change(screen.getByLabelText('education.student.join.codeLabel'), { target: { value: 'ABC123' } });

    // Wait for button to be enabled (preview loaded)
    await waitFor(() => {
      expect(submitBtn()).not.toBeDisabled();
    });

    fireEvent.click(submitBtn());

    await waitFor(() => {
      expect(mockJoin).toHaveBeenCalledWith('ABC123', undefined);
    });
  });

  it('keeps the guest submit disabled with no name (cannot call join)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<JoinClassroomForm />);

    fireEvent.change(screen.getByLabelText('education.student.join.codeLabel'), { target: { value: 'ABC123' } });

    // Wait for name field to appear (preview loaded)
    await screen.findByLabelText('education.student.join.nameLabel');

    // No name → button stays disabled, so join can never be triggered.
    expect(submitBtn()).toBeDisabled();
    expect(mockJoin).not.toHaveBeenCalled();
  });
});
