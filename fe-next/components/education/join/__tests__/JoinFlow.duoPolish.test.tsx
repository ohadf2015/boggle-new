import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: vi.fn() }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: vi.fn() }));

import JoinFlow from '../JoinFlow';

describe('join code screen, Duolingo polish', () => {
  beforeEach(() => mockUseAuth.mockReturnValue({ user: null, loading: false }));

  it('does not repeat the sub line as a default hint under the tiles', () => {
    render(<JoinFlow />);
    expect(screen.queryByText('education.student.join.codeHint')).toBeNull();
    expect(document.getElementById('join-code-note')).toBeInTheDocument();
  });

  it('NEXT sinks on press (chunky press) and springs back on release', () => {
    render(<JoinFlow />);
    const next = screen.getAllByRole('button').find((b) => b.textContent?.includes('education.student.join.flow.next'))!;
    fireEvent.pointerDown(next, { button: 0 });
    expect(next).toHaveAttribute('data-pressed', 'true');
    fireEvent.pointerUp(next);
    expect(next).not.toHaveAttribute('data-pressed');
  });

  it('paste button uses the same chunky press', () => {
    render(<JoinFlow />);
    const paste = screen.getByRole('button', { name: 'joinView.pasteCode' });
    fireEvent.pointerDown(paste, { button: 0 });
    expect(paste).toHaveAttribute('data-pressed', 'true');
  });
});
