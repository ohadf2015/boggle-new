/**
 * A failed classroom preview must never stop a student joining.
 *
 * The preview card is a courtesy: it tells a student which room they are about to walk into, so
 * they are not typing a code blind. It comes from an unauthenticated, rate-limited endpoint.
 *
 * A round of this feature shipped with `disabled={isSubmitting || !preview || ...}` on the join
 * button, which turned that courtesy into a gate: if the lookup failed, was slow, or returned 429,
 * a student holding a perfectly valid code found a dead button and no explanation. The failure mode
 * is worst exactly when it matters most — a class of thirty joining at once shares one school IP,
 * so the preview rate limit trips partway through and everyone after that is locked out.
 *
 * This pins the invariant: a well-formed code is the precondition, the server is the validator,
 * and the preview is decoration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// vi.hoisted, because vi.mock factories are lifted above ordinary const declarations.
const { mockJoin, mockPreview, mockUseAuth } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockPreview: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/student/join',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('@/lib/education/classroomPreview', () => ({
  lookupClassroomPreview: (...a: unknown[]) => mockPreview(...a),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) => React.createElement('div', p, children as React.ReactNode) }),
}));

import JoinClassroomForm from '../JoinClassroomForm';

const submitBtn = () => screen.getByRole('button', { name: /join\.button/i });

/** Signed-in student types a valid six-character code. Does not submit. */
function typeValidCode(code = 'ABC123') {
  mockUseAuth.mockReturnValue({ user: { id: 'real-1' } });
  render(<JoinClassroomForm />);
  fireEvent.change(screen.getByLabelText('education.student.join.codeLabel'), {
    target: { value: code },
  });
}

describe('JoinClassroomForm — the preview must never gate the join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1' });
  });

  it('lets a student join when the preview lookup fails outright', async () => {
    mockPreview.mockRejectedValue(new Error('network down'));

    typeValidCode();
    await waitFor(() => expect(submitBtn()).not.toBeDisabled());

    fireEvent.click(submitBtn());
    await waitFor(() => expect(mockJoin).toHaveBeenCalled());
  });

  it('lets a student join when the preview comes back empty (rate limited)', async () => {
    // Thirty kids on one school IP: the preview endpoint starts 429ing partway through the class.
    mockPreview.mockResolvedValue(null);

    typeValidCode();
    await waitFor(() => expect(submitBtn()).not.toBeDisabled());

    fireEvent.click(submitBtn());
    await waitFor(() => expect(mockJoin).toHaveBeenCalled());
  });

  it('lets a student join before the preview has come back at all', async () => {
    // A student who types fast and hits Join inside the 300ms debounce.
    mockPreview.mockImplementation(() => new Promise(() => {})); // never resolves

    typeValidCode();

    expect(submitBtn()).not.toBeDisabled();
    fireEvent.click(submitBtn());
    await waitFor(() => expect(mockJoin).toHaveBeenCalled());
  });

  it('still blocks an incomplete code — the real precondition', () => {
    mockPreview.mockResolvedValue(null);
    typeValidCode('AB');
    expect(submitBtn()).toBeDisabled();
  });
});
