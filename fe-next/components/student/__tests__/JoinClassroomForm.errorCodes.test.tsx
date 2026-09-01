import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';

/**
 * The form branched on `result.error?.includes('already' | 'not found')` — substring
 * matches against English prose generated on the server. Two consequences shipped:
 *
 * 1. A full classroom fell through to the `else`, which does `toast.error(result.error)`
 *    — so a student in Hebrew, Japanese or Spanish was shown the raw server sentence
 *    "This classroom has reached the free tier limit of 10 students." Untranslated, and
 *    it leaks our billing tiers to someone who cannot act on them.
 * 2. The `'already'` branch is unreachable: the join route returns **200** for an
 *    existing member (its own docblock claims 409, but the code does not), so the hook
 *    reports success and the form redirects. Dead code guarding a case that never fires.
 *
 * The fix is to branch on the machine code the server already puts on the wire, which is
 * the convention the sibling class-limit path already uses (`ClassroomManager.tsx:60`
 * switches on `CLASS_LIMIT_REACHED`).
 */

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

/** Types a valid code as a logged-in student and submits. */
function submitCode() {
  mockUseAuth.mockReturnValue({ user: { id: 'real-1' } });
  render(<JoinClassroomForm />);
  fireEvent.change(screen.getByLabelText('education.student.join.codeLabel'), {
    target: { value: 'ABC123' },
  });
  fireEvent.click(submitBtn());
}

describe('JoinClassroomForm — server error codes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a translated message when the classroom is full, never the server prose', async () => {
    mockJoin.mockResolvedValue({
      success: false,
      code: 'STUDENT_LIMIT_REACHED',
      error: 'This classroom has reached the free tier limit of 10 students.',
    });

    submitCode();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('education.student.join.classroomFull');
    // The student must not be shown our pricing tiers, in any language.
    const shown = vi.mocked(toast.error).mock.calls.map(([m]) => String(m)).join(' ');
    expect(shown).not.toMatch(/free tier/i);
  });

  it('shows the invalid-code message when the code does not resolve', async () => {
    mockJoin.mockResolvedValue({
      success: false,
      code: 'INVALID_CODE',
      error: 'Classroom not found. Please check the code with your teacher.',
    });

    submitCode();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('education.student.join.invalidCode');
  });

  it('shows a visible error for a bad code, not only a toast', async () => {
    mockJoin.mockResolvedValue({
      success: false,
      code: 'INVALID_CODE',
      error: 'Classroom not found. Please check the code with your teacher.',
    });

    submitCode();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('education.student.join.invalidCode');
    });
  });

  it('lands a successful join on /en/student', async () => {
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1' });

    submitCode();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/student');
    });
  });
});
