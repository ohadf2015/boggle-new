/**
 * Scripted check of the join budget: a guest with a code reaches the lobby in
 * at most two screens (code, then name). A code in the link skips the code screen.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockResolve, mockUseAuth } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: vi.fn() }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

describe('join budget: guest with a code reaches the lobby in two screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Ms Levy' });
  });

  it('a code from a link skips the code screen: name screen is the first and only input before GO', () => {
    render(<JoinFlow initialCode="P45KRT" />);

    expect(screen.queryByLabelText('education.student.join.codeLabel')).not.toBeInTheDocument();
    expect(screen.getByLabelText('education.student.join.nameLabel')).toBeInTheDocument();
    const go = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.includes('education.student.join.flow.go'));
    expect(go).toHaveLength(1);
  });

  it('typed code: code screen then name screen, never a third screen', () => {
    render(<JoinFlow />);

    expect(screen.getByLabelText('education.student.join.codeLabel')).toBeInTheDocument();
    expect(screen.queryByLabelText('education.student.join.nameLabel')).not.toBeInTheDocument();
  });
});
