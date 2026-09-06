import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * One backspace must not kill the confirmation card for the rest of the session.
 *
 * The preview effect remembers the last code it looked up in
 * `lastPreviewCodeRef`. Dropping below six characters cleared `preview` but left
 * that ref pointing at the old code, so retyping the very same character matched
 * the "already looked this up" guard and returned before re-fetching. The green
 * "you are joining Math 101" card never came back — and `isLoadingPreview` was
 * left stuck true by the same branch.
 *
 * A student who mistypes one character and corrects it is the single most likely
 * thing to happen on this screen.
 */
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
vi.mock('@/lib/education/classroomPreview', () => ({ lookupClassroomPreview: mockPreview }));

import JoinClassroomForm from '../JoinClassroomForm';

describe('JoinClassroomForm — the preview survives a backspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1' });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Math 101', language: 'en' });
  });

  // Re-query every time. Reaching six characters mounts the guest name field
  // above this input, which detaches the node captured earlier — typing into
  // the stale node silently does nothing.
  const codeInput = () => screen.getByLabelText('education.student.join.codeLabel');

  it('re-fetches and shows the card again after deleting and retyping the last character', async () => {
    // GIVEN a code that resolved to a classroom
    render(<JoinClassroomForm />);
    fireEvent.change(codeInput(), { target: { value: 'ABC123' } });
    await waitFor(() => expect(screen.getByText('Math 101')).toBeInTheDocument());

    // WHEN the student backspaces and retypes the SAME character
    fireEvent.change(codeInput(), { target: { value: 'ABC12' } });
    await waitFor(() => expect(screen.queryByText('Math 101')).not.toBeInTheDocument());
    fireEvent.change(codeInput(), { target: { value: 'ABC123' } });

    // THEN the confirmation comes back rather than staying blank forever
    await waitFor(() => expect(screen.getByText('Math 101')).toBeInTheDocument());
    expect(mockPreview).toHaveBeenCalledTimes(2);
  });
});
