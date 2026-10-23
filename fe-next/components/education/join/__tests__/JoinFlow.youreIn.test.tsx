import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockPush } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
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
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar-stub" /> }));

import JoinFlow from '../JoinFlow';

const K = 'education.student.join';

describe('<JoinFlow> — the moment a student is in a live game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false, profile: null });
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levi', gameCode: 'ABC123' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1', gameCode: 'ABC123' });
  });

  it('GIVEN a game join succeeds THEN the student sees their avatar, their name and to look for it on the screen', async () => {
    render(<JoinFlow initialCode="ABC123" />);
    const name = await screen.findByLabelText(`${K}.nameLabel`);
    fireEvent.change(name, { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${K}\\.flow\\.go`) }));

    const panel = await screen.findByTestId('join-success-panel');
    expect(panel).toHaveTextContent(`${K}.flow.youreIn`);
    expect(screen.getByTestId('join-waiting-name')).toHaveTextContent('Ada');
    expect(screen.getByTestId('avatar-stub')).toBeInTheDocument();
  });
});
