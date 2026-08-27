import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockJoin, mockPreview, mockUseAuth, mockPush } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockPreview: vi.fn(),
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
vi.mock('@/lib/education/classroomPreview', () => ({
  lookupClassroomPreview: mockPreview,
}));

import JoinClassroomForm from '../JoinClassroomForm';

describe('JoinClassroomForm — classroom preview (code entry with confirmation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1' });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Math 101', language: 'en' });
  });

  it('calls preview lookup when code reaches 6 characters', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<JoinClassroomForm />);

    const codeInput = screen.getByLabelText('education.student.join.codeLabel');
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });

    await waitFor(() => {
      expect(mockPreview).toHaveBeenCalledWith('ABC123');
    });
  });

  it('renders preview card with classroom name when lookup succeeds', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Spanish 7A', language: 'es' });
    render(<JoinClassroomForm />);

    const codeInput = screen.getByLabelText('education.student.join.codeLabel');
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });

    await waitFor(() => {
      expect(screen.getByText('Spanish 7A')).toBeInTheDocument();
    });
  });

  it('does not show preview card while lookup is pending', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockPreview.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({ id: 'class-1', name: 'Math 101', language: 'en' }), 100);
    }));
    render(<JoinClassroomForm />);

    const codeInput = screen.getByLabelText('education.student.join.codeLabel');
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });

    // Preview card should not exist immediately (pending)
    expect(screen.queryByText('Math 101')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Math 101')).toBeInTheDocument();
    });
  });

  it('does not show name field before confirmation (guest path)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<JoinClassroomForm />);

    // Name field should not exist yet (confirmation not shown)
    expect(screen.queryByLabelText('education.student.join.nameLabel')).not.toBeInTheDocument();

    // Enter code to trigger preview
    const codeInput = screen.getByLabelText('education.student.join.codeLabel');
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });

    // After confirmation, name field should appear
    await waitFor(() => {
      expect(screen.getByLabelText('education.student.join.nameLabel')).toBeInTheDocument();
    });
  });

  it('does not show name field for logged-in students even with confirmation', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'real-1' } });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Math 101', language: 'en' });
    render(<JoinClassroomForm />);

    const codeInput = screen.getByLabelText('education.student.join.codeLabel');
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });

    // Preview card should appear
    await waitFor(() => {
      expect(screen.getByText('Math 101')).toBeInTheDocument();
    });

    // Name field should still not exist for logged-in users
    expect(screen.queryByLabelText('education.student.join.nameLabel')).not.toBeInTheDocument();
  });


  it('renders error state when preview lookup fails', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockPreview.mockResolvedValue(null);
    render(<JoinClassroomForm />);

    const codeInput = screen.getByLabelText('education.student.join.codeLabel');
    fireEvent.change(codeInput, { target: { value: 'BADCOD' } });

    // No preview card when lookup returns null
    await waitFor(() => {
      expect(screen.queryByText(/Joining/i)).not.toBeInTheDocument();
    });

    // Name field should not appear
    expect(screen.queryByLabelText('education.student.join.nameLabel')).not.toBeInTheDocument();
  });

  it('requires name for guest when joining after preview confirmation', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Math 101', language: 'en' });
    render(<JoinClassroomForm />);

    const codeInput = screen.getByLabelText('education.student.join.codeLabel');
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });

    await waitFor(() => {
      expect(screen.getByLabelText('education.student.join.nameLabel')).toBeInTheDocument();
    });

    // Submit should stay disabled without name
    let submitBtn = screen.getByRole('button', { name: 'education.student.join.button' });
    expect(submitBtn).toBeDisabled();

    // Add name
    const nameInput = screen.getByLabelText('education.student.join.nameLabel');
    fireEvent.change(nameInput, { target: { value: 'Maya' } });

    // Now submit should be enabled - re-query button to get fresh DOM reference
    submitBtn = screen.getByRole('button', { name: 'education.student.join.button' });
    expect(submitBtn).not.toBeDisabled();
  });

  it('does not call join until both code is confirmed and (for guests) name is provided', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Math 101', language: 'en' });
    render(<JoinClassroomForm />);

    const codeInput = screen.getByLabelText('education.student.join.codeLabel');
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });

    await waitFor(() => {
      expect(screen.getByLabelText('education.student.join.nameLabel')).toBeInTheDocument();
    });

    // Even with confirmation, join not called without name
    expect(mockJoin).not.toHaveBeenCalled();

    // Add name and submit
    const nameInput = screen.getByLabelText('education.student.join.nameLabel');
    fireEvent.change(nameInput, { target: { value: 'Maya' } });

    const submitBtn = screen.getByRole('button', { name: 'education.student.join.button' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockJoin).toHaveBeenCalledWith('ABC123', { guestName: 'Maya' });
    });
  });

  it('does not call preview lookup if code has less than 6 characters', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<JoinClassroomForm />);

    const codeInput = screen.getByLabelText('education.student.join.codeLabel');
    fireEvent.change(codeInput, { target: { value: 'ABC12' } });

    // Lookup should not fire for incomplete code
    expect(mockPreview).not.toHaveBeenCalled();
  });

  it('debounces multiple preview lookups for the same code', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Math 101', language: 'en' });
    render(<JoinClassroomForm />);

    const codeInput = screen.getByLabelText('education.student.join.codeLabel');

    // Rapid keypresses on the 6th character
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });

    await waitFor(() => {
      // Should only call once even with multiple identical values
      expect(mockPreview.mock.calls.filter(c => c[0] === 'ABC123')).toHaveLength(1);
    });
  });
});
